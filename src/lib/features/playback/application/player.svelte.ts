import { audioEngine } from '../infrastructure/engine.svelte';
import { db, type Track, type PlaybackState } from '$lib/core/db';
import { browser } from '$app/environment';
import { MediaSessionService } from '../infrastructure/media-session';
import { toastState } from '$lib/core/ui/toastState.svelte';
export enum PlaybackStatus {
	IDLE = 'IDLE',
	LOADING = 'LOADING',
	PLAYING = 'PLAYING',
	PAUSED = 'PAUSED',
	STOPPED = 'STOPPED',
	ERROR = 'ERROR'
}

export class Player {
	currentTrack = $state<Track | null>(null);
	status = $state<PlaybackStatus>(PlaybackStatus.IDLE);
	error = $state<Error | null>(null);
	isSilenceSkipEnabled = $state(false);
	silenceSkippedTime = $state(0);

	private saveInterval: ReturnType<typeof setInterval> | null = null;
	private pendingStartPos: number = 0;
	private pendingSpeed: number = 1.0;
	private currentBlobUrl: string | null = null; // Blob URL tạo on-the-fly, cần revoke khi cleanup
	private mediaSessionService: MediaSessionService | null = null;

	constructor() {
		if (!browser || typeof window === 'undefined') return;

		this.mediaSessionService = new MediaSessionService(
			() => this.play(),
			() => this.pause(),
			(time) => this.seek(time),
			() => this.seekBackward(),
			() => this.seekForward()
		);

		// Bind engine events
		audioEngine.onLoadSuccess = () => {
			if (this.status === PlaybackStatus.LOADING) {
				if (this.currentTrack && this.currentTrack.duration === 0 && audioEngine.duration > 0) {
					const newDuration = audioEngine.duration;
					this.currentTrack.duration = newDuration;
					db.tracks.update(this.currentTrack.id, { duration: newDuration }).catch((err) => {
						console.error('Failed to update track duration:', err);
					});
				}

				if (this.pendingStartPos > 0) {
					audioEngine.seek(this.pendingStartPos);
					this.pendingStartPos = 0;
				}
				if (this.pendingSpeed !== 1.0) {
					audioEngine.setSpeed(this.pendingSpeed);
					this.pendingSpeed = 1.0;
				}

				this.status = PlaybackStatus.PLAYING;
				audioEngine.play().catch((err) => {
					this.status = PlaybackStatus.ERROR;
					this.error = err;
				});
				this.startPeriodicSave();

				if (this.currentTrack) {
					let artworkUrl = undefined;
					if (this.currentTrack.coverBlob) {
						artworkUrl = URL.createObjectURL(this.currentTrack.coverBlob);
					}
					this.mediaSessionService?.updateMetadata(this.currentTrack, artworkUrl);
				}
				this.updateMediaSessionPosition();
			}
		};

		audioEngine.onLoadError = (err) => {
			if (this.status === PlaybackStatus.LOADING) {
				this.status = PlaybackStatus.ERROR;
				this.error = err;
			}
		};

		audioEngine.onTrackEnd = () => {
			if (this.status === PlaybackStatus.PLAYING || this.status === PlaybackStatus.PAUSED) {
				this.stop();
			}
		};

		audioEngine.onError = (err) => {
			if (this.status === PlaybackStatus.PLAYING || this.status === PlaybackStatus.LOADING) {
				if (this.status === PlaybackStatus.PLAYING) {
					this.savePosition();
					this.stopPeriodicSave();
				}
				this.status = PlaybackStatus.ERROR;
				this.error = err;
			}
		};

		audioEngine.onSilenceSkipped = (timeSaved: number) => {
			this.silenceSkippedTime = timeSaved;
		};

		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				if (this.status === PlaybackStatus.PLAYING) {
					this.savePosition();
				}

				// iOS Fallback trigger check
				const audioState = audioEngine.getAudioContextState();
				if (
					(audioState === 'suspended' || audioState === 'interrupted') &&
					this.status === PlaybackStatus.PLAYING
				) {
					audioEngine.tryResumeContext().catch(() => {
						audioEngine.switchToFallback();
						toastState.add(
							'warning',
							'Silence Skipping tạm tắt do giới hạn thiết bị. Audio vẫn tiếp tục phát.',
							5000
						);
					});
				}
			} else if (document.visibilityState === 'visible') {
				if (audioEngine.isFallbackMode && this.currentTrack) {
					// Prepare URL
					let playableUrl = this.currentTrack.audioUrl;
					if (this.currentBlobUrl) {
						playableUrl = this.currentBlobUrl;
					}
					audioEngine.restoreWebAudio(playableUrl);

					toastState.add('success', 'Silence Skipping restored', 3000);
				}
			}
		});

		window.addEventListener('beforeunload', () => {
			if (this.status === PlaybackStatus.PLAYING || this.status === PlaybackStatus.PAUSED) {
				this.savePosition();
			}
		});
	}

	async selectTrack(track: Track) {
		if (
			this.currentTrack &&
			this.status !== PlaybackStatus.STOPPED &&
			this.status !== PlaybackStatus.IDLE
		) {
			this.stop(); // auto STOPPED old track before LOADING new track (BR-PB-002)
		}

		this.currentTrack = track;
		this.status = PlaybackStatus.LOADING;
		this.error = null;

		// Recover position
		try {
			const state = await db.playbackState.get(track.id);
			if (state && state.position > 0) {
				this.pendingStartPos = Math.max(0, state.position - 3); // Rewind 3s
			} else {
				this.pendingStartPos = 0;
			}
			if (state && state.speed) {
				this.pendingSpeed = state.speed;
			} else {
				this.pendingSpeed = 1.0;
			}
			if (state && state.silenceSkippingEnabled !== undefined) {
				this.isSilenceSkipEnabled = state.silenceSkippingEnabled;
			} else {
				this.isSilenceSkipEnabled = false;
			}
		} catch (e) {
			console.error('Failed to recover playback state:', e);
			this.pendingStartPos = 0;
			this.pendingSpeed = 1.0;
			this.isSilenceSkipEnabled = false;
		}

		let playableUrl = track.audioUrl;
		if (track.audioBlob) {
			this.revokeCurrentBlobUrl(); // Revoke URL cũ tránh memory leak
			playableUrl = URL.createObjectURL(track.audioBlob);
			this.currentBlobUrl = playableUrl;
		}

		audioEngine.load(playableUrl);
		audioEngine.enableSilenceSkip(this.isSilenceSkipEnabled);
		this.silenceSkippedTime = 0;
	}

	async play() {
		if (this.status === PlaybackStatus.PAUSED || this.status === PlaybackStatus.STOPPED) {
			this.status = PlaybackStatus.PLAYING;
			this.startPeriodicSave();
			await audioEngine.play();
			this.updateMediaSessionPosition();
		}
	}

	pause() {
		if (this.status === PlaybackStatus.PLAYING) {
			this.status = PlaybackStatus.PAUSED;
			audioEngine.pause();
			this.stopPeriodicSave();
			this.savePosition();
			this.updateMediaSessionPosition();
		}
	}

	stop() {
		if (
			this.status === PlaybackStatus.PLAYING ||
			this.status === PlaybackStatus.PAUSED ||
			this.status === PlaybackStatus.LOADING
		) {
			this.savePosition();
			audioEngine.stop();
			this.stopPeriodicSave();
			this.revokeCurrentBlobUrl(); // Giải phóng blob URL tránh memory leak
			this.status = PlaybackStatus.STOPPED;
		}
	}

	reset() {
		if (this.status === PlaybackStatus.STOPPED || this.status === PlaybackStatus.ERROR) {
			this.currentTrack = null;
			this.status = PlaybackStatus.IDLE;
			this.error = null;
		}
	}

	retry() {
		if (this.status === PlaybackStatus.ERROR && this.currentTrack) {
			this.selectTrack(this.currentTrack);
		}
	}

	dismissError() {
		if (this.status === PlaybackStatus.ERROR) {
			this.reset();
		}
	}

	/**
	 * Revoke blob URL hiện tại để tránh memory leak.
	 * Phải gọi trước khi tạo blob URL mới hoặc khi stop/destroy.
	 */
	private revokeCurrentBlobUrl() {
		if (this.currentBlobUrl) {
			URL.revokeObjectURL(this.currentBlobUrl);
			this.currentBlobUrl = null;
		}
	}

	toggleSilenceSkip() {
		this.isSilenceSkipEnabled = !this.isSilenceSkipEnabled;
		audioEngine.enableSilenceSkip(this.isSilenceSkipEnabled);
		this.savePosition();
	}

	seek(time: number) {
		audioEngine.seek(time);
		this.savePosition();
		this.updateMediaSessionPosition();
	}

	seekBackward() {
		this.seek(Math.max(0, audioEngine.currentPosition - 15));
	}

	seekForward() {
		this.seek(Math.min(audioEngine.duration, audioEngine.currentPosition + 30));
	}

	private updateMediaSessionPosition() {
		if (this.currentTrack && this.mediaSessionService) {
			this.mediaSessionService.updatePositionState(
				audioEngine.currentPosition,
				audioEngine.duration,
				audioEngine.speed
			);
		}
	}

	private startPeriodicSave() {
		if (this.saveInterval) clearInterval(this.saveInterval);
		this.saveInterval = setInterval(() => {
			this.savePosition();
		}, 5000);
	}

	private stopPeriodicSave() {
		if (this.saveInterval) {
			clearInterval(this.saveInterval);
			this.saveInterval = null;
		}
	}

	private async savePosition() {
		if (!this.currentTrack) return;
		const state: PlaybackState = {
			trackId: this.currentTrack.id,
			position: audioEngine.currentPosition,
			speed: audioEngine.speed,
			silenceSkippingEnabled: this.isSilenceSkipEnabled,
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			updatedAt: new Date().toISOString()
		};
		try {
			await db.playbackState.put(state);
			this.updateMediaSessionPosition(); // Ensure MediaSession is periodically synced
		} catch (err) {
			console.error('Failed to save playback state', err);
		}
	}
}

export const player = new Player();
