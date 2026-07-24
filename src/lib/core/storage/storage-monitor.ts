import { db } from '$lib/core/db';
import { browser } from '$app/environment';

export interface StorageInfo {
	usage: number; // in bytes
	quota: number; // in bytes
	usagePercentage: number; // 0 to 100
	status: 'normal' | 'warning' | 'critical';
}

export async function getStorageInfo(): Promise<StorageInfo> {
	if (!browser || !navigator.storage || !navigator.storage.estimate) {
		return { usage: 0, quota: 100, usagePercentage: 0, status: 'normal' };
	}

	try {
		const estimate = await navigator.storage.estimate();
		const usage = estimate.usage || 0;
		const quota = estimate.quota || 1; // avoid division by zero
		const usagePercentage = (usage / quota) * 100;

		let status: 'normal' | 'warning' | 'critical' = 'normal';
		if (usagePercentage >= 95) {
			status = 'critical';
		} else if (usagePercentage >= 80) {
			status = 'warning';
		}

		return { usage, quota, usagePercentage, status };
	} catch (error) {
		console.error('Failed to estimate storage', error);
		return { usage: 0, quota: 100, usagePercentage: 0, status: 'normal' };
	}
}

export async function canDownloadOffline(): Promise<boolean> {
	const info = await getStorageInfo();
	return info.status !== 'critical';
}

export async function clearAudioCache(trackId: string): Promise<void> {
	await db.tracks.update(trackId, { audioBlob: undefined, offlineAvailable: false });
}

export async function autoCleanupFIFO(): Promise<{ clearedTracks: number; bytesFreed: number }> {
	let clearedTracks = 0;
	let bytesFreed = 0;

	// Find tracks that have an audioBlob
	const cachedTracks = await db.tracks.filter((t) => !!t.audioBlob).toArray();

	if (cachedTracks.length === 0) return { clearedTracks, bytesFreed };

	// Find tracks with bookmarks to exclude them from being deleted first
	const allBookmarks = await db.bookmarks.toArray();
	const bookmarkedTrackIds = new Set(allBookmarks.map((b) => b.trackId));

	// Sort tracks: prioritize deleting non-bookmarked tracks, then by lastPlayedAt (oldest first)
	cachedTracks.sort((a, b) => {
		const aHasBookmark = bookmarkedTrackIds.has(a.id);
		const bHasBookmark = bookmarkedTrackIds.has(b.id);

		if (aHasBookmark && !bHasBookmark) return 1;
		if (!aHasBookmark && bHasBookmark) return -1;

		const dateA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
		const dateB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
		return dateA - dateB;
	});

	// For auto-cleanup, we'll try to free up at least 20% of quota if possible
	const info = await getStorageInfo();
	const targetUsage = info.quota * 0.75; // Try to get down to 75%
	let currentUsage = info.usage;

	for (const track of cachedTracks) {
		if (currentUsage <= targetUsage) break;

		const blobSize = track.audioBlob?.size || 0;
		await clearAudioCache(track.id);

		clearedTracks++;
		bytesFreed += blobSize;
		currentUsage -= blobSize;
	}

	return { clearedTracks, bytesFreed };
}

export async function clearAllAudioCache(): Promise<number> {
	let clearedTracks = 0;
	const cachedTracks = await db.tracks.filter((t) => !!t.audioBlob).toArray();
	for (const track of cachedTracks) {
		await clearAudioCache(track.id);
		clearedTracks++;
	}
	return clearedTracks;
}

export async function clearUnbookmarkedAudioCache(): Promise<number> {
	let clearedTracks = 0;
	const cachedTracks = await db.tracks.filter((t) => !!t.audioBlob).toArray();
	const allBookmarks = await db.bookmarks.toArray();
	const bookmarkedTrackIds = new Set(allBookmarks.map((b) => b.trackId));

	for (const track of cachedTracks) {
		if (!bookmarkedTrackIds.has(track.id)) {
			await clearAudioCache(track.id);
			clearedTracks++;
		}
	}
	return clearedTracks;
}
