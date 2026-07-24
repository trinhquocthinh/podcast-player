<script lang="ts">
	import { audioEngine } from '../infrastructure/engine.svelte';
	import { player } from '../application/player.svelte';
	import { bookmarkService } from '$lib/features/bookmark/infrastructure/bookmark-service';
	import { formatTimestamp } from '$lib/core/utils/time';
	import type { Bookmark } from '$lib/core/db';

	let position = $derived(audioEngine.currentPosition);
	let duration = $derived(audioEngine.duration);
	let currentTrack = $derived(player.currentTrack);

	let bookmarksObservable = $derived(
		currentTrack ? bookmarkService.getBookmarksByTrack(currentTrack.id) : null
	);
	let bookmarks = $state<Bookmark[]>([]);

	$effect(() => {
		if (bookmarksObservable) {
			const sub = bookmarksObservable.subscribe((value) => {
				bookmarks = value;
			});
			return () => sub.unsubscribe();
		} else {
			bookmarks = [];
		}
	});

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		audioEngine.seek(parseFloat(target.value));
	}
</script>

<div class="seek-bar-container">
	<span class="time">{formatTimestamp(position)}</span>
	<div class="track-wrapper">
		<input
			type="range"
			class="seek-bar"
			min="0"
			max={duration || 100}
			step="0.1"
			value={position}
			onchange={handleSeek}
			oninput={handleSeek}
			disabled={duration === 0}
		/>
		{#if duration > 0}
			{#each bookmarks as bm (bm.id)}
				<div
					class="bookmark-marker"
					style="left: {(bm.timestampStart / duration) * 100}%"
					title={bm.note || 'Bookmark'}
				></div>
			{/each}
		{/if}
	</div>
	<span class="time">{formatTimestamp(duration)}</span>
</div>

<style>
	.seek-bar-container {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
	}
	.track-wrapper {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}
	.seek-bar {
		width: 100%;
		cursor: pointer;
		position: relative;
		z-index: 2;
		opacity: 0.8;
	}
	.seek-bar:hover {
		opacity: 1;
	}
	.bookmark-marker {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: var(--primary, #4a90e2);
		box-shadow: 0 0 0 2px var(--surface-1, #222);
		z-index: 1;
		pointer-events: none;
	}
	.time {
		font-size: 0.8rem;
		color: var(--text-secondary, #aaa);
		min-width: 5ch;
	}
</style>
