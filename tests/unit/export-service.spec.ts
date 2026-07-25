import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../src/lib/core/db';
import {
	exportBookmarksMarkdown,
	exportAllBookmarksMarkdown,
	copyToClipboard,
	downloadFile
} from '../../src/lib/features/export/application/export-service';

describe('ExportService', () => {
	beforeEach(async () => {
		await Promise.all([db.podcasts.clear(), db.tracks.clear(), db.bookmarks.clear()]);

		// Add mock data
		await db.podcasts.add({
			feedUrl: 'https://example.com/feed.xml',
			title: 'Test Podcast',
			description: 'A test podcast',
			author: 'Test Author',
			coverImage: '',
			lastFetched: new Date().toISOString(),
			createdAt: new Date().toISOString()
		});

		await db.tracks.add({
			id: 'track1',
			podcastFeedUrl: 'https://example.com/feed.xml',
			title: 'Episode 1',
			audioUrl: 'https://example.com/ep1.mp3',
			duration: 1200,
			sourceType: 'rss',
			offlineAvailable: false,
			lastPlayedAt: new Date().toISOString()
		});

		await db.bookmarks.add({
			id: 'bm1',
			trackId: 'track1',
			timestampStart: 60,
			note: 'Great point about testing',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			orphaned: false
		});

		await db.bookmarks.add({
			id: 'bm2',
			trackId: 'track1',
			timestampStart: 300,
			timestampEnd: 360,
			note: '', // empty note
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			orphaned: false
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('exportBookmarksMarkdown', () => {
		it('should export bookmarks for a specific track to markdown', async () => {
			const md = await exportBookmarksMarkdown('track1');

			expect(md).toContain('# Episode 1');
			expect(md).toContain('**Podcast:** Test Podcast');
			expect(md).toContain('**Author:** Test Author');
			expect(md).toContain('**Tổng Bookmark:** 2');
			expect(md).toContain('## [01:00] Bookmark #1');
			expect(md).toContain('Great point about testing');
			expect(md).toContain('## [05:00 - 06:00] Bookmark #2');
			expect(md).toContain('_(Không có ghi chú)_');
		});

		it('should throw an error if track is not found', async () => {
			await expect(exportBookmarksMarkdown('nonexistent')).rejects.toThrow('Track not found');
		});
	});

	describe('exportAllBookmarksMarkdown', () => {
		it('should export all bookmarks from all tracks', async () => {
			// Add a second track with a bookmark
			await db.tracks.add({
				id: 'track2',
				title: 'Episode 2 (Local)',
				audioUrl: 'blob:local',
				duration: 500,
				sourceType: 'local',
				offlineAvailable: true,
				lastPlayedAt: new Date().toISOString()
			});
			await db.bookmarks.add({
				id: 'bm3',
				trackId: 'track2',
				timestampStart: 120,
				note: 'Local file note',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				orphaned: false
			});

			const allMd = await exportAllBookmarksMarkdown();

			expect(allMd).toContain('# All Podcast Bookmarks');
			expect(allMd).toContain('# Episode 1');
			expect(allMd).toContain('# Episode 2 (Local)');
			expect(allMd).toContain('Local file note');
		});
	});

	describe('copyToClipboard', () => {
		it('should copy text to clipboard', async () => {
			const mockWriteText = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText: mockWriteText },
				writable: true,
				configurable: true
			});

			await copyToClipboard('Test text');
			expect(mockWriteText).toHaveBeenCalledWith('Test text');
		});

		it('should throw error if clipboard API is not available', async () => {
			Object.defineProperty(navigator, 'clipboard', {
				value: undefined,
				writable: true,
				configurable: true
			});

			await expect(copyToClipboard('Test text')).rejects.toThrow('Clipboard API is not available');
		});
	});

	describe('downloadFile', () => {
		it('should create and trigger download', () => {
			const mockCreateElement = vi.fn().mockReturnValue({ click: vi.fn() });
			const mockAppendChild = vi.fn();
			const mockRemoveChild = vi.fn();

			vi.stubGlobal('document', {
				createElement: mockCreateElement,
				body: {
					appendChild: mockAppendChild,
					removeChild: mockRemoveChild
				}
			});

			vi.stubGlobal('URL', {
				createObjectURL: vi.fn().mockReturnValue('blob:test'),
				revokeObjectURL: vi.fn()
			});

			vi.stubGlobal(
				'Blob',
				class Blob {
					constructor(content: unknown, options: unknown) {
						return { content, options };
					}
				}
			);

			downloadFile('Hello World', 'test.md', 'markdown');

			expect(mockCreateElement).toHaveBeenCalledWith('a');
			expect(mockAppendChild).toHaveBeenCalled();
			expect(mockRemoveChild).toHaveBeenCalled();
		});
	});
});
