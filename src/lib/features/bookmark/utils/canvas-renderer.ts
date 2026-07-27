import type { Bookmark, Track, Podcast } from '$lib/core/db';
import { formatTimestamp } from '$lib/core/utils/time';

/**
 * Wraps text into multiple lines and draws it on the canvas.
 * @returns The new Y position after drawing the text.
 */
export function wrapText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number,
	draw: boolean = true
): number {
	if (!text) return y;

	const paragraphs = text.split('\n');
	let currentY = y;

	for (let i = 0; i < paragraphs.length; i++) {
		const paragraph = paragraphs[i];
		const words = paragraph.split(' ');
		let line = '';

		for (let n = 0; n < words.length; n++) {
			const testLine = line + words[n] + ' ';
			const metrics = context.measureText(testLine);
			const testWidth = metrics.width;
			if (testWidth > maxWidth && n > 0) {
				if (draw) context.fillText(line, x, currentY);
				line = words[n] + ' ';
				currentY += lineHeight;
			} else {
				line = testLine;
			}
		}
		if (draw) context.fillText(line, x, currentY);
		currentY += lineHeight;
	}

	return currentY;
}

export async function renderBookmarkToDataURL(
	bookmark: Bookmark,
	track: Track,
	podcast?: Podcast
): Promise<string> {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		const width = 1080;
		// Start with an estimated height, adjust if content overflows
		let height = 1080;
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			throw new Error('Canvas 2D context not available');
		}

		const padding = 100;
		const maxWidth = width - padding * 2;

		// Calculate required height based on note
		ctx.font = '36px "Inter", "Helvetica", "Arial", sans-serif'; // Note font
		const noteLineHeight = 56;

		const estimatedNoteHeight = wrapText(
			ctx,
			bookmark.note || '',
			padding,
			0,
			maxWidth,
			noteLineHeight,
			false
		);
		const requiredHeight = padding * 2 + 100 + 120 + 80 + estimatedNoteHeight + 100;
		if (requiredHeight > height) {
			height = requiredHeight;
			canvas.height = height;
		}

		// Re-get context or reset font as resizing canvas resets state
		ctx.fillStyle = '#1A1A1D'; // Dark background
		ctx.fillRect(0, 0, width, height);

		// Draw gradient overlay
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, '#2b1055'); // Deep purple
		gradient.addColorStop(1, '#0b001a'); // Darker purple
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		let currentY = padding + 40;

		// 1. Podcast Name
		const podcastName = podcast?.title || 'Unknown Podcast';
		ctx.font = 'bold 36px "Inter", sans-serif';
		ctx.fillStyle = '#A899C6'; // Soft purple/grey
		currentY = wrapText(ctx, podcastName.toUpperCase(), padding, currentY, maxWidth, 48);

		currentY += 20;

		// 2. Track Title
		const trackTitle = track.title || 'Unknown Episode';
		ctx.font = 'bold 54px "Inter", sans-serif';
		ctx.fillStyle = '#FFFFFF';
		currentY = wrapText(ctx, trackTitle, padding, currentY, maxWidth, 64);

		currentY += 40;

		// 3. Timestamp
		const timestamp = formatTimestamp(bookmark.timestampStart);
		ctx.font = '36px "Inter", monospace';
		ctx.fillStyle = '#4A90E2';

		// Draw icon manually (a simple triangle for play icon)
		ctx.beginPath();
		ctx.moveTo(padding, currentY - 24);
		ctx.lineTo(padding + 20, currentY - 14);
		ctx.lineTo(padding, currentY - 4);
		ctx.fill();

		ctx.fillText(timestamp, padding + 36, currentY);

		currentY += 80;

		// 4. Note Content
		if (bookmark.note) {
			ctx.font = '42px "Inter", sans-serif';
			ctx.fillStyle = '#E0E0E0';

			// Optional: draw a left border line for quote style
			ctx.fillStyle = '#4A90E2';
			const noteHeight =
				wrapText(ctx, bookmark.note, padding, currentY, maxWidth, noteLineHeight, false) - currentY;
			ctx.fillRect(padding - 30, currentY - 32, 6, noteHeight + 20);

			ctx.fillStyle = '#E0E0E0';
			wrapText(ctx, bookmark.note, padding, currentY, maxWidth, noteLineHeight);
		} else {
			ctx.font = 'italic 42px "Inter", sans-serif';
			ctx.fillStyle = '#888888';
			ctx.fillText('No note attached.', padding, currentY);
		}

		// 5. Watermark / Branding at the bottom
		ctx.font = '24px "Inter", sans-serif';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
		ctx.textAlign = 'center';
		ctx.fillText('Shared via Podcast Player', width / 2, height - 50);

		resolve(canvas.toDataURL('image/png'));
	});
}
