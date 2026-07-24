import { v4 as uuidv4 } from 'uuid';
import { db, type Bookmark } from '$lib/core/db';
import { liveQuery } from 'dexie';

export const MAX_NOTE_LENGTH = 5000;
export const DEDUP_THRESHOLD_SEC = 1;

export class BookmarkService {
	/**
	 * Creates a new bookmark or returns an existing one if within the deduplication threshold (1 second).
	 * BR-BM-001, BR-BM-007
	 */
	async createBookmark(
		trackId: string,
		timestampStart: number,
		note: string = ''
	): Promise<Bookmark> {
		if (note.length > MAX_NOTE_LENGTH) {
			throw new Error(`Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters.`);
		}

		if (timestampStart < 0) {
			throw new Error('timestampStart must be non-negative.');
		}

		// Deduplication check (BR-BM-007)
		const existingBookmarks = await db.bookmarks.where({ trackId }).toArray();

		const existing = existingBookmarks.find(
			(b) => Math.abs(b.timestampStart - timestampStart) <= DEDUP_THRESHOLD_SEC
		);

		if (existing) {
			return existing;
		}

		const now = new Date().toISOString();
		const bookmark: Bookmark = {
			id: uuidv4(),
			trackId,
			timestampStart,
			note,
			createdAt: now,
			updatedAt: now,
			orphaned: false
		};

		await db.bookmarks.add(bookmark);
		return bookmark;
	}

	/**
	 * Updates the note of an existing bookmark.
	 * BR-BM-004
	 */
	async updateBookmarkNote(id: string, note: string): Promise<void> {
		if (note.length > MAX_NOTE_LENGTH) {
			throw new Error(`Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters.`);
		}

		const count = await db.bookmarks.where({ id }).modify({
			note,
			updatedAt: new Date().toISOString()
		});

		if (count === 0) {
			throw new Error(`Bookmark with id ${id} not found.`);
		}
	}

	/**
	 * Deletes a bookmark by ID.
	 * BR-BM-004
	 */
	async deleteBookmark(id: string): Promise<void> {
		await db.bookmarks.delete(id);
	}

	/**
	 * Returns an observable of bookmarks for a specific track, sorted by timestampStart.
	 */
	getBookmarksByTrack(trackId: string) {
		return liveQuery(() => db.bookmarks.where({ trackId }).sortBy('timestampStart'));
	}
}

export const bookmarkService = new BookmarkService();
