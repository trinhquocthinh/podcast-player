<script lang="ts">
	import type { Track } from '$lib/core/db';
	import { formatDuration } from '$lib/core/utils/time';
	import { player } from '$lib/features/playback/application/player.svelte';

	let { episode, podcastCover } = $props<{ episode: Track; podcastCover?: string }>();

	function handlePlay() {
		// Delegate cho Player layer — xử lý blob URL on-the-fly cho local files
		player.selectTrack(episode);
	}
</script>

<div class="episode-card">
	<div class="header">
		{#if podcastCover}
			<img src={podcastCover} alt={episode.title} loading="lazy" class="cover" />
		{/if}
		<div class="info">
			<h4>{episode.title}</h4>
			<div class="meta">
				{#if episode.publishedAt}
					<span>{new Date(episode.publishedAt).toLocaleDateString()}</span>
					<span class="dot">•</span>
				{/if}
				<span>{formatDuration(episode.duration)}</span>
			</div>
		</div>
	</div>

	{#if episode.description}
		<p class="description">{episode.description}</p>
	{/if}

	<div class="actions">
		<button onclick={handlePlay} class="play-btn">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5v14l11-7z" />
			</svg>
			Phát
		</button>

		{#if episode.offlineAvailable}
			<span class="badge">Đã tải về</span>
		{/if}
	</div>
</div>

<style>
	.episode-card {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		border: 1px solid var(--border, #374151);
	}

	.header {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.cover {
		width: 64px;
		height: 64px;
		border-radius: 4px;
		object-fit: cover;
		background: var(--surface-3, #374151);
	}

	.info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		color: var(--text-1, #f3f4f6);
	}

	.meta {
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dot {
		font-size: 0.5rem;
	}

	.description {
		font-size: 0.9rem;
		color: var(--text-2, #9ca3af);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.play-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--primary, #3b82f6);
		color: white;
		border: none;
		border-radius: 999px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	.play-btn:hover {
		background: var(--primary-hover, #2563eb);
	}

	.play-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.badge {
		font-size: 0.75rem;
		background: var(--surface-3, #374151);
		color: var(--text-2, #9ca3af);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}
</style>
