<script lang="ts">
	import type { Podcast } from '$lib/core/db';

	let { podcast } = $props<{ podcast: Podcast }>();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a href="/podcast/{encodeURIComponent(podcast.feedUrl)}" class="podcast-card">
	{#if podcast.coverImage}
		<img
			src={podcast.coverImage}
			alt={podcast.title}
			loading="lazy"
			onerror={(e) => {
				const img = e.currentTarget as HTMLImageElement;
				img.style.display = 'none';
				if (img.nextElementSibling) {
					(img.nextElementSibling as HTMLElement).style.display = 'flex';
				}
			}}
		/>
		<div class="fallback-cover" style="display: none;">
			<span class="fallback-icon">🎧</span>
		</div>
	{:else}
		<div class="fallback-cover">
			<span class="fallback-icon">🎧</span>
		</div>
	{/if}
	<div class="info">
		<h4>{podcast.title}</h4>
		<p>{podcast.author}</p>
	</div>
</a>

<style>
	.podcast-card {
		display: flex;
		flex-direction: column;
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		overflow: hidden;
		text-decoration: none;
		color: var(--text-1, #f3f4f6);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}
	.podcast-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
	}
	img,
	.fallback-cover {
		width: 100%;
		aspect-ratio: 1 / 1;
		object-fit: cover;
		background: var(--surface-3, #374151);
	}
	.fallback-cover {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fallback-icon {
		font-size: 4rem;
		opacity: 0.5;
	}
	.info {
		padding: 1rem;
	}
	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
