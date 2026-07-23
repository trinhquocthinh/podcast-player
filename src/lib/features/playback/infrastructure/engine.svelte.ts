import { browser } from '$app/environment';

export class AudioEngine {
	private audioContext: AudioContext | null = null;
	private audioElement: HTMLAudioElement | null = null;
	private sourceNode: MediaElementAudioSourceNode | null = null;
	private gainNode: GainNode | null = null;

	currentPosition = $state(0);
	duration = $state(0);
	speed = $state(1.0);

	onLoadSuccess: (() => void) | null = null;
	onLoadError: ((err: Error) => void) | null = null;
	onTrackEnd: (() => void) | null = null;
	onError: ((err: Error) => void) | null = null;

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

	private initWebAudio() {
		if (this.audioContext || !this.audioElement) return;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
		this.audioContext = new AudioContextClass();
		this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
		this.gainNode = this.audioContext.createGain();

		this.sourceNode.connect(this.gainNode);
		this.gainNode.connect(this.audioContext.destination);
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
		this.initWebAudio();
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
	}

	setSpeed(newSpeed: number) {
		if (!this.audioElement) return;
		// Step 0.1, max 3.0, min 0.5
		const clamped = Math.max(0.5, Math.min(newSpeed, 3.0));
		this.audioElement.playbackRate = clamped;
		this.speed = clamped;
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
	}
}

export const audioEngine = new AudioEngine();
