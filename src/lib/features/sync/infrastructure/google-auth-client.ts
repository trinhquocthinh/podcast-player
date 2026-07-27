/**
 * Google Auth Client — Client-side OAuth helper
 *
 * Handles OAuth flow initiation, token exchange via server relay,
 * token storage (encrypted in IndexedDB settings), and token refresh.
 *
 * @see BR-P2-CLOUD-006 — Uses server relay for token exchange only
 */
import { db } from '$lib/core/db';
import { SYNC_CONSTANTS } from '../domain/sync-types';
import { encrypt, decrypt } from './crypto-service';

// Settings keys for token storage
const TOKEN_KEYS = {
	ACCESS_TOKEN: 'google_access_token',
	REFRESH_TOKEN: 'google_refresh_token',
	TOKEN_EXPIRY: 'google_token_expiry',
	CONNECTED: 'cloud_sync_connected'
} as const;

/**
 * Build Google OAuth authorization URL.
 * User will be redirected to this URL to grant permission.
 */
export function getAuthUrl(clientId: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: SYNC_CONSTANTS.GOOGLE_DRIVE_SCOPE,
		access_type: 'offline',
		prompt: 'consent' // Force consent to always get refresh_token
	});

	return `${SYNC_CONSTANTS.GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via server relay.
 */
export async function exchangeCode(
	code: string,
	redirectUri: string
): Promise<{
	access_token: string;
	refresh_token: string;
	expires_in: number;
}> {
	const response = await fetch('/api/auth/google', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code, redirect_uri: redirectUri })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.details || error.error || 'Token exchange failed');
	}

	return response.json();
}

/**
 * Refresh an expired access token via server relay.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
	access_token: string;
	expires_in: number;
}> {
	const response = await fetch('/api/auth/google/refresh', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ refresh_token: refreshToken })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.details || error.error || 'Token refresh failed');
	}

	return response.json();
}

/**
 * Revoke a token via server relay.
 */
export async function revokeToken(token: string): Promise<void> {
	await fetch('/api/auth/google/revoke', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token })
	});
}

/**
 * Store OAuth tokens in IndexedDB settings (encrypted with sync passphrase).
 */
export async function storeTokens(
	accessToken: string,
	refreshToken: string,
	expiresIn: number,
	passphrase: string
): Promise<void> {
	const expiryTime = new Date(Date.now() + expiresIn * 1000).toISOString();

	// Encrypt tokens before storing (extra layer of protection in IndexedDB)
	const encryptedAccess = await encrypt(accessToken, passphrase);
	const encryptedRefresh = await encrypt(refreshToken, passphrase);

	await db.transaction('rw', db.settings, async () => {
		await db.settings.put({ key: TOKEN_KEYS.ACCESS_TOKEN, value: encryptedAccess });
		await db.settings.put({ key: TOKEN_KEYS.REFRESH_TOKEN, value: encryptedRefresh });
		await db.settings.put({ key: TOKEN_KEYS.TOKEN_EXPIRY, value: expiryTime });
		await db.settings.put({ key: TOKEN_KEYS.CONNECTED, value: true });
	});
}

/**
 * Get a valid access token, auto-refreshing if expired.
 */
export async function getValidAccessToken(passphrase: string): Promise<string | null> {
	const accessTokenSetting = await db.settings.get(TOKEN_KEYS.ACCESS_TOKEN);
	const refreshTokenSetting = await db.settings.get(TOKEN_KEYS.REFRESH_TOKEN);
	const expirySetting = await db.settings.get(TOKEN_KEYS.TOKEN_EXPIRY);

	if (!accessTokenSetting?.value || !refreshTokenSetting?.value) {
		return null;
	}

	const expiry = expirySetting?.value ? new Date(expirySetting.value) : new Date(0);

	// If token not expired (with 5-minute buffer), use it
	if (expiry.getTime() > Date.now() + 5 * 60 * 1000) {
		return decrypt(accessTokenSetting.value, passphrase);
	}

	// Token expired — try refresh
	try {
		const refreshToken = await decrypt(refreshTokenSetting.value, passphrase);
		const result = await refreshAccessToken(refreshToken);

		// Store new access token
		const newExpiry = new Date(Date.now() + result.expires_in * 1000).toISOString();
		const encryptedAccess = await encrypt(result.access_token, passphrase);

		await db.settings.put({ key: TOKEN_KEYS.ACCESS_TOKEN, value: encryptedAccess });
		await db.settings.put({ key: TOKEN_KEYS.TOKEN_EXPIRY, value: newExpiry });

		return result.access_token;
	} catch (error) {
		console.error('Token refresh failed:', error);
		return null;
	}
}

/**
 * Clear all stored tokens (used during disconnect).
 */
export async function clearTokens(): Promise<void> {
	await db.transaction('rw', db.settings, async () => {
		await db.settings.delete(TOKEN_KEYS.ACCESS_TOKEN);
		await db.settings.delete(TOKEN_KEYS.REFRESH_TOKEN);
		await db.settings.delete(TOKEN_KEYS.TOKEN_EXPIRY);
		await db.settings.put({ key: TOKEN_KEYS.CONNECTED, value: false });
	});
}

/**
 * Check if tokens are stored (connected state).
 */
export async function isConnected(): Promise<boolean> {
	const setting = await db.settings.get(TOKEN_KEYS.CONNECTED);
	return setting?.value === true;
}
