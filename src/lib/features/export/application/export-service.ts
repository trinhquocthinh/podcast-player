import {
	db,
	type Podcast,
	type Track,
	type Bookmark,
	type Setting,
	type PlaybackState
} from '$lib/core/db';
import { formatTimestamp } from '$lib/core/utils/time';

// --- JSON EXPORT (Bookmarks) ---

export async function exportBookmarksJson(trackId: string): Promise<string> {
	const track = await db.tracks.get(trackId);
	const bookmarks = await db.bookmarks.where('trackId').equals(trackId).sortBy('timestampStart');

	if (!track) throw new Error('Track not found');

	const data = {
		track: { id: track.id, title: track.title },
		bookmarks
	};
	return JSON.stringify(data, null, 2);
}

export async function exportAllBookmarksJson(): Promise<string> {
	const bookmarks = await db.bookmarks.toArray();
	return JSON.stringify(bookmarks, null, 2);
}

// --- BACKUP & RESTORE ---

export interface BackupData {
	version: number;
	timestamp: string;
	data: {
		podcasts: Podcast[];
		tracks: Omit<Track, 'audioBlob' | 'coverBlob'>[];
		bookmarks: Bookmark[];
		settings: Setting[];
		playbackState: PlaybackState[];
	};
}

export async function exportFullBackup(): Promise<string> {
	const podcasts = await db.podcasts.toArray();
	const tracksRaw = await db.tracks.toArray();
	const bookmarks = await db.bookmarks.toArray();
	const settings = await db.settings.toArray();
	const playbackState = await db.playbackState.toArray();

	const tracks = tracksRaw.map((t) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { audioBlob, coverBlob, ...rest } = t;
		return rest;
	});

	const backup: BackupData = {
		version: 1,
		timestamp: new Date().toISOString(),
		data: { podcasts, tracks, bookmarks, settings, playbackState }
	};

	return JSON.stringify(backup, null, 2);
}

export async function importFullBackup(jsonString: string): Promise<void> {
	let backup: BackupData;
	try {
		backup = JSON.parse(jsonString);
	} catch (e) {
		throw new Error('File không đúng định dạng JSON.', { cause: e });
	}

	if (!backup.data || !backup.version) {
		throw new Error('File không phải là file backup hợp lệ của FocusCast.');
	}

	const { podcasts, tracks, bookmarks, settings, playbackState } = backup.data;

	await db.transaction(
		'rw',
		db.podcasts,
		db.tracks,
		db.bookmarks,
		db.settings,
		db.playbackState,
		async () => {
			// Option 1: Upsert (Ghi đè hoặc thêm mới an toàn, không làm mất blobs)

			if (podcasts && podcasts.length > 0) {
				await db.podcasts.bulkPut(podcasts);
			}

			if (tracks && tracks.length > 0) {
				for (const track of tracks) {
					const existing = await db.tracks.get(track.id);
					if (existing) {
						// Khôi phục metadata, giữ lại blob của track hiện hành
						await db.tracks.put({
							...track,
							audioBlob: existing.audioBlob,
							coverBlob: existing.coverBlob
						});
					} else {
						await db.tracks.put(track);
					}
				}
			}

			if (bookmarks && bookmarks.length > 0) {
				await db.bookmarks.bulkPut(bookmarks);
			}

			if (settings && settings.length > 0) {
				await db.settings.bulkPut(settings);
			}

			if (playbackState && playbackState.length > 0) {
				await db.playbackState.bulkPut(playbackState);
			}
		}
	);
}

export async function exportBookmarksMarkdown(trackId: string): Promise<string> {
	const track = await db.tracks.get(trackId);
	const podcast = track?.podcastFeedUrl ? await db.podcasts.get(track.podcastFeedUrl) : null;
	const bookmarks = await db.bookmarks.where('trackId').equals(trackId).sortBy('timestampStart');

	if (!track) throw new Error('Track not found');

	let md = `# ${track.title}\n`;
	md += `**Podcast:** ${podcast?.title || 'Local File'}\n`;
	md += `**Author:** ${podcast?.author || 'Unknown'}\n`;
	md += `**Ngày xuất:** ${new Date().toISOString()}\n`;
	md += `**Tổng Bookmark:** ${bookmarks.length}\n\n`;
	md += `---\n\n`;

	bookmarks.forEach((bm, idx) => {
		const timeLabel = bm.timestampEnd
			? `${formatTimestamp(bm.timestampStart)} - ${formatTimestamp(bm.timestampEnd)}`
			: formatTimestamp(bm.timestampStart);

		md += `## [${timeLabel}] Bookmark #${idx + 1}\n`;
		md += `${bm.note || '_(Không có ghi chú)_'}\n\n`;
	});

	return md;
}

export async function exportAllBookmarksMarkdown(): Promise<string> {
	const tracksWithBookmarks = new Set((await db.bookmarks.toArray()).map((b) => b.trackId));
	let allMd = `# All Podcast Bookmarks\n**Ngày xuất:** ${new Date().toISOString()}\n\n---\n\n`;

	for (const trackId of tracksWithBookmarks) {
		try {
			const md = await exportBookmarksMarkdown(trackId);
			allMd += md + `\n---\n\n`;
		} catch (error) {
			console.warn(`Failed to export bookmarks for track ${trackId}`, error);
		}
	}

	return allMd;
}

export async function copyToClipboard(text: string): Promise<void> {
	if (!navigator.clipboard) {
		throw new Error('Clipboard API is not available');
	}
	await navigator.clipboard.writeText(text);
}

export function downloadFile(
	content: string,
	filename: string,
	format: 'markdown' | 'txt' = 'markdown'
): void {
	const mimeType =
		format === 'markdown' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
