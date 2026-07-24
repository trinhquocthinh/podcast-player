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
		<div class="list-header">
			<h3>Bookmarks</h3>
			<a href="/export" class="btn-export" title="Export Notes">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
				Export
			</a>
		</div>
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
	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.list-header h3 {
		margin: 0;
		font-size: 1.1rem;
	}
	.btn-export {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		padding: 4px 10px;
		background: var(--bg-secondary, #333);
		color: var(--text-primary, #fff);
		border-radius: 4px;
		text-decoration: none;
		border: 1px solid var(--border-color, #444);
		transition: background 0.2s;
	}
	.btn-export:hover {
		background: var(--bg-hover, #444);
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
