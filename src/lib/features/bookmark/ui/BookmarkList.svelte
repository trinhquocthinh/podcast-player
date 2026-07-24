<script lang="ts">
	import type { Bookmark } from '$lib/core/db';
	import { bookmarkService } from '../infrastructure/bookmark-service';
	import BookmarkItem from './BookmarkItem.svelte';

	let { trackId } = $props<{ trackId: string }>();

	let bookmarksObservable = $derived(bookmarkService.getBookmarksByTrack(trackId));
	let bookmarks = $state<Bookmark[]>([]);

	$effect(() => {
		const subscription = bookmarksObservable.subscribe((value) => {
			bookmarks = value;
		});
		return () => subscription.unsubscribe();
	});
</script>

<div class="bookmark-list">
	{#if bookmarks.length === 0}
		<div class="empty-state">
			<svg
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg
			>
			<p>No bookmarks yet.</p>
			<span class="hint">Use the quick bookmark button to mark important moments.</span>
		</div>
	{:else}
		{#each bookmarks as bookmark (bookmark.id)}
			<BookmarkItem {bookmark} />
		{/each}
	{/if}
</div>

<style>
	.bookmark-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 48px 24px;
		color: var(--text-secondary, #aaa);
		text-align: center;
		background: var(--surface-1, #222);
		border-radius: 8px;
		border: 1px dashed var(--border, #444);
	}
	.empty-state svg {
		margin-bottom: 16px;
		opacity: 0.5;
	}
	.empty-state p {
		margin: 0 0 8px 0;
		font-weight: 500;
		color: var(--text-primary, #fff);
	}
	.empty-state .hint {
		font-size: 0.9rem;
	}
</style>
