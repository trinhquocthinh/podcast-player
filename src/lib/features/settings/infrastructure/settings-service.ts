import { db } from '$lib/core/db';
import { liveQuery } from 'dexie';

export type PostBookmarkAction = 'CONTINUE' | 'PAUSE_FOR_NOTE';

export const SETTING_KEYS = {
	BOOKMARK_POST_ACTION: 'bookmark_post_action'
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
}

export const settingsService = new SettingsService();
