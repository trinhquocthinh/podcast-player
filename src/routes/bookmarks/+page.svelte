<script lang="ts">
	import EmptyState from '$lib/core/ui/EmptyState.svelte';
	import BookmarkList from '$lib/features/bookmark/ui/BookmarkList.svelte';
	import { player } from '$lib/features/playback/application/player.svelte';

	let currentTrack = $derived(player.currentTrack);
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Bookmarks</h1>
	</header>

	<div class="content">
		{#if currentTrack}
			<div class="track-header">
				<h2>{currentTrack.title}</h2>
			</div>
			<BookmarkList trackId={currentTrack.id} />
		{:else}
			<EmptyState
				title="No Track Selected"
				description="Play a podcast track to see and manage its bookmarks here."
			/>
		{/if}
	</div>
</div>

<style>
	.content {
		margin-top: 24px;
	}
	.track-header {
		margin-bottom: 16px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border, #444);
	}
	h2 {
		font-size: 1.2rem;
		margin: 0;
		color: var(--text-primary, #fff);
	}
</style>
