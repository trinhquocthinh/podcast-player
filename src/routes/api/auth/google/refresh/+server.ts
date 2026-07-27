/**
 * OAuth Token Refresh Route — Google Drive Cloud Sync
 *
 * Stateless relay: receives refresh_token, gets new access_token.
 *
 * @see BR-P2-CLOUD-006
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { refresh_token } = await request.json();

		if (!refresh_token) {
			return json({ error: 'Missing required parameter: refresh_token' }, { status: 400 });
		}

		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
			return json({ error: 'Server configuration error' }, { status: 500 });
		}

		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				refresh_token,
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'refresh_token'
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			console.error('Google token refresh failed:', errorData);
			return json(
				{ error: 'Token refresh failed', details: errorData.error_description || errorData.error },
				{ status: tokenResponse.status }
			);
		}

		const tokenData = await tokenResponse.json();

		return json({
			access_token: tokenData.access_token,
			expires_in: tokenData.expires_in,
			token_type: tokenData.token_type,
			scope: tokenData.scope
		});
	} catch (error) {
		console.error('OAuth refresh error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
