import type { Podcast, Track } from '$lib/core/db';
import { AppError } from '$lib/core/types/errors';

export interface FeedResponse {
	podcast: Podcast;
	episodes: Track[];
}

export interface RefreshFeedResponse {
	episodes: Track[];
	totalEpisodes: number;
	lastFetched: string;
}

export async function addFeed(url: string): Promise<FeedResponse> {
	const res = await fetch('/api/feed', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ url })
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new AppError(
			errorData.code || 'UNKNOWN_ERROR',
			errorData.error || 'Lỗi khi thêm RSS Feed',
			{ retryable: errorData.retryable ?? false }
		);
	}

	return await res.json();
}

export async function refreshFeed(feedUrl: string): Promise<RefreshFeedResponse> {
	const res = await fetch('/api/feed/refresh', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ feedUrl })
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new AppError(
			errorData.code || 'UNKNOWN_ERROR',
			errorData.error || 'Lỗi khi cập nhật RSS Feed',
			{ retryable: errorData.retryable ?? false }
		);
	}

	return await res.json();
}
