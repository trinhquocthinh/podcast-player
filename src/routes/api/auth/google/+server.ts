/**
 * OAuth Token Exchange Route — Google Drive Cloud Sync
 *
 * Stateless relay: receives authorization code from client,
 * exchanges it for access_token + refresh_token via Google Token Endpoint,
 * returns tokens to client. Server NEVER stores or reads user data.
 *
 * @see BR-P2-CLOUD-006 — Route chỉ relay OAuth token, không lưu trữ
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, redirect_uri } = await request.json();

		if (!code || !redirect_uri) {
			return json({ error: 'Missing required parameters: code, redirect_uri' }, { status: 400 });
		}

		const clientId = env.GOOGLE_CLIENT_ID;
		const clientSecret = env.GOOGLE_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
			return json({ error: 'Server configuration error' }, { status: 500 });
		}

		// Exchange authorization code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri,
				grant_type: 'authorization_code'
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			console.error('Google token exchange failed:', errorData);
			return json(
				{ error: 'Token exchange failed', details: errorData.error_description || errorData.error },
				{ status: tokenResponse.status }
			);
		}

		const tokenData = await tokenResponse.json();

		// Return tokens to client — server does NOT store anything
		return json({
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expires_in: tokenData.expires_in,
			token_type: tokenData.token_type,
			scope: tokenData.scope
		});
	} catch (error) {
		console.error('OAuth exchange error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
