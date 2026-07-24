import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Parser from 'rss-parser';
import { retryWithBackoff } from '$lib/core/utils/retry';
import { isValidFeedUrl } from '$lib/core/utils/validators';
import { resolveToFeedUrl } from '$lib/core/utils/feed-resolver';

const parser = new Parser({
	customFields: {
		item: [
			['itunes:duration', 'itunesDuration'],
			['itunes:episode', 'itunesEpisode'],
			['itunes:image', 'itunesImage'],
			['itunes:summary', 'itunesSummary']
		],
		feed: [
			['itunes:author', 'itunesAuthor'],
			['itunes:image', 'itunesImage']
		]
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any,
	timeout: 10000 // 10s timeout
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url } = await request.json();

		// 1. Validate URL
		if (!url || !isValidFeedUrl(url)) {
			return json(
				{ error: 'Invalid URL format or restricted IP', code: 'INVALID_URL', retryable: false },
				{ status: 400 }
			);
		}

		// 2. Resolve platform URLs (Apple Podcasts, etc.) → actual RSS feed URL
		let resolvedUrl: string;
		try {
			const result = await resolveToFeedUrl(url);
			resolvedUrl = result.feedUrl;
		} catch (err) {
			const resolveErr = err as Error;
			return json(
				{
					error: resolveErr.message || 'Không thể chuyển đổi link nền tảng sang RSS Feed.',
					code: 'RESOLVE_ERROR',
					retryable: false
				},
				{ status: 422 }
			);
		}

		// 3. Fetch & Parse with retry
		const feed = await retryWithBackoff(
			async () => {
				return await parser.parseURL(resolvedUrl);
			},
			3, // max retries
			1000 // base delay ms
		);

		// Helper to safely extract image URL from various RSS formats
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const extractImage = (item: any) => {
			if (item.itunes?.image) return item.itunes.image;
			if (item.itunesImage?.['$']?.href) return item.itunesImage['$'].href;
			if (item.image?.url) return item.image.url;
			return '';
		};

		// 4. Transform to API response
		const podcast = {
			feedUrl: resolvedUrl, // Luôn dùng RSS feed URL thực, không phải Apple Podcasts link
			title: feed.title || 'Unknown Podcast',
			author: feed.itunes?.author || feed.itunesAuthor || feed.creator || 'Unknown',
			description: feed.description || '',
			coverImage: extractImage(feed),
			lastFetched: new Date().toISOString()
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const episodes = (feed.items || []).map((item: any, index: number) => ({
			id: item.guid || item.link || `${resolvedUrl}-${index}`,
			title: item.title || `Episode ${index + 1}`,
			description: item.itunes?.summary || item.itunesSummary || item.contentSnippet || '',
			audioUrl: item.enclosure?.url || '',
			duration: parseDuration(item.itunes?.duration || item.itunesDuration || '0'),
			publishedAt: item.isoDate || new Date().toISOString(),
			episodeNumber: parseInt(item.itunes?.episode || item.itunesEpisode) || undefined
		}));

		return json({ podcast, episodes });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		// Parse error vs network error
		if (
			err.message?.includes('XML') ||
			err.message?.includes('parse') ||
			err.message?.includes('Non-whitespace before first tag')
		) {
			return json(
				{ error: `RSS Feed không hợp lệ: ${err.message}`, code: 'INVALID_XML', retryable: false },
				{ status: 422 }
			);
		}

		return json(
			{
				error: `Không thể kết nối đến RSS Feed sau 3 lần thử`,
				code: 'NETWORK_ERROR',
				retryable: true,
				details: { lastError: err.message }
			},
			{ status: 502 }
		);
	}
};

// Helper: Parse iTunes duration format
function parseDuration(duration: string): number {
	if (!duration) return 0;
	if (!isNaN(Number(duration))) return Number(duration);

	const parts = duration.split(':').map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return 0;
}
