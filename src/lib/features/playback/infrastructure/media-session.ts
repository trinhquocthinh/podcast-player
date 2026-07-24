import type { Track } from '$lib/core/db';
import { browser } from '$app/environment';

export class MediaSessionService {
	constructor(
		private onPlay: () => void,
		private onPause: () => void,
		private onSeek: (time: number) => void,
		private onSeekBackward: () => void,
		private onSeekForward: () => void
	) {
		if (!browser || !('mediaSession' in navigator)) return;

		this.registerActionHandlers();
	}

	private registerActionHandlers() {
		try {
			navigator.mediaSession.setActionHandler('play', () => {
				this.onPlay();
			});
			navigator.mediaSession.setActionHandler('pause', () => {
				this.onPause();
			});
			navigator.mediaSession.setActionHandler('seekbackward', () => {
				// Default is 15 seconds if details.seekOffset is not provided
				if (this.onSeekBackward) this.onSeekBackward();
			});
			navigator.mediaSession.setActionHandler('seekforward', () => {
				// Default is 30 seconds if details.seekOffset is not provided
				if (this.onSeekForward) this.onSeekForward();
			});
			navigator.mediaSession.setActionHandler('previoustrack', () => {
				this.onSeek(0);
			});
			navigator.mediaSession.setActionHandler('seekto', (details) => {
				if (details.seekTime !== undefined && details.seekTime !== null) {
					this.onSeek(details.seekTime);
				}
			});

			// Explicitly disable next track as per PRD
			navigator.mediaSession.setActionHandler('nexttrack', null);
		} catch (error) {
			console.warn('MediaSession API action handlers setup failed', error);
		}
	}

	updateMetadata(track: Track, artworkUrl?: string) {
		if (!browser || !('mediaSession' in navigator)) return;

		const artwork = artworkUrl ? [{ src: artworkUrl, sizes: '512x512', type: 'image/png' }] : [];

		navigator.mediaSession.metadata = new MediaMetadata({
			title: track.title,
			artist: track.sourceType === 'rss' ? 'Podcast' : 'Local File',
			album: track.podcastFeedUrl || 'Unknown',
			artwork
		});
	}

	updatePositionState(position: number, duration: number, playbackRate: number) {
		if (!browser || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState)
			return;

		// Ensure duration and position are valid finite numbers to prevent crashes
		if (
			Number.isFinite(duration) &&
			duration > 0 &&
			Number.isFinite(position) &&
			position >= 0 &&
			position <= duration
		) {
			try {
				navigator.mediaSession.setPositionState({
					duration: duration,
					playbackRate: playbackRate,
					position: position
				});
			} catch (error) {
				console.warn('Failed to set mediaSession position state', error);
			}
		}
	}
}
