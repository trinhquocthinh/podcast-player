<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/core/db';
	import PodcastCard from './PodcastCard.svelte';
	import { Plus } from 'lucide-svelte';

	let { onAddClick } = $props<{ onAddClick?: () => void }>();

	let podcasts = liveQuery(() => db.podcasts.toArray());
</script>

<div class="podcast-list">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold text-white">Thư viện Podcast</h2>
	</div>

	{#if $podcasts === undefined}
		<p class="text-slate-400">Đang tải...</p>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-6 gap-4">
			{#each $podcasts as podcast (podcast.feedUrl)}
				<PodcastCard {podcast} />
			{/each}

			<!-- Nút Thêm Feed / File -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div onclick={onAddClick} class="group cursor-pointer flex flex-col">
				<div
					class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center mb-3 group-hover:border-indigo-500 group-hover:bg-indigo-500/10 transition-colors"
				>
					<Plus class="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
				</div>
				<h3
					class="font-semibold text-slate-400 text-sm group-hover:text-indigo-300 transition-colors text-center mt-auto"
				>
					Thêm Feed / File
				</h3>
			</div>
		</div>
	{/if}
</div>
