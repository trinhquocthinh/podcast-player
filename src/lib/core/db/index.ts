import Dexie, { type EntityTable } from 'dexie';
import { browser } from '$app/environment';
import { applyMigrations } from './migrations';

// === ENTITIES ===

export interface Podcast {
	feedUrl: string; // Primary Key
	title: string;
	author: string;
	description: string;
	coverImage: string;
	lastFetched: string; // ISO 8601
	createdAt: string;
}

export interface Track {
	id: string; // Primary Key (GUID from RSS or generated)
	podcastFeedUrl?: string; // FK → Podcast (null for local files)
	title: string;
	description?: string;
	audioUrl: string; // Remote URL or blob URL
	duration: number; // seconds
	publishedAt?: string;
	episodeNumber?: number;
	sourceType: 'rss' | 'local';
	offlineAvailable: boolean;
	fileSize?: number; // bytes
	lastPlayedAt?: string;
}

export interface Bookmark {
	id: string; // Primary Key (UUID)
	trackId: string; // FK → Track
	timestampStart: number;
	timestampEnd?: number;
	note: string; // max 5000 chars
	createdAt: string;
	updatedAt: string;
	orphaned: boolean;
}

export interface Setting {
	key: string; // Primary Key
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;
}

export interface PlaybackState {
	trackId: string; // Primary Key
	position: number; // seconds
	speed: number;
	silenceSkippingEnabled: boolean;
	updatedAt: string;
}

// === DATABASE ===

export class FocusCastDB extends Dexie {
	podcasts!: EntityTable<Podcast, 'feedUrl'>;
	tracks!: EntityTable<Track, 'id'>;
	bookmarks!: EntityTable<Bookmark, 'id'>;
	settings!: EntityTable<Setting, 'key'>;
	playbackState!: EntityTable<PlaybackState, 'trackId'>;

	constructor() {
		super('FocusCastDB');

		this.version(1).stores({
			podcasts: 'feedUrl, title',
			tracks: 'id, podcastFeedUrl, sourceType, lastPlayedAt, offlineAvailable',
			bookmarks: 'id, trackId, timestampStart, createdAt, orphaned',
			settings: 'key',
			playbackState: 'trackId'
		});

		applyMigrations(this);
	}
}

export const db = new FocusCastDB();

export async function checkIntegrity(): Promise<boolean> {
	if (!browser) return true; // Server-side rendering always passes integrity
	try {
		await db.open();
		return true;
	} catch (error) {
		console.error('Database integrity check failed:', error);
		return false;
	}
}
