import { db } from '$lib/core/db';
import { formatTimestamp } from '$lib/core/utils/time';

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
