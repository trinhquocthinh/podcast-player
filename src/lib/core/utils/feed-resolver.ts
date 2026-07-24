/**
 * Resolves podcast platform URLs (e.g., Apple Podcasts) to actual RSS feed URLs.
 * If the URL is already an RSS feed URL, returns it as-is.
 *
 * Supported platforms:
 * - Apple Podcasts: https://podcasts.apple.com/.../id{PODCAST_ID}...
 *   → Uses iTunes Lookup API to get feedUrl
 */
export async function resolveToFeedUrl(
	url: string
): Promise<{ feedUrl: string; resolved: boolean }> {
	const applePodcastId = extractApplePodcastId(url);
	if (applePodcastId) {
		const feedUrl = await lookupApplePodcastFeedUrl(applePodcastId);
		return { feedUrl, resolved: true };
	}

	// Not a known platform link → assume it's already an RSS feed URL
	return { feedUrl: url, resolved: false };
}

/**
 * Extracts Apple Podcasts ID from an Apple Podcasts URL.
 * Supports formats:
 * - https://podcasts.apple.com/vn/podcast/some-name/id1556878879
 * - https://podcasts.apple.com/vn/podcast/some-name/id1556878879?i=1000777535972
 * - https://podcasts.apple.com/us/podcast/id1556878879
 */
function extractApplePodcastId(url: string): string | null {
	try {
		const parsed = new URL(url);
		if (
			!parsed.hostname.includes('podcasts.apple.com') &&
			!parsed.hostname.includes('itunes.apple.com')
		) {
			return null;
		}

		// Match /id{digits} in the path
		const match = parsed.pathname.match(/\/id(\d+)/);
		return match ? match[1] : null;
	} catch {
		return null;
	}
}

/**
 * Uses Apple's iTunes Lookup API to resolve a podcast ID to its RSS feed URL.
 * API docs: https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
async function lookupApplePodcastFeedUrl(podcastId: string): Promise<string> {
	const lookupUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`;

	const response = await fetch(lookupUrl);
	if (!response.ok) {
		throw new Error(`iTunes Lookup API trả về status ${response.status}`);
	}

	const data = await response.json();

	if (!data.results || data.results.length === 0) {
		throw new Error('Không tìm thấy Podcast với ID này trên Apple Podcasts.');
	}

	const feedUrl = data.results[0]?.feedUrl;
	if (!feedUrl) {
		throw new Error(
			'Podcast này trên Apple Podcasts không công khai RSS feed. Có thể là nội dung độc quyền.'
		);
	}

	return feedUrl;
}
