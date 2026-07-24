<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db } from '$lib/core/db';
	import { EpisodeList } from '$lib/features/library';

	let { data } = $props();
	// Must decode because +page.ts might receive encoded URL string
	const feedUrl = decodeURIComponent(data.feedUrl);

	let podcast = liveQuery(() => db.podcasts.get(feedUrl));
</script>

<div class="podcast-detail">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href="/" class="back-link">&larr; Quay lại Thư viện</a>

	{#if $podcast === undefined}
		<p class="loading">Đang tải thông tin podcast...</p>
	{:else if $podcast === null}
		<p class="error">Không tìm thấy Podcast này trong thư viện.</p>
	{:else}
		<div class="header">
			<img src={$podcast.coverImage} alt={$podcast.title} />
			<div class="info">
				<h1>{$podcast.title}</h1>
				<p class="author">{$podcast.author}</p>
				<p class="description">{$podcast.description}</p>
			</div>
		</div>

		<EpisodeList feedUrl={$podcast.feedUrl} podcastCover={$podcast.coverImage} />
	{/if}
</div>

<style>
	.podcast-detail {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	.back-link {
		display: inline-block;
		margin-bottom: 2rem;
		color: var(--primary, #3b82f6);
		text-decoration: none;
		font-weight: 500;
	}
	.back-link:hover {
		text-decoration: underline;
	}
	.header {
		display: flex;
		gap: 2rem;
		margin-bottom: 3rem;
		align-items: flex-start;
	}
	img {
		width: 200px;
		height: 200px;
		border-radius: 8px;
		object-fit: cover;
		background: var(--surface-2, #1f2937);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	.info h1 {
		margin: 0 0 0.5rem 0;
		color: var(--text-1, #f3f4f6);
		font-size: 2rem;
	}
	.author {
		color: var(--text-2, #9ca3af);
		font-weight: 500;
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}
	.description {
		line-height: 1.6;
		color: var(--text-2, #9ca3af);
		font-size: 0.95rem;
	}
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			gap: 1rem;
		}
	}
	.loading {
		color: var(--text-2, #9ca3af);
	}
	.error {
		color: var(--danger, #ef4444);
		background: rgba(239, 68, 68, 0.1);
		padding: 1rem;
		border-radius: 6px;
	}
</style>
