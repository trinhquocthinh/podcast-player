import { test, expect } from '@playwright/test';

test.describe('Playback Flow', () => {
	test('should start playback and show player controls', async ({ page }) => {
		// Mock the API response so we have an episode to play
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
							title: 'Episode 1: Audio',
							description: 'Testing audio playback',
							// A tiny valid mp3 or mock blob url? We can't really play a real audio without the file,
							// but Playwright can click the play button.
							// For E2E we might use a dummy audio URL that resolves to a 200 OK.
							audioUrl: 'https://test.com/dummy.mp3',
							duration: 120,
							publishedAt: new Date().toISOString()
						}
					]
				}
			});
		});

		// Mock the dummy audio response
		await page.route('https://test.com/dummy.mp3', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'audio/mpeg',
				body: Buffer.from('dummy audio content')
			});
		});

		// 1. Add feed
		await page.goto('/');
		await page.fill('input[type="url"]', 'https://test.com/rss');
		await page.click('button[type="submit"]');

		// 2. Go to podcast page
		await page.click('text=Playwright Test Podcast');

		// 3. Play episode
		// In EpisodeList.svelte, there's a button to play
		await page.click('button[title="Phát"]'); // or whatever the play button text is

		// 4. Verify player bar is visible
		// We can check if the PlayerBar is showing the episode title
		await expect(page.locator('.player-bar')).toBeVisible();
		await expect(page.locator('.player-bar text=Episode 1: Audio')).toBeVisible();
	});
});
