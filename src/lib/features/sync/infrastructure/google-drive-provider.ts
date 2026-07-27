/**
 * Google Drive Provider — CloudSyncProvider implementation
 *
 * Uses Google Drive REST API v3 with appDataFolder scope to store
 * encrypted sync data. All data is encrypted BEFORE upload and
 * decrypted AFTER download on the client side.
 *
 * @see BR-P2-CLOUD-006 — Google Drive appDataFolder as storage
 * @see BR-P2-CLOUD-002 — E2EE enforced
 * @see BR-P2-CLOUD-005 — Disconnect = delete remote, keep local
 */
import type { CloudSyncProvider } from '../domain/sync-types';
import { SYNC_CONSTANTS } from '../domain/sync-types';
import {
	getAuthUrl,
	exchangeCode,
	revokeToken,
	storeTokens,
	getValidAccessToken,
	clearTokens,
	isConnected as checkConnected
} from './google-auth-client';

export class GoogleDriveProvider implements CloudSyncProvider {
	readonly name = 'Google Drive';

	private passphrase: string;
	private clientId: string;
	private connected = false;
	private syncFileId: string | null = null;

	constructor(passphrase: string, clientId: string) {
		this.passphrase = passphrase;
		this.clientId = clientId;
	}

	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Initiate OAuth connection flow.
	 * Redirects user to Google consent screen.
	 */
	async connect(): Promise<void> {
		const redirectUri = `${window.location.origin}/auth/google/callback`;
		const authUrl = getAuthUrl(this.clientId, redirectUri);
		window.location.href = authUrl;
	}

	/**
	 * Complete OAuth flow after receiving authorization code.
	 */
	async completeConnection(code: string): Promise<void> {
		const redirectUri = `${window.location.origin}/auth/google/callback`;
		const tokens = await exchangeCode(code, redirectUri);

		await storeTokens(
			tokens.access_token,
			tokens.refresh_token,
			tokens.expires_in,
			this.passphrase
		);

		this.connected = true;
	}

	/**
	 * Initialize provider state from stored tokens.
	 */
	async initialize(): Promise<void> {
		this.connected = await checkConnected();
		if (this.connected) {
			// Try to find existing sync file
			await this.findSyncFile();
		}
	}

	/**
	 * Disconnect: revoke tokens, delete remote data, clear local tokens.
	 * BR-P2-CLOUD-005: Does NOT delete local IndexedDB data.
	 */
	async disconnect(): Promise<void> {
		const accessToken = await getValidAccessToken(this.passphrase);

		if (accessToken) {
			// Delete remote sync data first
			try {
				await this.deleteRemoteData();
			} catch (error) {
				console.warn('Failed to delete remote data during disconnect:', error);
			}

			// Revoke OAuth token
			try {
				await revokeToken(accessToken);
			} catch (error) {
				console.warn('Failed to revoke token:', error);
			}
		}

		// Clear local tokens
		await clearTokens();
		this.connected = false;
		this.syncFileId = null;
	}

	/**
	 * Upload encrypted payload to Google Drive appDataFolder.
	 */
	async push(encryptedPayload: string): Promise<void> {
		const accessToken = await this.getToken();

		if (this.syncFileId) {
			// Update existing file
			await this.updateFile(this.syncFileId, encryptedPayload, accessToken);
		} else {
			// Create new file
			this.syncFileId = await this.createFile(encryptedPayload, accessToken);
		}
	}

	/**
	 * Download encrypted payload from Google Drive appDataFolder.
	 * Returns null if no sync file exists.
	 */
	async pull(): Promise<string | null> {
		const accessToken = await this.getToken();

		// Find sync file if we don't have the ID cached
		if (!this.syncFileId) {
			await this.findSyncFile();
		}

		if (!this.syncFileId) {
			return null; // No remote data
		}

		// Download file content
		const response = await fetch(
			`${SYNC_CONSTANTS.GOOGLE_DRIVE_API}/files/${this.syncFileId}?alt=media`,
			{
				headers: { Authorization: `Bearer ${accessToken}` }
			}
		);

		if (!response.ok) {
			if (response.status === 404) {
				this.syncFileId = null;
				return null;
			}
			throw new Error(`Failed to download sync data: ${response.status}`);
		}

		return response.text();
	}

	/**
	 * Delete all sync data from Google Drive appDataFolder.
	 */
	async deleteRemoteData(): Promise<void> {
		const accessToken = await this.getToken();

		if (!this.syncFileId) {
			await this.findSyncFile();
		}

		if (this.syncFileId) {
			const response = await fetch(`${SYNC_CONSTANTS.GOOGLE_DRIVE_API}/files/${this.syncFileId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Failed to delete sync data: ${response.status}`);
			}

			this.syncFileId = null;
		}
	}

	async getAccessToken(): Promise<string | null> {
		return getValidAccessToken(this.passphrase);
	}

	// === Private Methods ===

	/**
	 * Get a valid access token, throwing if unavailable.
	 */
	private async getToken(): Promise<string> {
		const token = await getValidAccessToken(this.passphrase);
		if (!token) {
			this.connected = false;
			throw new Error('Not authenticated — please reconnect Cloud Sync');
		}
		return token;
	}

	/**
	 * Find the sync file in appDataFolder by name.
	 */
	private async findSyncFile(): Promise<void> {
		try {
			const accessToken = await this.getToken();

			const params = new URLSearchParams({
				spaces: 'appDataFolder',
				q: `name = '${SYNC_CONSTANTS.SYNC_FILE_NAME}'`,
				fields: 'files(id, name, modifiedTime)',
				pageSize: '1'
			});

			const response = await fetch(
				`${SYNC_CONSTANTS.GOOGLE_DRIVE_API}/files?${params.toString()}`,
				{
					headers: { Authorization: `Bearer ${accessToken}` }
				}
			);

			if (!response.ok) {
				throw new Error(`Failed to list files: ${response.status}`);
			}

			const data = await response.json();
			if (data.files && data.files.length > 0) {
				this.syncFileId = data.files[0].id;
			}
		} catch (error) {
			console.warn('Failed to find sync file:', error);
			this.syncFileId = null;
		}
	}

	/**
	 * Create a new file in appDataFolder.
	 */
	private async createFile(content: string, accessToken: string): Promise<string> {
		// Use multipart upload for metadata + content in one request
		const metadata = {
			name: SYNC_CONSTANTS.SYNC_FILE_NAME,
			parents: ['appDataFolder'],
			mimeType: 'application/octet-stream'
		};

		const boundary = 'focuscast_sync_boundary';
		const body = [
			`--${boundary}`,
			'Content-Type: application/json; charset=UTF-8',
			'',
			JSON.stringify(metadata),
			`--${boundary}`,
			'Content-Type: application/octet-stream',
			'',
			content,
			`--${boundary}--`
		].join('\r\n');

		const response = await fetch(
			`${SYNC_CONSTANTS.GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': `multipart/related; boundary=${boundary}`
				},
				body
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Failed to create sync file: ${response.status} — ${errorText}`);
		}

		const data = await response.json();
		return data.id;
	}

	/**
	 * Update an existing file's content.
	 */
	private async updateFile(fileId: string, content: string, accessToken: string): Promise<void> {
		const response = await fetch(
			`${SYNC_CONSTANTS.GOOGLE_DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/octet-stream'
				},
				body: content
			}
		);

		if (!response.ok) {
			if (response.status === 404) {
				// File was deleted externally — create new one
				this.syncFileId = await this.createFile(content, accessToken);
				return;
			}
			const errorText = await response.text();
			throw new Error(`Failed to update sync file: ${response.status} — ${errorText}`);
		}
	}
}
