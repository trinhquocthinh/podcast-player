<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db, type Track } from '$lib/core/db';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { formatTimestamp } from '$lib/core/utils/time';

	// Get all tracks with sourceType = 'local'
	let localTracks = liveQuery(() => db.tracks.where('sourceType').equals('local').toArray());

	function playTrack(track: Track) {
		player.selectTrack(track);
	}
</script>

{#if $localTracks && $localTracks.length > 0}
	<div class="local-track-list">
		<h3>File Âm thanh cục bộ</h3>
		<div class="track-grid">
			{#each $localTracks as track (track.id)}
				<div class="track-card">
					<div class="track-info">
						<h4 title={track.title}>{track.title}</h4>
						<span class="meta">
							{formatTimestamp(track.duration)} • {track.fileSize
								? Math.round(track.fileSize / (1024 * 1024))
								: 0}MB
						</span>
					</div>
					<button class="play-btn" onclick={() => playTrack(track)} title="Play">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polygon points="5 3 19 12 5 21 5 3"></polygon>
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.local-track-list {
		margin-top: 2rem;
	}
	h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		font-size: 1.2rem;
		color: var(--text-1, #f3f4f6);
	}
	.track-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}
	.track-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--surface-2, #1f2937);
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	.track-info {
		flex: 1;
		min-width: 0;
		margin-right: 1rem;
	}
	.track-info h4 {
		margin: 0 0 4px 0;
		font-size: 1rem;
		color: var(--text-1, #f3f4f6);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
	}
	.play-btn {
		background: var(--primary, #3b82f6);
		color: white;
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.1s;
		flex-shrink: 0;
	}
	.play-btn:hover {
		background: var(--primary-hover, #2563eb);
		transform: scale(1.05);
	}
</style>
