import { db } from '$lib/core/db';
import { liveQuery } from 'dexie';

export type PostBookmarkAction = 'CONTINUE' | 'PAUSE_FOR_NOTE';

export const SETTING_KEYS = {
	BOOKMARK_POST_ACTION: 'bookmark_post_action',
	SILENCE_SKIP_THRESHOLD: 'silence_skip_threshold',
	SILENCE_SKIP_MIN_DURATION: 'silence_skip_min_duration',
	DEFAULT_PLAYBACK_SPEED: 'default_playback_speed',
	THEME: 'theme'
};

export class SettingsService {
	/**
	 * Gets a setting by key, returns default value if not found
	 */
	async getSetting<T>(key: string, defaultValue: T): Promise<T> {
		const setting = await db.settings.get(key);
		if (setting && setting.value !== undefined) {
			return setting.value as T;
		}
		return defaultValue;
	}

	/**
	 * Sets a setting
	 */
	async setSetting<T>(key: string, value: T): Promise<void> {
		await db.settings.put({ key, value });
	}

	/**
	 * Returns an observable of a setting
	 */
	observeSetting<T>(key: string, defaultValue: T) {
		return liveQuery(async () => {
			const val = await this.getSetting(key, defaultValue);
			return val;
		});
	}

	// --- Convenience methods for specific settings ---

	async getBookmarkPostAction(): Promise<PostBookmarkAction> {
		return this.getSetting<PostBookmarkAction>(SETTING_KEYS.BOOKMARK_POST_ACTION, 'CONTINUE');
	}

	async setBookmarkPostAction(action: PostBookmarkAction): Promise<void> {
		await this.setSetting(SETTING_KEYS.BOOKMARK_POST_ACTION, action);
	}

	observeBookmarkPostAction() {
		return this.observeSetting<PostBookmarkAction>(SETTING_KEYS.BOOKMARK_POST_ACTION, 'CONTINUE');
	}

	async getSilenceSkipThreshold(): Promise<number> {
		return this.getSetting<number>(SETTING_KEYS.SILENCE_SKIP_THRESHOLD, -40);
	}

	async setSilenceSkipThreshold(value: number): Promise<void> {
		await this.setSetting(SETTING_KEYS.SILENCE_SKIP_THRESHOLD, value);
	}

	observeSilenceSkipThreshold() {
		return this.observeSetting<number>(SETTING_KEYS.SILENCE_SKIP_THRESHOLD, -40);
	}

	async getSilenceSkipMinDuration(): Promise<number> {
		return this.getSetting<number>(SETTING_KEYS.SILENCE_SKIP_MIN_DURATION, 300);
	}

	async setSilenceSkipMinDuration(value: number): Promise<void> {
		await this.setSetting(SETTING_KEYS.SILENCE_SKIP_MIN_DURATION, value);
	}

	observeSilenceSkipMinDuration() {
		return this.observeSetting<number>(SETTING_KEYS.SILENCE_SKIP_MIN_DURATION, 300);
	}

	async getDefaultPlaybackSpeed(): Promise<number> {
		return this.getSetting<number>(SETTING_KEYS.DEFAULT_PLAYBACK_SPEED, 1.0);
	}

	async setDefaultPlaybackSpeed(value: number): Promise<void> {
		await this.setSetting(SETTING_KEYS.DEFAULT_PLAYBACK_SPEED, value);
	}

	observeDefaultPlaybackSpeed() {
		return this.observeSetting<number>(SETTING_KEYS.DEFAULT_PLAYBACK_SPEED, 1.0);
	}

	async getTheme(): Promise<string> {
		return this.getSetting<string>(SETTING_KEYS.THEME, 'system');
	}

	async setTheme(value: string): Promise<void> {
		await this.setSetting(SETTING_KEYS.THEME, value);
	}

	observeTheme() {
		return this.observeSetting<string>(SETTING_KEYS.THEME, 'system');
	}
}

export const settingsService = new SettingsService();
