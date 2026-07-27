/**
 * Public route to expose Google Client ID to the client.
 * This is a public value (not a secret) — needed for OAuth flow initiation.
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	const clientId = env.GOOGLE_CLIENT_ID;

	if (!clientId) {
		return json({ error: 'Google Client ID not configured' }, { status: 500 });
	}

	return json({ clientId });
};
