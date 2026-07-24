import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Parser from 'rss-parser';
import { retryWithBackoff } from '$lib/core/utils/retry';
import { isValidFeedUrl } from '$lib/core/utils/validators';

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
		const { feedUrl } = await request.json();

		if (!feedUrl || !isValidFeedUrl(feedUrl)) {
			return json(
				{ error: 'Invalid URL format or restricted IP', code: 'INVALID_URL', retryable: false },
				{ status: 400 }
			);
		}

		const feed = await retryWithBackoff(
			async () => {
				return await parser.parseURL(feedUrl);
			},
			3,
			1000
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const episodes = (feed.items || []).map((item: any, index: number) => ({
			id: item.guid || item.link || `${feedUrl}-${index}`,
			title: item.title || `Episode ${index + 1}`,
			description: item.itunes?.summary || item.itunesSummary || item.contentSnippet || '',
			audioUrl: item.enclosure?.url || '',
			duration: parseDuration(item.itunes?.duration || item.itunesDuration || '0'),
			publishedAt: item.isoDate || new Date().toISOString(),
			episodeNumber: parseInt(item.itunes?.episode || item.itunesEpisode) || undefined
		}));

		// Return all episodes, client will filter the new ones based on its IndexedDB
		return json({
			episodes,
			totalEpisodes: episodes.length,
			lastFetched: new Date().toISOString()
		});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
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

function parseDuration(duration: string): number {
	if (!duration) return 0;
	if (!isNaN(Number(duration))) return Number(duration);

	const parts = duration.split(':').map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return 0;
}
