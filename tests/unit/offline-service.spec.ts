import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '$lib/core/db';
import { OfflineService } from '$lib/features/library/infrastructure/offline-service';
import * as storageMonitor from '$lib/core/storage/storage-monitor';

// Mock canDownloadOffline
vi.mock('$lib/core/storage/storage-monitor', () => ({
	canDownloadOffline: vi.fn().mockResolvedValue(true)
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OfflineService', () => {
	let offlineService: OfflineService;

	beforeEach(async () => {
		offlineService = new OfflineService();
		vi.clearAllMocks();
		await db.tracks.clear();

		// Add a mock track
		await db.tracks.add({
			id: 'track-1',
			title: 'Test Track',
			audioUrl: 'https://example.com/audio.mp3',
			duration: 100,
			sourceType: 'rss',
			offlineAvailable: false
		});
	});

	it('should throw error if storage is critical', async () => {
		vi.mocked(storageMonitor.canDownloadOffline).mockResolvedValueOnce(false);

		await expect(offlineService.downloadEpisodeForOffline('track-1')).rejects.toThrowError(
			/Không đủ dung lượng lưu trữ/
		);
	});

	it('should download and save audioBlob successfully', async () => {
		// Mock a successful fetch response with a stream
		const mockReader = {
			read: vi
				.fn()
				.mockResolvedValueOnce({ done: false, value: new Uint8Array([1, 2, 3]) })
				.mockResolvedValueOnce({ done: true, value: undefined })
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			headers: new Headers({
				'Content-Length': '3',
				'Content-Type': 'audio/mpeg'
			}),
			body: {
				getReader: () => mockReader
			}
		});

		let progress = 0;
		await offlineService.downloadEpisodeForOffline('track-1', (p) => {
			progress = p;
		});

		expect(progress).toBe(100);

		const updatedTrack = await db.tracks.get('track-1');
		expect(updatedTrack?.offlineAvailable).toBe(true);
		expect(updatedTrack?.audioBlob).toBeDefined();
		expect(updatedTrack?.audioBlob?.size).toBe(3);
		expect(updatedTrack?.fileSize).toBe(3);
	});

	it('should abort download correctly', async () => {
		let rejectRead: (e: Error) => void;
		const mockReader = {
			read: vi.fn().mockImplementation(() => {
				return new Promise((resolve, reject) => {
					rejectRead = reject;
				});
			})
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			headers: new Headers({
				'Content-Length': '10',
				'Content-Type': 'audio/mpeg'
			}),
			body: {
				getReader: () => mockReader
			}
		});

		// Trigger download without awaiting
		const downloadPromise = offlineService.downloadEpisodeForOffline('track-1');

		// Wait for microtasks to flush so abortController is set
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(offlineService.isDownloading('track-1')).toBe(true);

		// Throw AbortError from fetch when we cancel (this normally happens natively, but we need to mock it if fetch is mocked)
		offlineService.cancelDownload('track-1');
		rejectRead!(Object.assign(new Error('The operation was aborted. '), { name: 'AbortError' }));

		await expect(downloadPromise).rejects.toThrowError(/Đã huỷ tải xuống/);
		expect(offlineService.isDownloading('track-1')).toBe(false);

		const track = await db.tracks.get('track-1');
		expect(track?.offlineAvailable).toBe(false);
		expect(track?.audioBlob).toBeUndefined();
	});

	it('should remove offline episode correctly', async () => {
		await db.tracks.update('track-1', {
			offlineAvailable: true,
			audioBlob: new Blob(['abc']),
			fileSize: 3
		});

		await offlineService.removeOfflineEpisode('track-1');

		const updatedTrack = await db.tracks.get('track-1');
		expect(updatedTrack?.offlineAvailable).toBe(false);
		expect(updatedTrack?.audioBlob).toBeUndefined();
		expect(updatedTrack?.fileSize).toBeUndefined();
	});
});
