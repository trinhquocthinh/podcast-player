<script lang="ts">
	import EmptyState from '$lib/core/ui/EmptyState.svelte';
	import BookmarkList from '$lib/features/bookmark/ui/BookmarkList.svelte';
	import { db } from '$lib/core/db';
	import { liveQuery } from 'dexie';

	// Reactive query for all tracks that have at least one bookmark
	let bookmarkedTracks = liveQuery(async () => {
		const allBookmarks = await db.bookmarks.toArray();
		const trackIds = Array.from(new Set(allBookmarks.map((b) => b.trackId)));
		if (trackIds.length === 0) return [];
		return await db.tracks.where('id').anyOf(trackIds).toArray();
	});
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Bookmarks</h1>
	</header>

	<div class="content">
		{#if $bookmarkedTracks === undefined}
			<div class="loading">Đang tải...</div>
		{:else if $bookmarkedTracks.length === 0}
			<EmptyState
				title="Chưa có bookmark nào"
				description="Phát một podcast và thêm bookmark để ghi chú những đoạn quan trọng."
			/>
		{:else}
			<div class="tracks-list">
				{#each $bookmarkedTracks as track (track.id)}
					<div class="track-section">
						<div class="track-header">
							<h2>{track.title}</h2>
						</div>
						<BookmarkList trackId={track.id} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.content {
		margin-top: 24px;
	}
	.loading {
		color: var(--text-2, #9ca3af);
		text-align: center;
		padding: 2rem;
	}
	.tracks-list {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}
	.track-section {
		background: var(--surface-1, #1f2937);
		border-radius: 12px;
		padding: 16px;
		border: 1px solid var(--border, #374151);
	}
	.track-header {
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border, #374151);
	}
	h2 {
		font-size: 1.1rem;
		margin: 0;
		color: var(--text-1, #f3f4f6);
		line-height: 1.4;
	}
</style>
