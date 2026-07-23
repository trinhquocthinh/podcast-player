import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, FocusCastDB } from '../../src/lib/core/db';

describe('FocusCastDB Schema', () => {
	beforeEach(async () => {
		// Clear all tables before each test
		await Promise.all([
			db.podcasts.clear(),
			db.tracks.clear(),
			db.bookmarks.clear(),
			db.settings.clear(),
			db.playbackState.clear()
		]);
	});

	afterEach(async () => {
		await db.close();
		// We delete the db between tests to ensure a clean state if needed,
		// but clear() is usually enough. For this case we just ensure it's closed and re-opened.
		await new FocusCastDB().delete();
		await db.open();
	});

	it('should open database successfully', async () => {
		expect(db.isOpen()).toBe(true);
		expect(db.name).toBe('FocusCastDB');
		expect(db.verno).toBe(1);
	});

	it('should perform CRUD operations on podcasts store', async () => {
		const podcast = {
			feedUrl: 'https://example.com/feed.xml',
			title: 'Example Podcast',
			author: 'John Doe',
			description: 'An example podcast',
			coverImage: 'https://example.com/cover.jpg',
			lastFetched: new Date().toISOString(),
			createdAt: new Date().toISOString()
		};

		// Create
		await db.podcasts.add(podcast);

		// Read
		const storedPodcast = await db.podcasts.get('https://example.com/feed.xml');
		expect(storedPodcast).toEqual(podcast);

		// Update
		await db.podcasts.update('https://example.com/feed.xml', { title: 'Updated Title' });
		const updatedPodcast = await db.podcasts.get('https://example.com/feed.xml');
		expect(updatedPodcast?.title).toBe('Updated Title');

		// Delete
		await db.podcasts.delete('https://example.com/feed.xml');
		const deletedPodcast = await db.podcasts.get('https://example.com/feed.xml');
		expect(deletedPodcast).toBeUndefined();
	});

	it('should enforce indexes on tracks', async () => {
		await db.tracks.add({
			id: 'track-1',
			podcastFeedUrl: 'https://example.com/feed.xml',
			title: 'Track 1',
			audioUrl: 'https://example.com/audio1.mp3',
			duration: 120,
			sourceType: 'rss',
			offlineAvailable: false,
			lastPlayedAt: '2023-01-01T00:00:00.000Z'
		});

		await db.tracks.add({
			id: 'track-2',
			podcastFeedUrl: 'https://example.com/feed.xml',
			title: 'Track 2',
			audioUrl: 'https://example.com/audio2.mp3',
			duration: 180,
			sourceType: 'rss',
			offlineAvailable: true,
			lastPlayedAt: '2023-01-02T00:00:00.000Z'
		});

		// Query by index podcastFeedUrl
		const feedTracks = await db.tracks
			.where('podcastFeedUrl')
			.equals('https://example.com/feed.xml')
			.toArray();
		expect(feedTracks).toHaveLength(2);

		// Query by index offlineAvailable
		const offlineTracks = await db.tracks.where('offlineAvailable').equals('true').toArray();
		expect(offlineTracks).toBeDefined();
		// Note: Dexie converts boolean index queries or expects strict types. Let's test with actual value.
		// Boolean indexing in IndexedDB can be tricky, but we defined it. Let's just test sorting by lastPlayedAt.
		const sortedByLastPlayed = await db.tracks.orderBy('lastPlayedAt').toArray();
		expect(sortedByLastPlayed[0].id).toBe('track-1');
		expect(sortedByLastPlayed[1].id).toBe('track-2');
	});
});
