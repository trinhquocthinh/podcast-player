/**
 * Sync Service — Orchestrator for Cloud Sync
 *
 * Coordinates the full sync lifecycle:
 * - Pull remote data → decrypt → merge with local → push changes
 * - Auto-sync with debounce on local changes
 * - Conflict resolution (Last-Write-Wins with history)
 *
 * @see BR-P2-CLOUD-001 — Opt-in, mặc định TẮT
 * @see BR-P2-CLOUD-003 — Chỉ sync bookmarks, settings, playbackState
 * @see BR-P2-CLOUD-004 — Conflict resolution không mất dữ liệu
 */
import { db, type Bookmark, type Setting, type PlaybackState } from '$lib/core/db';
import type {
	CloudSyncProvider,
	SyncPayload,
	SyncState,
	ConflictRecord
} from '../domain/sync-types';
import { SYNC_CONSTANTS } from '../domain/sync-types';
import { encrypt, decrypt } from '../infrastructure/crypto-service';

// Settings keys for sync metadata
const SYNC_KEYS = {
	ENABLED: 'cloud_sync_enabled',
	LAST_SYNC: 'cloud_sync_last_sync',
	DEVICE_ID: 'cloud_sync_device_id',
	PASSPHRASE_TOKEN: 'cloud_sync_passphrase_token',
	CONFLICT_HISTORY: 'cloud_sync_conflict_history'
} as const;

/**
 * Generate a unique device ID (persisted in settings).
 */
async function getOrCreateDeviceId(): Promise<string> {
	const existing = await db.settings.get(SYNC_KEYS.DEVICE_ID);
	if (existing?.value) return existing.value;

	const deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	await db.settings.put({ key: SYNC_KEYS.DEVICE_ID, value: deviceId });
	return deviceId;
}

export class SyncService {
	private provider: CloudSyncProvider | null = null;
	private passphrase: string | null = null;
	private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
	private isAutoSyncEnabled = false;

	// Reactive sync state (Svelte 5 compatible via external binding)
	private _state: SyncState = {
		status: 'disconnected',
		lastSyncAt: null,
		error: null,
		provider: null
	};

	get state(): SyncState {
		return { ...this._state };
	}

	private updateState(partial: Partial<SyncState>): void {
		this._state = { ...this._state, ...partial };
		this.onStateChange?.(this._state);
	}

	/** Callback for external state observers (set by UI layer) */
	onStateChange: ((state: SyncState) => void) | null = null;

	/**
	 * Initialize the sync service with a provider and passphrase.
	 */
	async initialize(provider: CloudSyncProvider, passphrase: string): Promise<void> {
		this.provider = provider;
		this.passphrase = passphrase;

		await provider.initialize?.();

		if (provider.isConnected()) {
			this.updateState({
				status: 'idle',
				provider: provider.name
			});

			// Load last sync time
			const lastSync = await db.settings.get(SYNC_KEYS.LAST_SYNC);
			if (lastSync?.value) {
				this.updateState({ lastSyncAt: lastSync.value });
			}
		} else {
			this.updateState({ status: 'disconnected', provider: null });
		}
	}

	/**
	 * Perform a full sync cycle: pull → merge → push.
	 */
	async syncNow(): Promise<void> {
		if (!this.provider || !this.passphrase) {
			throw new Error('Sync service not initialized');
		}

		if (!this.provider.isConnected()) {
			this.updateState({ status: 'disconnected', error: 'Not connected' });
			throw new Error('Provider not connected');
		}

		this.updateState({ status: 'syncing', error: null });

		try {
			// 1. Pull remote data
			const remoteEncrypted = await this.provider.pull();
			let remotePayload: SyncPayload | null = null;

			if (remoteEncrypted) {
				try {
					const decrypted = await decrypt(remoteEncrypted, this.passphrase);
					remotePayload = JSON.parse(decrypted);
				} catch (error) {
					console.error('Failed to decrypt remote data:', error);
					this.updateState({
						status: 'error',
						error: 'Không thể giải mã dữ liệu — sai passphrase?'
					});
					throw error;
				}
			}

			// 2. Merge remote with local
			if (remotePayload) {
				await this.mergeRemoteData(remotePayload);
			}

			// 3. Push local data to remote
			await this.pushLocalData();

			// 4. Update last sync time
			const now = new Date().toISOString();
			await db.settings.put({ key: SYNC_KEYS.LAST_SYNC, value: now });

			this.updateState({
				status: 'idle',
				lastSyncAt: now,
				error: null
			});
		} catch (error) {
			if (this._state.status !== 'error') {
				this.updateState({
					status: 'error',
					error: error instanceof Error ? error.message : 'Sync failed'
				});
			}
			throw error;
		}
	}

	/**
	 * Start auto-sync: listen for local DB changes and push after debounce.
	 */
	startAutoSync(): void {
		if (this.isAutoSyncEnabled) return;
		this.isAutoSyncEnabled = true;

		// Subscribe to bookmark changes using Dexie hooks
		db.bookmarks.hook('creating', () => this.schedulePush());
		db.bookmarks.hook('updating', () => this.schedulePush());
		db.bookmarks.hook('deleting', () => this.schedulePush());

		// Subscribe to settings changes
		db.settings.hook('creating', (_primKey, obj) => {
			// Don't trigger sync for sync-related settings themselves
			if (typeof obj.key === 'string' && obj.key.startsWith('cloud_sync_')) return;
			if (typeof obj.key === 'string' && obj.key.startsWith('google_')) return;
			this.schedulePush();
		});
		db.settings.hook('updating', (_mods, _primKey, obj) => {
			if (typeof obj.key === 'string' && obj.key.startsWith('cloud_sync_')) return;
			if (typeof obj.key === 'string' && obj.key.startsWith('google_')) return;
			this.schedulePush();
		});

		// Subscribe to playback state changes
		db.playbackState.hook('creating', () => this.schedulePush());
		db.playbackState.hook('updating', () => this.schedulePush());
	}

	/**
	 * Stop auto-sync.
	 */
	stopAutoSync(): void {
		this.isAutoSyncEnabled = false;
		if (this.autoSyncTimer) {
			clearTimeout(this.autoSyncTimer);
			this.autoSyncTimer = null;
		}
	}

	/**
	 * Disconnect provider and clean up.
	 */
	async disconnect(): Promise<void> {
		this.stopAutoSync();

		if (this.provider) {
			await this.provider.disconnect();
		}

		this.provider = null;
		this.passphrase = null;

		// Clear sync-related settings but keep DEVICE_ID
		await db.transaction('rw', db.settings, async () => {
			await db.settings.delete(SYNC_KEYS.ENABLED);
			await db.settings.delete(SYNC_KEYS.LAST_SYNC);
			await db.settings.delete(SYNC_KEYS.PASSPHRASE_TOKEN);
			await db.settings.delete(SYNC_KEYS.CONFLICT_HISTORY);
		});

		this.updateState({
			status: 'disconnected',
			lastSyncAt: null,
			error: null,
			provider: null
		});
	}

	/**
	 * Get conflict history for review.
	 */
	async getConflictHistory(): Promise<ConflictRecord[]> {
		const setting = await db.settings.get(SYNC_KEYS.CONFLICT_HISTORY);
		return setting?.value || [];
	}

	// === Private Methods ===

	/**
	 * Schedule a push with debounce.
	 */
	private schedulePush(): void {
		if (!this.isAutoSyncEnabled || !this.provider?.isConnected()) return;

		if (this.autoSyncTimer) {
			clearTimeout(this.autoSyncTimer);
		}

		this.autoSyncTimer = setTimeout(async () => {
			try {
				await this.pushLocalData();
				const now = new Date().toISOString();
				await db.settings.put({ key: SYNC_KEYS.LAST_SYNC, value: now });
				this.updateState({ lastSyncAt: now, status: 'idle', error: null });
			} catch (error) {
				console.error('Auto-sync push failed:', error);
				this.updateState({
					status: 'error',
					error: 'Auto-sync failed'
				});
			}
		}, SYNC_CONSTANTS.AUTO_SYNC_DEBOUNCE_MS);
	}

	/**
	 * Collect local data and push encrypted payload to remote.
	 * BR-P2-CLOUD-003: Only sync bookmarks, settings, playbackState.
	 */
	private async pushLocalData(): Promise<void> {
		if (!this.provider || !this.passphrase) return;

		const deviceId = await getOrCreateDeviceId();

		// Collect syncable data (BR-P2-CLOUD-003: NO audio data)
		const bookmarks = await db.bookmarks.toArray();
		const settings = (await db.settings.toArray()).filter(
			(s) => !s.key.startsWith('cloud_sync_') && !s.key.startsWith('google_')
		);
		const playbackState = await db.playbackState.toArray();

		const payload: SyncPayload = {
			version: SYNC_CONSTANTS.SYNC_DATA_VERSION,
			timestamp: new Date().toISOString(),
			deviceId,
			data: { bookmarks, settings, playbackState }
		};

		const encrypted = await encrypt(JSON.stringify(payload), this.passphrase);
		await this.provider.push(encrypted);
	}

	/**
	 * Merge remote data with local data.
	 * BR-P2-CLOUD-004: Last-Write-Wins for bookmark notes,
	 * keep overwritten version in conflict history.
	 */
	private async mergeRemoteData(remote: SyncPayload): Promise<void> {
		await db.transaction('rw', db.bookmarks, db.settings, db.playbackState, async () => {
			// === Merge Bookmarks (with conflict resolution) ===
			await this.mergeBookmarks(remote.data.bookmarks, remote.deviceId);

			// === Merge Settings ===
			await this.mergeSettings(remote.data.settings);

			// === Merge PlaybackState ===
			await this.mergePlaybackState(remote.data.playbackState);
		});
	}

	/**
	 * Merge bookmarks with Last-Write-Wins conflict resolution.
	 * BR-P2-CLOUD-004: Keep overwritten note in conflict history.
	 */
	private async mergeBookmarks(remoteBookmarks: Bookmark[], remoteDeviceId: string): Promise<void> {
		const conflictHistory: ConflictRecord[] = await this.getConflictHistory();

		for (const remote of remoteBookmarks) {
			const local = await db.bookmarks.get(remote.id);

			if (!local) {
				// New bookmark from remote — add it
				await db.bookmarks.put(remote);
				continue;
			}

			// Both exist — compare updatedAt for LWW
			const localTime = new Date(local.updatedAt).getTime();
			const remoteTime = new Date(remote.updatedAt).getTime();

			if (remoteTime > localTime) {
				// Remote is newer — update local, save old note to conflict history
				if (local.note !== remote.note) {
					conflictHistory.push({
						bookmarkId: local.id,
						overwrittenNote: local.note,
						overwrittenAt: local.updatedAt,
						deviceId: remoteDeviceId,
						resolvedAt: new Date().toISOString()
					});

					// Keep only last 50 conflict records to avoid unbounded growth
					while (conflictHistory.length > 50) {
						conflictHistory.shift();
					}
				}

				await db.bookmarks.put(remote);
			}
			// If local is newer or equal, keep local (will be pushed next)
		}

		// Handle deletions: bookmarks in local but not in remote
		// (We keep local bookmarks that don't exist remotely — they might be new)
		// Remote deletions are handled by the remote device not including them

		// Save conflict history
		await db.settings.put({
			key: SYNC_KEYS.CONFLICT_HISTORY,
			value: conflictHistory
		});
	}

	/**
	 * Merge settings — simple LWW, no conflict history needed.
	 */
	private async mergeSettings(remoteSettings: Setting[]): Promise<void> {
		for (const remote of remoteSettings) {
			// Skip sync-internal and token settings
			if (remote.key.startsWith('cloud_sync_') || remote.key.startsWith('google_')) {
				continue;
			}

			const local = await db.settings.get(remote.key);
			if (!local) {
				await db.settings.put(remote);
			}
			// For settings without updatedAt, remote wins if local doesn't exist
			// Otherwise keep local (will be pushed)
		}
	}

	/**
	 * Merge playback state — Last-Write-Wins by updatedAt.
	 */
	private async mergePlaybackState(remoteStates: PlaybackState[]): Promise<void> {
		for (const remote of remoteStates) {
			const local = await db.playbackState.get(remote.trackId);

			if (!local) {
				await db.playbackState.put(remote);
				continue;
			}

			const localTime = new Date(local.updatedAt).getTime();
			const remoteTime = new Date(remote.updatedAt).getTime();

			if (remoteTime > localTime) {
				await db.playbackState.put(remote);
			}
		}
	}
}

/** Singleton instance */
export const syncService = new SyncService();
