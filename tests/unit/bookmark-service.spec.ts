import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '$lib/core/db';
import {
	bookmarkService,
	MAX_NOTE_LENGTH
} from '$lib/features/bookmark/infrastructure/bookmark-service';

describe('BookmarkService', () => {
	beforeEach(async () => {
		await db.open();
		await db.bookmarks.clear();
	});

	afterEach(async () => {
		await db.bookmarks.clear();
	});

	it('should create a bookmark successfully', async () => {
		const trackId = 'test-track';
		const bookmark = await bookmarkService.createBookmark(trackId, 10, 'Test note');

		expect(bookmark).toBeDefined();
		expect(bookmark.trackId).toBe(trackId);
		expect(bookmark.timestampStart).toBe(10);
		expect(bookmark.note).toBe('Test note');
		expect(bookmark.id).toBeDefined();
		expect(bookmark.orphaned).toBe(false);

		const inDb = await db.bookmarks.get(bookmark.id);
		expect(inDb).toBeDefined();
		expect(inDb?.note).toBe('Test note');
	});

	it('should reject note exceeding max length', async () => {
		const trackId = 'test-track';
		const longNote = 'a'.repeat(MAX_NOTE_LENGTH + 1);

		await expect(bookmarkService.createBookmark(trackId, 10, longNote)).rejects.toThrow(
			/exceeds maximum length/
		);
	});

	it('should deduplicate bookmarks within 1 second threshold', async () => {
		const trackId = 'test-track';
		const b1 = await bookmarkService.createBookmark(trackId, 10.5, 'First');

		// 0.5s difference -> should return b1
		const b2 = await bookmarkService.createBookmark(trackId, 11, 'Second');
		expect(b2.id).toBe(b1.id);
		expect(b2.note).toBe('First'); // Still has first note because it didn't create new

		// 1.5s difference -> should create new
		const b3 = await bookmarkService.createBookmark(trackId, 12, 'Third');
		expect(b3.id).not.toBe(b1.id);
		expect(b3.note).toBe('Third');
	});

	it('should update bookmark note', async () => {
		const trackId = 'test-track';
		const bookmark = await bookmarkService.createBookmark(trackId, 10, 'Test note');

		await bookmarkService.updateBookmarkNote(bookmark.id, 'Updated note');

		const inDb = await db.bookmarks.get(bookmark.id);
		expect(inDb?.note).toBe('Updated note');
	});

	it('should delete a bookmark', async () => {
		const trackId = 'test-track';
		const bookmark = await bookmarkService.createBookmark(trackId, 10, 'Test note');

		await bookmarkService.deleteBookmark(bookmark.id);

		const inDb = await db.bookmarks.get(bookmark.id);
		expect(inDb).toBeUndefined();
	});
});
