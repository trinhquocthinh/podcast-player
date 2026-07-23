import { audioEngine } from '../infrastructure/engine.svelte';
import { db, type Track, type PlaybackState } from '$lib/core/db';
import { browser } from '$app/environment';

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

	private saveInterval: ReturnType<typeof setInterval> | null = null;
	private pendingStartPos: number = 0;
	private pendingSpeed: number = 1.0;

	constructor() {
		if (!browser || typeof window === 'undefined') return;

		// Bind engine events
		audioEngine.onLoadSuccess = () => {
			if (this.status === PlaybackStatus.LOADING) {
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
				// TODO: Register MediaSession (Phase 6)
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

		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden' && this.status === PlaybackStatus.PLAYING) {
				this.savePosition();
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
		} catch (e) {
			console.error('Failed to recover playback state:', e);
			this.pendingStartPos = 0;
			this.pendingSpeed = 1.0;
		}

		audioEngine.load(track.audioUrl);
	}

	async play() {
		if (this.status === PlaybackStatus.PAUSED || this.status === PlaybackStatus.STOPPED) {
			this.status = PlaybackStatus.PLAYING;
			this.startPeriodicSave();
			await audioEngine.play();
		}
	}

	pause() {
		if (this.status === PlaybackStatus.PLAYING) {
			this.status = PlaybackStatus.PAUSED;
			audioEngine.pause();
			this.stopPeriodicSave();
			this.savePosition();
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
			silenceSkippingEnabled: false,
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			updatedAt: new Date().toISOString()
		};
		try {
			await db.playbackState.put(state);
		} catch (err) {
			console.error('Failed to save playback state', err);
		}
	}
}

export const player = new Player();
