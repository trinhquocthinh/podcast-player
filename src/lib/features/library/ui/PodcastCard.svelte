<script lang="ts">
	import type { Podcast } from '$lib/core/db';
	import { Headphones } from 'lucide-svelte';

	let { podcast } = $props<{ podcast: Podcast }>();
</script>

<a href="/podcast/{encodeURIComponent(podcast.feedUrl)}" class="group cursor-pointer block">
	<div
		class="relative w-full aspect-square rounded-2xl overflow-hidden mb-3 shadow-md shadow-black/20 group-hover:shadow-indigo-500/20 transition-all duration-300 bg-slate-800"
	>
		{#if podcast.coverImage}
			<img
				src={podcast.coverImage}
				alt={podcast.title}
				loading="lazy"
				class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
				onerror={(e) => {
					const img = e.currentTarget as HTMLImageElement;
					img.style.display = 'none';
					if (img.nextElementSibling) {
						(img.nextElementSibling as HTMLElement).style.display = 'flex';
					}
				}}
			/>
			<div class="hidden w-full h-full items-center justify-center bg-slate-800">
				<Headphones class="w-12 h-12 text-slate-600 opacity-50" />
			</div>
		{:else}
			<div class="flex w-full h-full items-center justify-center bg-slate-800">
				<Headphones class="w-12 h-12 text-slate-600 opacity-50" />
			</div>
		{/if}
	</div>
	<h3
		class="font-semibold text-slate-200 text-sm line-clamp-1 group-hover:text-white transition-colors"
	>
		{podcast.title}
	</h3>
	<p class="text-xs text-slate-500 mt-1 line-clamp-1">
		{podcast.author || 'Unknown Author'}
	</p>
</a>
