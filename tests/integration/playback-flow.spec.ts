import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../src/lib/core/db';
import { AudioEngine } from '../../src/lib/features/playback/infrastructure/engine.svelte';
import { BookmarkService } from '../../src/lib/features/bookmark/infrastructure/bookmark-service';
import { exportBookmarksMarkdown } from '../../src/lib/features/export/application/export-service';

// Mock audio API
class MockAudioContext {
	state = 'running';
	resume = vi.fn().mockResolvedValue(undefined);
	close = vi.fn();
	createMediaElementSource = vi.fn().mockReturnValue({ connect: vi.fn() });
	createGain = vi.fn().mockReturnValue({ connect: vi.fn() });
	destination = {};
	audioWorklet = {
		addModule: vi.fn().mockResolvedValue(undefined)
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).AudioWorkletNode = class {
	port = { postMessage: vi.fn(), onmessage: null };
	connect = vi.fn();
	disconnect = vi.fn();
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).window = global;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global.window as any).AudioContext = MockAudioContext;

vi.mock('$app/environment', () => ({
	browser: true
}));

describe('Playback -> Bookmark -> Export Flow', () => {
	beforeEach(async () => {
		await Promise.all([db.podcasts.clear(), db.tracks.clear(), db.bookmarks.clear()]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should play, bookmark, and export', async () => {
		// 1. Setup Data
		await db.podcasts.add({
			feedUrl: 'https://test.com/feed',
			title: 'Flow Podcast',
			author: 'Tester',
			description: '',
			imageUrl: '',
			lastUpdated: Date.now()
		});
		await db.tracks.add({
			id: 'track-flow',
			podcastFeedUrl: 'https://test.com/feed',
			title: 'Flow Episode',
			url: 'blob:test',
			duration: 1000,
			position: 0,
			lastPlayed: Date.now()
		});

		class MockAudio {
			currentTime = 0;
			duration = 1000;
			playbackRate = 1;
			src = '';
			play = vi.fn().mockResolvedValue(undefined);
			pause = vi.fn();
			load = vi.fn();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
			listeners: Record<string, Function[]> = {};
			// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
			addEventListener(event: string, cb: Function) {
				if (!this.listeners[event]) this.listeners[event] = [];
				this.listeners[event].push(cb);
			}
			removeEventListener() {}
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		global.Audio = MockAudio as any;

		// 2. Playback
		const engine = new AudioEngine();
		engine.load('blob:test');

		expect(engine.duration).toBe(0); // Before metadata loads

		// Simulate playing
		engine.currentPosition = 120;
		await engine.play();

		// 3. Bookmark
		const bookmarkService = new BookmarkService();
		await bookmarkService.createBookmark('track-flow', 120, 'Interesting point');
		const savedBookmarks = await db.bookmarks.toArray();
		expect(savedBookmarks.length).toBe(1);
		expect(savedBookmarks[0].timestampStart).toBe(120);

		// 4. Export
		const exportedMd = await exportBookmarksMarkdown('track-flow');
		expect(exportedMd).toContain('# Flow Episode');
		expect(exportedMd).toContain('Interesting point');
		expect(exportedMd).toContain('[02:00]');
	});
});
