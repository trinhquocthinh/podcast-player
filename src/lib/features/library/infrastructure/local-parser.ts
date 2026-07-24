import * as mm from 'music-metadata-browser';
import type { Track } from '$lib/core/db';

export async function parseLocalFile(
	file: File
): Promise<{ track: Partial<Track>; coverBlob?: Blob }> {
	// Size limit 500MB (BR-SRC-003 constraint warning)
	if (file.size > 500 * 1024 * 1024) {
		console.warn('File size exceeds 500MB, which might cause performance issues.');
	}

	try {
		const metadata = await mm.parseBlob(file);

		let coverBlob: Blob | undefined;
		if (metadata.common.picture && metadata.common.picture.length > 0) {
			const picture = metadata.common.picture[0];
			coverBlob = new Blob([picture.data], { type: picture.format });
		}

		const title = metadata.common.title || file.name.replace(/\.[^/.]+$/, '');
		const duration = metadata.format.duration || 0;

		return {
			track: {
				title,
				description: metadata.common.artist || '',
				duration,
				sourceType: 'local',
				offlineAvailable: true,
				fileSize: file.size
			},
			coverBlob
		};
	} catch (error) {
		console.warn('Failed to parse metadata, using fallback', error);
		return {
			track: {
				title: file.name.replace(/\.[^/.]+$/, ''),
				duration: 0,
				sourceType: 'local',
				offlineAvailable: true,
				fileSize: file.size
			}
		};
	}
}
