import { browser } from '$app/environment';

export class AudioEngine {
	private audioContext: AudioContext | null = null;
	private audioElement: HTMLAudioElement | null = null;
	private sourceNode: MediaElementAudioSourceNode | null = null;
	private gainNode: GainNode | null = null;
	private silenceSkipper: AudioWorkletNode | null = null;
	private initPromise: Promise<void> | null = null;
	private iosDest: MediaStreamAudioDestinationNode | null = null;
	private iosAudio: HTMLAudioElement | null = null;

	currentPosition = $state(0);
	duration = $state(0);
	speed = $state(1.0);
	isFallbackMode = $state(false);

	onLoadSuccess: (() => void) | null = null;
	onLoadError: ((err: Error) => void) | null = null;
	onTrackEnd: (() => void) | null = null;
	onError: ((err: Error) => void) | null = null;
	onSilenceSkipped: ((timeSaved: number) => void) | null = null;

	defaultSilenceSkipOptions = {
		amplitudeThresholdDb: -40,
		minSilenceDurationMs: 300
	};

	constructor() {
		// Initialization is now deferred to load() to ensure a clean slate per track
	}

	private createAudioElement() {
		if (!browser || typeof Audio === 'undefined') return;

		if (this.audioElement) {
			this.audioElement.pause();
			// Chú ý: TUYỆT ĐỐI không gọi `removeAttribute('src')` hay `load()` ở đây.
			// Việc đó sẽ trigger event `error` (MEDIA_ERR_SRC_NOT_SUPPORTED) ngay lập tức.
			// Do event listener cũ vẫn còn, nó sẽ gọi `this.onLoadError` của Engine,
			// làm Player rơi vào trạng thái ERROR và kẹt luôn.
			// Chỉ cần pause() là đủ, Garbage Collector sẽ lo phần còn lại.
		}

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
			// Nếu CORS đang bật và load thất bại → thử lại không CORS
			if (this.corsMode && this.duration === 0) {
				this.reloadWithoutCors();
				return;
			}

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
						amplitudeThresholdDb: this.defaultSilenceSkipOptions.amplitudeThresholdDb,
						minSilenceDurationMs: this.defaultSilenceSkipOptions.minSilenceDurationMs,
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

			this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement!);
			this.gainNode = this.audioContext.createGain();

			if (this.silenceSkipper) {
				this.sourceNode.connect(this.silenceSkipper);
				this.silenceSkipper.connect(this.gainNode);
			} else {
				this.sourceNode.connect(this.gainNode);
			}

			this.gainNode.connect(this.audioContext.destination);

			// iOS background keep-alive trick
			if (browser && navigator.userAgent.match(/(iPad|iPhone|iPod)/i)) {
				this.iosDest = this.audioContext.createMediaStreamDestination();
				this.gainNode.connect(this.iosDest);
				this.iosAudio = new Audio();
				this.iosAudio.srcObject = this.iosDest.stream;
				this.iosAudio.play().catch((e) => console.warn('Failed to play iosAudio:', e));
			}
		})();

		return this.initPromise;
	}

	private corsMode: boolean = true; // Track nếu CORS đang bật

	load(url: string) {
		if (!browser) return;

		// Reset Web Audio context to avoid reusing tainted source nodes
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		this.initPromise = null;
		this.silenceSkipper = null;
		this.sourceNode = null;
		this.gainNode = null;

		if (this.iosAudio) {
			this.iosAudio.pause();
			this.iosAudio.srcObject = null;
			this.iosAudio = null;
		}
		this.iosDest = null;
		this.isFallbackMode = false;

		this.createAudioElement();

		if (!this.audioElement) return;
		this.duration = 0;
		this.currentPosition = 0;
		this.corsMode = true;
		this.audioElement.crossOrigin = 'anonymous';
		this.audioElement.src = url;
		this.audioElement.load();
	}

	/**
	 * Retry load không dùng CORS — fallback khi server không hỗ trợ
	 * Access-Control-Allow-Origin. Sẽ mất tính năng Silence Skip
	 * (Web Audio API cần CORS), nhưng audio vẫn phát bình thường.
	 */
	private reloadWithoutCors() {
		if (!this.audioElement || !this.corsMode) return;
		console.warn('CORS failed for audio URL, retrying without crossOrigin (Silence Skip disabled)');
		this.corsMode = false;
		const currentSrc = this.audioElement.src;

		// Tạo lại một Audio Element hoàn toàn mới để đảm bảo trình duyệt
		// không bị dính (cache) trạng thái crossOrigin cũ.
		this.createAudioElement();

		if (!this.audioElement) return;
		// Tuyệt đối không set crossOrigin ở đây để phát bình thường
		this.audioElement.src = currentSrc;
		this.audioElement.load();
	}

	async play() {
		if (!this.audioElement) return;
		// Chỉ khởi tạo Web Audio API khi CORS hoạt động.
		// Nếu CORS bị tắt (fallback), phát trực tiếp qua HTML Audio element.
		if (this.corsMode) {
			await this.initWebAudio();
			if (this.audioContext?.state === 'suspended') {
				await this.audioContext.resume();
			}
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
			// Không gọi this.audioElement.src = '' để tránh error "Empty src attribute"
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
		if (options.amplitudeThresholdDb !== undefined) {
			this.defaultSilenceSkipOptions.amplitudeThresholdDb = options.amplitudeThresholdDb;
		}
		if (options.minSilenceDurationMs !== undefined) {
			this.defaultSilenceSkipOptions.minSilenceDurationMs = options.minSilenceDurationMs;
		}
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
			// Không gọi this.audioElement.src = '' để tránh error "Empty src attribute"
			this.audioElement.remove();
		}
		if (this.audioContext) {
			this.audioContext.close();
		}
		if (this.iosAudio) {
			this.iosAudio.pause();
			this.iosAudio.srcObject = null;
			this.iosAudio.remove();
		}
		this.initPromise = null;
		this.silenceSkipper = null;
	}

	getAudioContextState(): AudioContextState | undefined {
		return this.audioContext?.state;
	}

	async tryResumeContext(): Promise<void> {
		if (this.audioContext && this.audioContext.state === 'suspended') {
			await this.audioContext.resume();
		}
	}

	switchToFallback() {
		if (this.isFallbackMode) return;
		console.warn('Switching to HTML5 fallback mode due to AudioContext suspension');
		this.isFallbackMode = true;

		// Similar to reloadWithoutCors but we just drop the context
		const currentPos = this.currentPosition;
		this.reloadWithoutCors();
		if (this.audioElement) {
			this.audioElement.currentTime = currentPos;
			this.audioElement.play().catch((e) => console.error('Fallback play failed:', e));
		}
	}

	restoreWebAudio(originalUrl: string) {
		if (!this.isFallbackMode) return;
		console.log('Restoring Web Audio from fallback mode');
		this.isFallbackMode = false;

		const currentPos = this.currentPosition;
		const currentSpeed = this.speed;

		this.load(originalUrl);
		this.seek(currentPos);
		this.setSpeed(currentSpeed);
		this.play().catch((e) => console.error('Restore play failed:', e));
	}
}

export const audioEngine = new AudioEngine();
