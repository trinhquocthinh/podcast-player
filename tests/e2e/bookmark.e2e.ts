import { test, expect } from '@playwright/test';

test.describe('Bookmark Flow', () => {
	test('should create, edit, and export a bookmark', async ({ page }) => {
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
							title: 'Episode 1: Bookmark',
							description: 'Testing bookmarks',
							audioUrl: 'https://test.com/dummy.mp3',
							duration: 120,
							publishedAt: new Date().toISOString()
						}
					]
				}
			});
		});

		await page.route('https://test.com/dummy.mp3', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'audio/mpeg',
				body: Buffer.from('dummy audio content')
			});
		});

		// 1. Setup
		await page.goto('/');
		await page.fill('input[type="url"]', 'https://test.com/rss');
		await page.click('button[type="submit"]');
		await page.click('text=Playwright Test Podcast');

		// Wait for episode list
		await expect(page.locator('text=Episode 1: Bookmark')).toBeVisible();

		// Play the episode
		await page.click('button[title="Phát"]');
		await expect(page.locator('.player-bar')).toBeVisible();

		// 2. Create Bookmark
		// The Quick Bookmark button is in PlayerBar
		await page.click('button[title="Quick Bookmark (B)"]');

		// A toast might appear, but let's go to the bookmarks page to check
		await page.goto('/bookmarks');
		await expect(page.locator('text=Episode 1: Bookmark')).toBeVisible();

		// 3. Edit Bookmark
		// Click on the bookmark to edit
		await page.click('text=Episode 1: Bookmark'); // Assuming it links or opens the editor

		// Fill in note
		await page.fill('textarea[placeholder="Thêm ghi chú..."]', 'This is an E2E test note');
		await page.click('button:has-text("Lưu")');

		// 4. Export
		await page.goto('/export');

		// Select the track
		await page.selectOption('select#track', { label: 'Episode 1: Bookmark' });

		// Select markdown format
		await page.selectOption('select#format', 'markdown');

		// Click Export
		// Since download will trigger a file dialog in browser, we can catch the download event in playwright
		const downloadPromise = page.waitForEvent('download');
		await page.click('button:has-text("Xuất File")');
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toContain('.md');

		// Optionally, we can also delete the bookmark
		await page.goto('/bookmarks');
		// We might need to click the bookmark again to edit it
		await page.click('text=Episode 1: Bookmark');

		// Handle the confirmation dialog
		page.on('dialog', (dialog) => dialog.accept());
		await page.click('button:has-text("Xóa")');

		// Ensure it's deleted
		await expect(page.locator('text=No bookmarks yet.')).toBeVisible();
	});
});
