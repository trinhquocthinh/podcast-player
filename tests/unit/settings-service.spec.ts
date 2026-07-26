import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { settingsService } from '../../src/lib/features/settings/infrastructure/settings-service';
import { db } from '../../src/lib/core/db';

describe('SettingsService', () => {
	beforeEach(async () => {
		await db.settings.clear();
	});

	it('should return default values when not set', async () => {
		expect(await settingsService.getSilenceSkipThreshold()).toBe(-40);
		expect(await settingsService.getSilenceSkipMinDuration()).toBe(300);
		expect(await settingsService.getDefaultPlaybackSpeed()).toBe(1.0);
		expect(await settingsService.getTheme()).toBe('system');
		expect(await settingsService.getBookmarkPostAction()).toBe('CONTINUE');
	});

	it('should set and get custom values', async () => {
		await settingsService.setSilenceSkipThreshold(-25);
		await settingsService.setSilenceSkipMinDuration(500);
		await settingsService.setDefaultPlaybackSpeed(1.5);
		await settingsService.setTheme('dark');
		await settingsService.setBookmarkPostAction('PAUSE_FOR_NOTE');

		expect(await settingsService.getSilenceSkipThreshold()).toBe(-25);
		expect(await settingsService.getSilenceSkipMinDuration()).toBe(500);
		expect(await settingsService.getDefaultPlaybackSpeed()).toBe(1.5);
		expect(await settingsService.getTheme()).toBe('dark');
		expect(await settingsService.getBookmarkPostAction()).toBe('PAUSE_FOR_NOTE');
	});
});
