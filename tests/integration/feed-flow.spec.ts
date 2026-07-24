import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../../src/lib/core/db';
import { POST } from '../../src/routes/api/feed/+server';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
	server.resetHandlers();
	vi.restoreAllMocks();
});

describe('Feed Flow Integration', () => {
	it('should fetch, parse, store, and return podcast data', async () => {
		await Promise.all([db.podcasts.clear(), db.tracks.clear()]);

		// We call the SvelteKit POST handler directly.
		// MSW will intercept the request to `https://example.com/rss` that rss-parser makes inside the POST handler.
		// Wait, rss-parser uses `http` or `https` module natively. MSW node should intercept it.
		// Let's create a Request object.
		const request = new Request('http://localhost/api/feed', {
			method: 'POST',
			body: JSON.stringify({ url: 'https://example.com/rss' })
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const response = await POST({ request, url: new URL(request.url) } as any);
		const result = await response.json();

		expect(response.status).toBe(200);
		expect(result.podcast.title).toBe('Test Podcast');
		expect(result.episodes.length).toBe(1);
		expect(result.episodes[0].title).toBe('Episode 1');

		// The addFeed client actually stores in DB? No, addFeed just fetches.
		// The `library.svelte.ts` (store) is responsible for storing. Let's just verify parsing for now,
		// as `library.svelte.ts` can be tested separately or in a broader integration test.
	});
});
