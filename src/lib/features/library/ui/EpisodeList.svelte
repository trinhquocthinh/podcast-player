<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/core/db';
	import EpisodeCard from './EpisodeCard.svelte';

	let { feedUrl, podcastCover } = $props<{ feedUrl: string; podcastCover?: string }>();

	let episodes = liveQuery(async () => {
		const tracks = await db.tracks.where('podcastFeedUrl').equals(feedUrl).toArray();
		// Sort by publishedAt descending
		return tracks.sort((a, b) => {
			if (!a.publishedAt || !b.publishedAt) return 0;
			return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
		});
	});
</script>

<div class="episode-list">
	<h3>Danh sách tập</h3>

	{#if $episodes === undefined}
		<p class="loading">Đang tải...</p>
	{:else if $episodes.length === 0}
		<div class="empty-state">
			<p>Không có tập nào được tìm thấy.</p>
		</div>
	{:else}
		<div class="list">
			{#each $episodes as episode (episode.id)}
				<EpisodeCard {episode} {podcastCover} />
			{/each}
		</div>
	{/if}
</div>

<style>
	h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		font-size: 1.2rem;
		color: var(--text-1, #f3f4f6);
	}
	.loading {
		color: var(--text-2, #9ca3af);
	}
	.empty-state {
		padding: 2rem;
		text-align: center;
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		color: var(--text-2, #9ca3af);
	}
	.list {
		display: flex;
		flex-direction: column;
	}
</style>
