/**
 * Validates a feed URL and ensures it doesn't point to private networks (SSRF protection on client side,
 * though main protection is on server side)
 */
export function isValidFeedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

		// Basic client-side SSRF mitigation (server must also check)
		const hostname = parsed.hostname;
		const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
		const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname);

		if (isLocalhost || isPrivateIP) return false;

		return true;
	} catch {
		return false;
	}
}
