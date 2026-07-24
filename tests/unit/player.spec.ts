import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Player, PlaybackStatus } from '../../src/lib/features/playback/application/player.svelte';
import { audioEngine } from '../../src/lib/features/playback/infrastructure/engine.svelte';
import { db } from '../../src/lib/core/db';
import type { Track } from '../../src/lib/core/db';

// Mock the environment
vi.mock('$app/environment', () => ({
	browser: true
}));

const mockTrack: Track = {
	id: 'track-1',
	title: 'Test Track',
	audioUrl: 'http://example.com/audio.mp3',
	duration: 100,
	sourceType: 'rss',
	offlineAvailable: false
};

describe('Player State Machine', () => {
	let player: Player;

	beforeEach(() => {
		vi.clearAllMocks();
		global.window = {
			addEventListener: vi.fn(),
			document: { visibilityState: 'visible' }
		} as unknown as typeof window;
		player = new Player();
		// Mock engine methods since we are in node
		audioEngine.play = vi.fn().mockResolvedValue(undefined);
		audioEngine.pause = vi.fn();
		audioEngine.stop = vi.fn();
		audioEngine.load = vi.fn();
		audioEngine.seek = vi.fn();
		audioEngine.setSpeed = vi.fn();
	});

	it('should initialize with IDLE state', () => {
		expect(player.status).toBe(PlaybackStatus.IDLE);
		expect(player.currentTrack).toBeNull();
	});

	it('should transition to LOADING when selecting a track', async () => {
		await player.selectTrack(mockTrack);
		expect(player.status).toBe(PlaybackStatus.LOADING);
		expect(player.currentTrack).toEqual(mockTrack);
		expect(audioEngine.load).toHaveBeenCalledWith(mockTrack.audioUrl);
	});

	it('should transition to PLAYING on load success', async () => {
		await player.selectTrack(mockTrack);

		// Simulate load success
		if (audioEngine.onLoadSuccess) {
			audioEngine.onLoadSuccess();
		}

		expect(player.status).toBe(PlaybackStatus.PLAYING);
		expect(audioEngine.play).toHaveBeenCalled();
	});

	it('should transition to ERROR on load error', async () => {
		await player.selectTrack(mockTrack);

		const error = new Error('Load failed');
		if (audioEngine.onLoadError) {
			audioEngine.onLoadError(error);
		}

		expect(player.status).toBe(PlaybackStatus.ERROR);
		expect(player.error).toBe(error);
	});

	it('should pause and play correctly', async () => {
		await player.selectTrack(mockTrack);
		if (audioEngine.onLoadSuccess) audioEngine.onLoadSuccess();
		expect(player.status).toBe(PlaybackStatus.PLAYING);

		player.pause();
		expect(player.status).toBe(PlaybackStatus.PAUSED);
		expect(audioEngine.pause).toHaveBeenCalled();

		await player.play();
		expect(player.status).toBe(PlaybackStatus.PLAYING);
		expect(audioEngine.play).toHaveBeenCalled();
	});

	it('should stop and reset correctly', async () => {
		await player.selectTrack(mockTrack);
		if (audioEngine.onLoadSuccess) audioEngine.onLoadSuccess();

		player.stop();
		expect(player.status).toBe(PlaybackStatus.STOPPED);
		expect(audioEngine.stop).toHaveBeenCalled();

		player.reset();
		expect(player.status).toBe(PlaybackStatus.IDLE);
		expect(player.currentTrack).toBeNull();
	});

	it('should handle track end', async () => {
		await player.selectTrack(mockTrack);
		if (audioEngine.onLoadSuccess) audioEngine.onLoadSuccess();

		if (audioEngine.onTrackEnd) {
			audioEngine.onTrackEnd();
		}

		expect(player.status).toBe(PlaybackStatus.STOPPED);
	});

	it('should recover position on selectTrack', async () => {
		// Insert mock state
		await db.playbackState.put({
			trackId: mockTrack.id,
			position: 10,
			speed: 1.5,
			silenceSkippingEnabled: false,
			updatedAt: new Date().toISOString()
		});

		await player.selectTrack(mockTrack);

		if (audioEngine.onLoadSuccess) {
			audioEngine.onLoadSuccess();
		}

		// Rewind 3 seconds: 10 - 3 = 7
		expect(audioEngine.seek).toHaveBeenCalledWith(7);
		expect(audioEngine.setSpeed).toHaveBeenCalledWith(1.5);
	});

	it('should recover silence skipping state on selectTrack', async () => {
		await db.playbackState.put({
			trackId: mockTrack.id,
			position: 10,
			speed: 1.5,
			silenceSkippingEnabled: true,
			updatedAt: new Date().toISOString()
		});

		audioEngine.enableSilenceSkip = vi.fn();
		await player.selectTrack(mockTrack);

		expect(player.isSilenceSkipEnabled).toBe(true);
		expect(audioEngine.enableSilenceSkip).toHaveBeenCalledWith(true);
	});

	it('should toggle silence skipping', () => {
		audioEngine.enableSilenceSkip = vi.fn();

		expect(player.isSilenceSkipEnabled).toBe(false);

		player.toggleSilenceSkip();

		expect(player.isSilenceSkipEnabled).toBe(true);
		expect(audioEngine.enableSilenceSkip).toHaveBeenCalledWith(true);
	});

	it('should update silenceSkippedTime when engine reports it', () => {
		expect(player.silenceSkippedTime).toBe(0);
		if (audioEngine.onSilenceSkipped) {
			audioEngine.onSilenceSkipped(15.5);
		}
		expect(player.silenceSkippedTime).toBe(15.5);
	});
});
