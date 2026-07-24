import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEngine } from '../../src/lib/features/playback/infrastructure/engine.svelte';

// Mock the environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// Mock Audio Context and HTMLAudioElement
class MockAudio {
	currentTime = 0;
	duration = 100;
	playbackRate = 1;
	src = '';

	listeners: Record<string, Array<() => void>> = {};

	addEventListener(event: string, cb: () => void) {
		if (!this.listeners[event]) this.listeners[event] = [];
		this.listeners[event].push(cb);
	}

	load = vi.fn();
	play = vi.fn().mockResolvedValue(undefined);
	pause = vi.fn();
	remove = vi.fn();

	// simulate events
	trigger(event: string) {
		if (this.listeners[event]) {
			this.listeners[event].forEach((cb) => cb());
		}
	}
}

class MockAudioContext {
	state = 'running';
	resume = vi.fn().mockResolvedValue(undefined);
	close = vi.fn();
	createMediaElementSource = vi.fn().mockReturnValue({ connect: vi.fn() });
	createGain = vi.fn().mockReturnValue({ connect: vi.fn() });
	destination = {};
}

describe('AudioEngine', () => {
	let engine: AudioEngine;

	beforeEach(() => {
		vi.clearAllMocks();
		global.Audio = MockAudio as unknown as typeof Audio;
		global.window = { AudioContext: MockAudioContext } as unknown as typeof window;

		engine = new AudioEngine();
		// AudioElement is now created in load()
		engine.load('mock');
	});

	it('should initialize and listen to events', () => {
		expect(engine.currentPosition).toBe(0);
		expect(engine.duration).toBe(0);
		expect(engine.speed).toBe(1.0);
	});

	it('should load url and reset state', () => {
		engine.currentPosition = 50;
		engine.duration = 100;

		engine.load('http://example.com/audio.mp3');

		expect(engine.currentPosition).toBe(0);
		expect(engine.duration).toBe(0);
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		expect(audioEl.src).toBe('http://example.com/audio.mp3');
		expect(audioEl.load).toHaveBeenCalled();
	});

	it('should handle metadata load', () => {
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		audioEl.duration = 120;

		let loaded = false;
		engine.onLoadSuccess = () => {
			loaded = true;
		};

		audioEl.trigger('loadedmetadata');

		expect(engine.duration).toBe(120);
		expect(loaded).toBe(true);
	});

	it('should play audio', async () => {
		await engine.play();
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		expect(audioEl.play).toHaveBeenCalled();
	});

	it('should pause audio', () => {
		engine.pause();
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		expect(audioEl.pause).toHaveBeenCalled();
	});

	it('should stop audio', () => {
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		audioEl.duration = 100;
		engine.duration = 100;
		engine.currentPosition = 50;

		engine.stop();

		expect(audioEl.pause).toHaveBeenCalled();
		expect(engine.currentPosition).toBe(0); // seek(0)
	});

	it('should clamp seek position and handle track end', () => {
		const audioEl = engine.getAudioElement() as unknown as MockAudio;
		engine.duration = 100;

		let trackEnded = false;
		engine.onTrackEnd = () => {
			trackEnded = true;
		};

		engine.seek(150);
		expect(engine.currentPosition).toBe(100);
		expect(audioEl.currentTime).toBe(100);
		expect(trackEnded).toBe(true);

		engine.seek(-10);
		expect(engine.currentPosition).toBe(0);
		expect(audioEl.currentTime).toBe(0);

		engine.seek(50);
		expect(engine.currentPosition).toBe(50);
		expect(audioEl.currentTime).toBe(50);
	});

	it('should clamp playback speed', () => {
		const audioEl = engine.getAudioElement() as unknown as MockAudio;

		engine.setSpeed(0.1);
		expect(engine.speed).toBe(0.5);
		expect(audioEl.playbackRate).toBe(0.5);

		engine.setSpeed(4.0);
		expect(engine.speed).toBe(3.0);
		expect(audioEl.playbackRate).toBe(3.0);

		engine.setSpeed(1.5);
		expect(engine.speed).toBe(1.5);
		expect(audioEl.playbackRate).toBe(1.5);
	});
});
