/**
 * Sync Domain Types
 *
 * Abstract interfaces for Cloud Sync providers — designed to be provider-agnostic
 * so future providers (Dropbox, WebDAV, iCloud) can be added without breaking
 * BR-P2-CLOUD-002/003/004.
 *
 * @see BR-P2-CLOUD-006 — Provider mặc định là Google Drive appDataFolder
 */

import type { Bookmark, Setting, PlaybackState } from '$lib/core/db';

// === Sync Payload ===

/**
 * The shape of data to be synchronized.
 * BR-P2-CLOUD-003: Chỉ đồng bộ metadata nhẹ (bookmarks, settings, playbackState).
 * KHÔNG đồng bộ file audio gốc hoặc bản tải offline.
 */
export interface SyncPayload {
	version: number;
	timestamp: string;
	deviceId: string;
	data: {
		bookmarks: Bookmark[];
		settings: Setting[];
		playbackState: PlaybackState[];
	};
}

// === Conflict History ===

/**
 * Stores a snapshot of a bookmark that was overwritten during conflict resolution.
 * BR-P2-CLOUD-004: Giữ lại bản ghi bị ghi đè (tối thiểu 1 bản gần nhất).
 */
export interface ConflictRecord {
	bookmarkId: string;
	overwrittenNote: string;
	overwrittenAt: string;
	deviceId: string;
	resolvedAt: string;
}

// === Cloud Sync Provider Interface ===

/**
 * Abstract provider interface — implementations handle the actual storage backend.
 * BR-P2-CLOUD-006: Designed as abstraction to support future providers.
 */
export interface CloudSyncProvider {
	readonly name: string;

	/** Check if the provider is currently authenticated and connected */
	isConnected(): boolean;

	/** Initiate connection (OAuth flow, etc.) */
	connect(): Promise<void>;

	/** Optional: Initialize provider state from stored credentials */
	initialize?(): Promise<void>;

	/**
	 * Disconnect and clean up.
	 * BR-P2-CLOUD-005: Xóa dữ liệu cloud, KHÔNG xóa dữ liệu local.
	 */
	disconnect(): Promise<void>;

	/** Upload encrypted payload to remote storage */
	push(encryptedPayload: string): Promise<void>;

	/** Download encrypted payload from remote storage. Returns null if no remote data exists. */
	pull(): Promise<string | null>;

	/** Delete all remote data for this app */
	deleteRemoteData(): Promise<void>;

	/** Get current access token (for authenticated API calls) */
	getAccessToken(): Promise<string | null>;
}

// === Sync State ===

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'disconnected';

export interface SyncState {
	status: SyncStatus;
	lastSyncAt: string | null;
	error: string | null;
	provider: string | null;
}

// === Sync Config ===

export const SYNC_CONSTANTS = {
	/** Debounce delay for auto-push after local changes (ms) */
	AUTO_SYNC_DEBOUNCE_MS: 5000,

	/** Minimum passphrase length */
	MIN_PASSPHRASE_LENGTH: 8,

	/** Current sync data format version */
	SYNC_DATA_VERSION: 1,

	/** File name on Google Drive appDataFolder */
	SYNC_FILE_NAME: 'focuscast-sync-data.enc',

	/** Google Drive API base URL */
	GOOGLE_DRIVE_API: 'https://www.googleapis.com/drive/v3',

	/** Google Drive upload API base URL */
	GOOGLE_DRIVE_UPLOAD_API: 'https://www.googleapis.com/upload/drive/v3',

	/** Google OAuth endpoints */
	GOOGLE_AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
	GOOGLE_TOKEN_URL: 'https://oauth2.googleapis.com/token',
	GOOGLE_REVOKE_URL: 'https://oauth2.googleapis.com/revoke',

	/** OAuth scope — only appDataFolder access */
	GOOGLE_DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive.appdata'
} as const;
