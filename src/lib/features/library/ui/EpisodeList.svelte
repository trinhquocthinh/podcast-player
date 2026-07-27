<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/core/db';
	import EpisodeCard from './EpisodeCard.svelte';
	import { Filter } from 'lucide-svelte';

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

<div class="px-6 flex flex-col gap-4">
	<div class="flex items-center justify-between mb-2">
		<h3 class="font-bold text-white text-lg">Tất cả các tập</h3>
		<button class="text-slate-400 hover:text-indigo-400 transition text-sm flex items-center gap-1">
			<Filter class="w-4 h-4" /> Mới nhất
		</button>
	</div>

	{#if $episodes === undefined}
		<p class="text-slate-400">Đang tải...</p>
	{:else if $episodes.length === 0}
		<div class="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-700/50">
			<p class="text-slate-400">Không có tập nào được tìm thấy.</p>
		</div>
	{:else}
		{#each $episodes as episode (episode.id)}
			<EpisodeCard {episode} {podcastCover} />
		{/each}
	{/if}
</div>
