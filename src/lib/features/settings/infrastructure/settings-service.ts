import { db } from '$lib/core/db';
import { liveQuery } from 'dexie';

export type PostBookmarkAction = 'CONTINUE' | 'PAUSE_FOR_NOTE';

export const SETTING_KEYS = {
	BOOKMARK_POST_ACTION: 'bookmark_post_action',
	SILENCE_SKIP_THRESHOLD: 'silence_skip_threshold',
	SILENCE_SKIP_MIN_DURATION: 'silence_skip_min_duration',
	DEFAULT_PLAYBACK_SPEED: 'default_playback_speed',
	THEME: 'theme',
	// Cloud Sync (Sub-phase 10.4)
	CLOUD_SYNC_ENABLED: 'cloud_sync_enabled',
	CLOUD_SYNC_PROVIDER: 'cloud_sync_provider',
	CLOUD_SYNC_PASSPHRASE_TOKEN: 'cloud_sync_passphrase_token',
	CLOUD_SYNC_LAST_SYNC: 'cloud_sync_last_sync',
	// AI Assist (Sub-phase 10.5)
	AI_ASSIST_ENABLED: 'ai_assist_enabled',
	AI_USE_CLOUD: 'ai_use_cloud',
	AI_CLOUD_API_KEY: 'ai_cloud_api_key'
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

	// --- Cloud Sync Settings (Sub-phase 10.4) ---

	async isCloudSyncEnabled(): Promise<boolean> {
		return this.getSetting<boolean>(SETTING_KEYS.CLOUD_SYNC_ENABLED, false);
	}

	async setCloudSyncEnabled(value: boolean): Promise<void> {
		await this.setSetting(SETTING_KEYS.CLOUD_SYNC_ENABLED, value);
	}

	observeCloudSyncEnabled() {
		return this.observeSetting<boolean>(SETTING_KEYS.CLOUD_SYNC_ENABLED, false);
	}

	async getCloudSyncProvider(): Promise<string> {
		return this.getSetting<string>(SETTING_KEYS.CLOUD_SYNC_PROVIDER, '');
	}

	async setCloudSyncProvider(value: string): Promise<void> {
		await this.setSetting(SETTING_KEYS.CLOUD_SYNC_PROVIDER, value);
	}

	async getCloudSyncLastSync(): Promise<string | null> {
		return this.getSetting<string | null>(SETTING_KEYS.CLOUD_SYNC_LAST_SYNC, null);
	}

	// --- AI Assist Settings (Sub-phase 10.5) ---

	async isAiAssistEnabled(): Promise<boolean> {
		return this.getSetting<boolean>(SETTING_KEYS.AI_ASSIST_ENABLED, false);
	}

	async setAiAssistEnabled(value: boolean): Promise<void> {
		await this.setSetting(SETTING_KEYS.AI_ASSIST_ENABLED, value);
	}

	observeAiAssistEnabled() {
		return this.observeSetting<boolean>(SETTING_KEYS.AI_ASSIST_ENABLED, false);
	}

	async isAiUseCloud(): Promise<boolean> {
		return this.getSetting<boolean>(SETTING_KEYS.AI_USE_CLOUD, false);
	}

	async setAiUseCloud(value: boolean): Promise<void> {
		await this.setSetting(SETTING_KEYS.AI_USE_CLOUD, value);
	}

	observeAiUseCloud() {
		return this.observeSetting<boolean>(SETTING_KEYS.AI_USE_CLOUD, false);
	}

	async getAiCloudApiKey(): Promise<string> {
		return this.getSetting<string>(SETTING_KEYS.AI_CLOUD_API_KEY, '');
	}

	async setAiCloudApiKey(value: string): Promise<void> {
		await this.setSetting(SETTING_KEYS.AI_CLOUD_API_KEY, value);
	}

	observeAiCloudApiKey() {
		return this.observeSetting<string>(SETTING_KEYS.AI_CLOUD_API_KEY, '');
	}
}

export const settingsService = new SettingsService();
