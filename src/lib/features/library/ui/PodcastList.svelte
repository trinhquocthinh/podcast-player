<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/core/db';
	import PodcastCard from './PodcastCard.svelte';

	let podcasts = liveQuery(() => db.podcasts.toArray());
</script>

<div class="podcast-list">
	<h3>Thư viện Podcast</h3>

	{#if $podcasts === undefined}
		<p class="loading">Đang tải...</p>
	{:else if $podcasts.length === 0}
		<div class="empty-state">
			<p>Bạn chưa thêm Podcast nào.</p>
		</div>
	{:else}
		<div class="grid">
			{#each $podcasts as podcast (podcast.feedUrl)}
				<PodcastCard {podcast} />
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
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1.5rem;
	}
</style>
