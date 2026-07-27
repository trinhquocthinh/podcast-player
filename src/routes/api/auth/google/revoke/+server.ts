/**
 * OAuth Token Revoke Route — Google Drive Cloud Sync
 *
 * Stateless relay: receives token, revokes it via Google's revoke endpoint.
 *
 * @see BR-P2-CLOUD-005 — Xóa tài khoản Cloud = Xóa dữ liệu Cloud, không xóa Local
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { token } = await request.json();

		if (!token) {
			return json({ error: 'Missing required parameter: token' }, { status: 400 });
		}

		const revokeResponse = await fetch(
			`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			}
		);

		if (!revokeResponse.ok) {
			const errorText = await revokeResponse.text();
			console.error('Google token revoke failed:', errorText);
			// Return success anyway — token may already be expired/revoked
			return json({ success: true, warning: 'Token may already be revoked' });
		}

		return json({ success: true });
	} catch (error) {
		console.error('OAuth revoke error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
