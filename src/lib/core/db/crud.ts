import { db, type Podcast, type Track, type Bookmark } from './index';

export const dbOps = {
	// --- Podcast Ops ---
	async savePodcastWithTracks(podcast: Podcast, tracks: Track[]) {
		return db.transaction('rw', [db.podcasts, db.tracks], async () => {
			await db.podcasts.put(podcast);
			await db.tracks.bulkPut(tracks);
		});
	},

	async deletePodcast(feedUrl: string) {
		return db.transaction('rw', [db.podcasts, db.tracks], async () => {
			await db.podcasts.delete(feedUrl);
			// Cascading delete tracks
			const trackIds = await db.tracks.where('podcastFeedUrl').equals(feedUrl).primaryKeys();
			await db.tracks.bulkDelete(trackIds);
		});
	},

	// --- Bookmark Ops ---
	async addBookmark(bookmark: Bookmark) {
		return db.transaction('rw', [db.bookmarks], async () => {
			await db.bookmarks.add(bookmark);
		});
	},

	async updateBookmarkNote(id: string, note: string) {
		return db.transaction('rw', [db.bookmarks], async () => {
			await db.bookmarks.update(id, {
				note,
				updatedAt: new Date().toISOString()
			});
		});
	}
};
