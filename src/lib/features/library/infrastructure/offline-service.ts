import { db } from '$lib/core/db';
import { canDownloadOffline } from '$lib/core/storage/storage-monitor';

export class OfflineDownloadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OfflineDownloadError';
	}
}

export type DownloadProgressCallback = (progressPercentage: number) => void;

export class OfflineService {
	private abortControllers = new Map<string, AbortController>();

	/**
	 * Tải một tập tin RSS episode về máy.
	 */
	async downloadEpisodeForOffline(
		trackId: string,
		onProgress?: DownloadProgressCallback
	): Promise<void> {
		if (!(await canDownloadOffline())) {
			throw new OfflineDownloadError('Không đủ dung lượng lưu trữ (Storage Critical).');
		}

		const track = await db.tracks.get(trackId);
		if (!track) {
			throw new OfflineDownloadError('Không tìm thấy track.');
		}
		if (track.sourceType === 'local') {
			throw new OfflineDownloadError('Track local đã có sẵn offline.');
		}
		if (track.offlineAvailable && track.audioBlob) {
			return; // Đã tải rồi
		}

		const controller = new AbortController();
		this.abortControllers.set(trackId, controller);

		try {
			// Sử dụng proxy để bypass CORS
			const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(track.audioUrl)}`;
			const response = await fetch(proxyUrl, {
				signal: controller.signal
			});

			if (!response.ok) {
				throw new OfflineDownloadError(`Lỗi HTTP: ${response.status} ${response.statusText}`);
			}

			if (!response.body) {
				throw new OfflineDownloadError('Không thể đọc dữ liệu.');
			}

			const contentLengthHeader = response.headers.get('Content-Length');
			const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
			let receivedBytes = 0;

			const reader = response.body.getReader();
			const chunks: Uint8Array[] = [];

			while (true) {
				const { done, value } = await reader.read();

				if (done) break;

				if (value) {
					chunks.push(value);
					receivedBytes += value.length;
					if (totalBytes > 0 && onProgress) {
						const percentage = Math.round((receivedBytes / totalBytes) * 100);
						onProgress(Math.min(percentage, 100)); // Không vượt quá 100%
					}
				}
			}

			// Tạo Blob và lưu vào IndexedDB
			const audioBlob = new Blob(chunks as BlobPart[], {
				type: response.headers.get('Content-Type') || 'audio/mpeg'
			});

			await db.tracks.update(trackId, {
				audioBlob,
				offlineAvailable: true,
				fileSize: audioBlob.size
			});
		} catch (error) {
			const err = error as Error;
			if (err.name === 'AbortError') {
				// Đã bị huỷ
				throw new OfflineDownloadError('Đã huỷ tải xuống.');
			}
			throw new OfflineDownloadError(`Lỗi tải xuống: ${err.message || String(err)}`);
		} finally {
			this.abortControllers.delete(trackId);
		}
	}

	/**
	 * Huỷ tải xuống nếu đang chạy.
	 */
	cancelDownload(trackId: string): void {
		const controller = this.abortControllers.get(trackId);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(trackId);
		}
	}

	/**
	 * Kiểm tra xem một track có đang được tải hay không.
	 */
	isDownloading(trackId: string): boolean {
		return this.abortControllers.has(trackId);
	}

	/**
	 * Xoá bản offline của một episode, chỉ xoá audioBlob, giữ lại track và bookmark.
	 */
	async removeOfflineEpisode(trackId: string): Promise<void> {
		this.cancelDownload(trackId); // Hủy nếu đang tải
		await db.tracks.update(trackId, {
			audioBlob: undefined,
			offlineAvailable: false,
			fileSize: undefined
		});
	}
}

export const offlineService = new OfflineService();
