import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SilenceSkipProcessor', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let SilenceSkipProcessor: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let processor: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let mockPort: any;

	beforeEach(() => {
		mockPort = {
			postMessage: vi.fn(),
			onmessage: null
		};

		// Mock AudioWorkletProcessor
		class AudioWorkletProcessor {
			port = mockPort;
		}

		vi.stubGlobal('AudioWorkletProcessor', AudioWorkletProcessor);
		vi.stubGlobal('sampleRate', 44100);
		vi.stubGlobal('registerProcessor', vi.fn());

		// Load the script
		const scriptPath = path.resolve(__dirname, '../../static/silence-skip-processor.js');
		const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

		SilenceSkipProcessor = eval(`
			${scriptContent};
			SilenceSkipProcessor;
		`);

		processor = new SilenceSkipProcessor({
			processorOptions: {
				amplitudeThresholdDb: -40,
				minSilenceDurationMs: 100, // smaller for tests
				crossfadeDurationMs: 10,
				bufferZoneStartSec: 0, // no buffer zone for tests
				bufferZoneEndSec: 0,
				trackDurationSec: 100
			}
		});
	});

	it('should pass through audio when disabled', () => {
		const input = [[new Float32Array([0.1, 0.2, 0.3])]];
		const output = [[new Float32Array(3)]];

		processor.process(input, output);

		expect(output[0][0]).toEqual(new Float32Array([0.1, 0.2, 0.3]));
	});

	it('should pass through audio when enabled and above threshold', () => {
		processor.port.onmessage({ data: { type: 'enable' } });

		const input = [[new Float32Array([0.5, 0.5, 0.5])]]; // Loud audio
		const output = [[new Float32Array(3)]];

		processor.process(input, output);

		expect(output[0][0]).toEqual(new Float32Array([0.5, 0.5, 0.5]));
	});

	it('should detect silence and apply crossfade', () => {
		processor.port.onmessage({ data: { type: 'enable' } });

		// Create silent frames (below -40dB threshold, RMS < 0.01)
		const frameSize = 12000; // > sampleRate / 4 (11025)
		const silentInput = [[new Float32Array(frameSize).fill(0.001)]];
		const output = [[new Float32Array(frameSize)]];

		// Process first silent frame - should trigger silence detection
		processor.process(silentInput, output);

		expect(processor.isCurrentlySilent).toBe(true);
		expect(processor.totalSkippedFrames).toBe(frameSize);
		expect(mockPort.postMessage).toHaveBeenCalledWith({
			type: 'time_saved',
			totalSeconds: frameSize / 44100
		});
	});

	it('should handle buffer zones correctly', () => {
		processor.port.onmessage({ data: { type: 'enable' } });
		processor.options.bufferZoneStartSec = 10;

		const frameSize = 4410; // 100ms
		const silentInput = [[new Float32Array(frameSize).fill(0)]];
		const output = [[new Float32Array(frameSize)]];

		// Still in start buffer zone
		processor.process(silentInput, output);

		expect(processor.isCurrentlySilent).toBe(false); // Should not detect silence
		expect(output[0][0]).toEqual(new Float32Array(frameSize).fill(0));
	});

	it('should resume normal playback after silence', () => {
		processor.port.onmessage({ data: { type: 'enable' } });

		// 1. Silent frame
		const frameSize = 4410; // 100ms
		const silentInput = [[new Float32Array(frameSize).fill(0.001)]];
		const silentOutput = [[new Float32Array(frameSize)]];
		processor.process(silentInput, silentOutput);
		expect(processor.isCurrentlySilent).toBe(true);

		// 2. Loud frame
		const loudInput = [[new Float32Array(frameSize).fill(0.5)]];
		const loudOutput = [[new Float32Array(frameSize)]];
		processor.process(loudInput, loudOutput);

		expect(processor.isCurrentlySilent).toBe(false);
	});
});
