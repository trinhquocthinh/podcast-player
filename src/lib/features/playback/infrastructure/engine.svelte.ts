import { browser } from '$app/environment';

export class AudioEngine {
	private audioContext: AudioContext | null = null;
	private audioElement: HTMLAudioElement | null = null;
	private sourceNode: MediaElementAudioSourceNode | null = null;
	private gainNode: GainNode | null = null;
	private silenceSkipper: AudioWorkletNode | null = null;
	private initPromise: Promise<void> | null = null;

	currentPosition = $state(0);
	duration = $state(0);
	speed = $state(1.0);

	onLoadSuccess: (() => void) | null = null;
	onLoadError: ((err: Error) => void) | null = null;
	onTrackEnd: (() => void) | null = null;
	onError: ((err: Error) => void) | null = null;
	onSilenceSkipped: ((timeSaved: number) => void) | null = null;

	constructor() {
		if (!browser || typeof Audio === 'undefined') return;
		this.audioElement = new Audio();

		this.audioElement.addEventListener('timeupdate', () => {
			if (this.audioElement) {
				this.currentPosition = this.audioElement.currentTime;
			}
		});

		this.audioElement.addEventListener('loadedmetadata', () => {
			if (this.audioElement) {
				this.duration = this.audioElement.duration;
				if (this.silenceSkipper) {
					this.silenceSkipper.port.postMessage({
						type: 'updateOptions',
						options: { trackDurationSec: this.duration }
					});
				}
			}
			this.onLoadSuccess?.();
		});

		this.audioElement.addEventListener('ended', () => {
			this.onTrackEnd?.();
		});

		this.audioElement.addEventListener('error', () => {
			const err = new Error(this.audioElement?.error?.message || 'Audio playback error');
			if (this.duration === 0) {
				this.onLoadError?.(err);
			} else {
				this.onError?.(err);
			}
		});
	}

	private async initWebAudio() {
		if (this.audioContext || !this.audioElement) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			this.audioContext = new AudioContextClass();

			try {
				await this.audioContext.audioWorklet.addModule('/silence-skip-processor.js');

				this.silenceSkipper = new AudioWorkletNode(this.audioContext, 'silence-skip-processor', {
					processorOptions: {
						amplitudeThresholdDb: -40,
						minSilenceDurationMs: 300,
						crossfadeDurationMs: 50,
						bufferZoneStartSec: 3,
						bufferZoneEndSec: 3,
						trackDurationSec: this.duration
					}
				});

				this.silenceSkipper.port.onmessage = (event) => {
					if (event.data.type === 'time_saved') {
						this.onSilenceSkipped?.(event.data.totalSeconds);
					}
				};
			} catch (error) {
				console.warn(
					'Failed to load SilenceSkipProcessor AudioWorklet, falling back to standard playback',
					error
				);
			}

			this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
			this.gainNode = this.audioContext.createGain();

			if (this.silenceSkipper) {
				this.sourceNode.connect(this.silenceSkipper);
				this.silenceSkipper.connect(this.gainNode);
			} else {
				this.sourceNode.connect(this.gainNode);
			}

			this.gainNode.connect(this.audioContext.destination);
		})();

		return this.initPromise;
	}

	load(url: string) {
		if (!this.audioElement) return;
		this.duration = 0;
		this.currentPosition = 0;
		this.audioElement.src = url;
		this.audioElement.load();
	}

	async play() {
		if (!this.audioElement) return;
		await this.initWebAudio();
		if (this.audioContext?.state === 'suspended') {
			await this.audioContext.resume();
		}
		await this.audioElement.play();
	}

	pause() {
		this.audioElement?.pause();
	}

	stop() {
		if (this.audioElement) {
			this.audioElement.pause();
			this.seek(0);
			this.audioElement.src = '';
		}
	}

	seek(position: number) {
		if (!this.audioElement) return;

		if (this.duration > 0 && position >= this.duration) {
			const clamped = this.duration;
			this.audioElement.currentTime = clamped;
			this.currentPosition = clamped;
			this.onTrackEnd?.();
			return;
		}

		const clamped = Math.max(0, Math.min(position, this.duration || Infinity));
		this.audioElement.currentTime = clamped;
		this.currentPosition = clamped;

		if (this.silenceSkipper) {
			this.silenceSkipper.port.postMessage({
				type: 'seek',
				position: clamped
			});
		}
	}

	setSpeed(newSpeed: number) {
		if (!this.audioElement) return;
		// Step 0.1, max 3.0, min 0.5
		const clamped = Math.max(0.5, Math.min(newSpeed, 3.0));
		this.audioElement.playbackRate = clamped;
		this.speed = clamped;
	}

	enableSilenceSkip(enabled: boolean) {
		if (this.silenceSkipper) {
			this.silenceSkipper.port.postMessage({ type: enabled ? 'enable' : 'disable' });
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	updateSilenceSkipOptions(options: any) {
		if (this.silenceSkipper) {
			this.silenceSkipper.port.postMessage({ type: 'updateOptions', options });
		}
	}

	getAudioElement(): HTMLAudioElement | null {
		return this.audioElement;
	}

	destroy() {
		if (this.audioElement) {
			this.audioElement.pause();
			this.audioElement.src = '';
			this.audioElement.remove();
		}
		if (this.audioContext) {
			this.audioContext.close();
		}
		this.initPromise = null;
		this.silenceSkipper = null;
	}
}

export const audioEngine = new AudioEngine();
