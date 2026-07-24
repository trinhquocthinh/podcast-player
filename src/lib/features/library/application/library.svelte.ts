import { db, type Track } from '$lib/core/db';
import { addFeed, refreshFeed } from '../infrastructure/feed-client';
import { parseLocalFile } from '../infrastructure/local-parser';
import { generateId } from '$lib/core/utils/uuid';
import { AppError } from '$lib/core/types/errors';

export class LibraryState {
	/**
	 * Adds a new podcast from RSS feed url or Apple Podcasts link.
	 * Apple Podcasts links are auto-resolved to RSS feed URL by the server.
	 * Checks for duplicates (BR-SRC-003).
	 */
	async addPodcast(url: string): Promise<void> {
		// 2. Fetch feed (server resolves Apple Podcasts links → RSS URL)
		const { podcast, episodes } = await addFeed(url);

		// feedUrl from API is the actual RSS feed URL (resolved if needed)
		const resolvedFeedUrl = podcast.feedUrl;

		// 1. Check if feedUrl already exists (use resolved URL)
		const existing = await db.podcasts.get(resolvedFeedUrl);
		if (existing) {
			throw new AppError(
				'ALREADY_EXISTS',
				'Podcast đã tồn tại trong thư viện. Vui lòng sử dụng tính năng Làm mới.',
				{ feedUrl: resolvedFeedUrl }
			);
		}

		// 3. Save to DB within transaction
		await db.transaction('rw', db.podcasts, db.tracks, async () => {
			await db.podcasts.add(podcast);
			for (const ep of episodes) {
				const existingTrack = await db.tracks.get(ep.id);
				if (!existingTrack) {
					await db.tracks.add({
						...ep,
						podcastFeedUrl: resolvedFeedUrl,
						sourceType: 'rss',
						offlineAvailable: false
					});
				}
			}
		});
	}

	/**
	 * Refreshes an existing podcast to get new episodes.
	 */
	async refreshPodcast(feedUrl: string): Promise<number> {
		const { episodes, lastFetched } = await refreshFeed(feedUrl);

		let addedCount = 0;
		await db.transaction('rw', db.podcasts, db.tracks, async () => {
			for (const ep of episodes) {
				const existingTrack = await db.tracks.get(ep.id);
				if (!existingTrack) {
					await db.tracks.add({
						...ep,
						podcastFeedUrl: feedUrl,
						sourceType: 'rss',
						offlineAvailable: false
					});
					addedCount++;
				}
			}
			await db.podcasts.update(feedUrl, { lastFetched });
		});
		return addedCount;
	}

	/**
	 * Imports a local audio file into the library.
	 * Checks for duplicates (BR-SRC-003).
	 * Returns warning string if file > 500MB (BR-SRC-002).
	 */
	async addLocalFile(file: File): Promise<{ id: string; warning?: string }> {
		// BR-SRC-002: Cảnh báo file > 500MB (chỉ cảnh báo, không chặn)
		const MAX_WARN_SIZE = 500 * 1024 * 1024; // 500MB
		let warning: string | undefined;
		if (file.size > MAX_WARN_SIZE) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
			warning = `File có dung lượng ${sizeMB}MB. File quá lớn có thể ảnh hưởng hiệu năng và vượt giới hạn lưu trữ trình duyệt.`;
		}

		// BR-SRC-003 Duplicate check: file_name + file_size
		const localTracks = await db.tracks.where('sourceType').equals('local').toArray();
		const isDuplicate = localTracks.some(
			(t) => t.title === file.name.replace(/\.[^/.]+$/, '') && t.fileSize === file.size
		);

		if (isDuplicate) {
			throw new AppError('ALREADY_EXISTS', 'File audio này dường như đã được thêm vào thư viện.');
		}

		const { track, coverBlob } = await parseLocalFile(file);

		const id = generateId();

		// CRITICAL: Lưu Blob thực tế vào IndexedDB, KHÔNG lưu blob: URL.
		// blob: URL chỉ tồn tại trong phiên trình duyệt hiện tại,
		// sẽ thành link chết khi user đóng tab và mở lại.
		// URL.createObjectURL() chỉ được gọi on-the-fly tại Player khi phát.
		await db.tracks.add({
			...track,
			id,
			audioUrl: '', // Không dùng blob URL — Player sẽ tạo on-the-fly từ audioBlob
			audioBlob: file, // Lưu File object (kế thừa Blob) trực tiếp
			coverBlob, // Lưu cover image blob nếu có
			podcastFeedUrl: undefined, // Explicitly undefined for local files
			sourceType: 'local',
			offlineAvailable: true
		} as Track);

		return { id, warning };
	}
}

export const library = new LibraryState();
