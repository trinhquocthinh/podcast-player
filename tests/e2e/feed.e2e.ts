import { test, expect } from '@playwright/test';

test.describe('Feed Flow', () => {
	test('should add a feed and list episodes', async ({ page }) => {
		// Mock the API response
		await page.route('**/api/feed', async (route) => {
			await route.fulfill({
				json: {
					podcast: {
						feedUrl: 'https://test.com/rss',
						title: 'Playwright Test Podcast',
						author: 'Playwright',
						description: 'A podcast for E2E testing',
						coverImage: '',
						lastFetched: new Date().toISOString()
					},
					episodes: [
						{
							id: 'ep1',
							title: 'Episode 1: Setup',
							description: 'Setting up Playwright',
							audioUrl: 'https://example.com/audio.mp3',
							duration: 120,
							publishedAt: new Date().toISOString()
						}
					]
				}
			});
		});

		// Go to home page
		await page.goto('/');

		// Click "Thêm Podcast" button (Assuming there is an input for feed URL and a submit button)
		// Wait, we need to know the UI layout.
		// In AddFeedForm.svelte:
		// <input bind:value={feedUrl} type="url" placeholder="https://..." required />
		// <button type="submit">Thêm</button>

		await page.fill('input[type="url"]', 'https://test.com/rss');
		await page.click('button[type="submit"]');

		// Wait for the podcast to appear
		await expect(page.locator('text=Playwright Test Podcast')).toBeVisible();

		// Click on the podcast to see episodes
		// <a href="/podcast/{encodeURIComponent(podcast.feedUrl)}">
		await page.click('text=Playwright Test Podcast');

		// Verify episode is visible
		await expect(page.locator('text=Episode 1: Setup')).toBeVisible();
	});
});
