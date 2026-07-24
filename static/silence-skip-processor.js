class SilenceSkipProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();
		this.enabled = false;
		this.options = options.processorOptions || {};
		
		// Fallbacks just in case
		this.options.amplitudeThresholdDb = this.options.amplitudeThresholdDb ?? -40;
		this.options.minSilenceDurationMs = this.options.minSilenceDurationMs ?? 300;
		this.options.crossfadeDurationMs = this.options.crossfadeDurationMs ?? 50;
		this.options.bufferZoneStartSec = this.options.bufferZoneStartSec ?? 3;
		this.options.bufferZoneEndSec = this.options.bufferZoneEndSec ?? 3;
		this.options.trackDurationSec = this.options.trackDurationSec ?? 0;

		this.crossfadeTotalFrames = Math.floor((this.options.crossfadeDurationMs / 1000) * sampleRate);

		this.silentFrameCount = 0;
		this.totalSkippedFrames = 0;
		this.lastReportedSkippedFrames = 0;
		this.isCurrentlySilent = false;
		this.crossfadeFramesRemaining = 0;
		this.crossfadeDirection = 'none';
		this.processedFrames = 0;

		this.port.onmessage = (event) => {
			if (event.data.type === 'enable') {
				this.enabled = true;
			}
			if (event.data.type === 'disable') {
				this.enabled = false;
				// Send a final update when disabled
				this.port.postMessage({
					type: 'time_saved',
					totalSeconds: this.totalSkippedFrames / sampleRate
				});
			}
			if (event.data.type === 'updateOptions') {
				Object.assign(this.options, event.data.options);
				this.crossfadeTotalFrames = Math.floor((this.options.crossfadeDurationMs / 1000) * sampleRate);
			}
			if (event.data.type === 'seek') {
				this.processedFrames = Math.floor(event.data.position * sampleRate);
			}
		};
	}

	process(inputs, outputs) {
		const input = inputs[0];
		const output = outputs[0];

		// Keep alive if no input
		if (!input || input.length === 0 || !input[0]) {
			return true; 
		}

		const frameSize = input[0].length; // Typically 128

		if (!this.enabled) {
			// Pass-through
			for (let ch = 0; ch < input.length; ch++) {
				output[ch].set(input[ch]);
			}
			this.processedFrames += frameSize;
			return true;
		}

		// Check Buffer Zone (e.g. 3s start / 3s end)
		const currentTimeSec = this.processedFrames / sampleRate;
		const endBufferStart = this.options.trackDurationSec - this.options.bufferZoneEndSec;

		if (
			currentTimeSec < this.options.bufferZoneStartSec ||
			(this.options.trackDurationSec > 0 && currentTimeSec > endBufferStart)
		) {
			// Pass-through in buffer zone
			for (let ch = 0; ch < input.length; ch++) {
				output[ch].set(input[ch]);
			}
			this.processedFrames += frameSize;
			return true;
		}

		// Calculate RMS (mono — average all channels)
		let sum = 0;
		for (let ch = 0; ch < input.length; ch++) {
			for (let i = 0; i < frameSize; i++) {
				sum += input[ch][i] * input[ch][i];
			}
		}
		const rms = Math.sqrt(sum / (frameSize * input.length));
		const dbValue = 20 * Math.log10(Math.max(rms, 1e-10));

		// Silence detection
		const isSilent = dbValue < this.options.amplitudeThresholdDb;
		const minSilenceFrames = Math.floor((this.options.minSilenceDurationMs / 1000) * sampleRate);

		if (isSilent) {
			this.silentFrameCount += frameSize;

			if (this.silentFrameCount >= minSilenceFrames) {
				// SKIP: Output silence with crossfade
				if (!this.isCurrentlySilent) {
					this.isCurrentlySilent = true;
					this.startCrossfade('out');
				}

				// Output silence (or crossfade tail)
				this.applyCrossfade(input, output);
				this.totalSkippedFrames += frameSize;

				// Report time saved to main thread (~ 4 times per second to avoid flooding)
				if (this.totalSkippedFrames - this.lastReportedSkippedFrames >= sampleRate / 4) {
					this.port.postMessage({
						type: 'time_saved',
						totalSeconds: this.totalSkippedFrames / sampleRate
					});
					this.lastReportedSkippedFrames = this.totalSkippedFrames;
				}

				this.processedFrames += frameSize;
				return true;
			}
		} else {
			if (this.isCurrentlySilent) {
				this.isCurrentlySilent = false;
				this.startCrossfade('in');
			}
			this.silentFrameCount = 0;
		}

		// Pass audio through (with potential crossfade)
		this.applyCrossfade(input, output);
		this.processedFrames += frameSize;

		return true;
	}

	startCrossfade(direction) {
		this.crossfadeDirection = direction;
		this.crossfadeFramesRemaining = this.crossfadeTotalFrames;
	}

	applyCrossfade(input, output) {
		const frameLength = input[0].length;
		for (let i = 0; i < frameLength; i++) {
			let gain = 1.0;

			if (this.crossfadeFramesRemaining > 0) {
				const progress = 1 - this.crossfadeFramesRemaining / this.crossfadeTotalFrames;
				gain = this.crossfadeDirection === 'out'
					? 1 - progress // Fade out: 1 → 0
					: progress;    // Fade in:  0 → 1

				this.crossfadeFramesRemaining--;
				if (this.crossfadeFramesRemaining === 0) {
					this.crossfadeDirection = 'none';
				}
			} else if (this.isCurrentlySilent) {
				gain = 0; // Fully muted during skip
			}

			for (let ch = 0; ch < input.length; ch++) {
				output[ch][i] = input[ch][i] * gain;
			}
		}
	}
}

registerProcessor('silence-skip-processor', SilenceSkipProcessor);
