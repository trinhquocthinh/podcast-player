<script lang="ts">
	import type { Bookmark } from '$lib/core/db';
	import { formatTime } from '$lib/features/playback/utils/format';
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { bookmarkService } from '../infrastructure/bookmark-service';
	import BookmarkEditor from './BookmarkEditor.svelte';
	import { dialogState } from '$lib/core/ui/dialogState.svelte';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let { bookmark } = $props<{ bookmark: Bookmark }>();

	let isEditing = $state(false);

	function playFromBookmark() {
		if (bookmark.orphaned) {
			toastState.add('error', 'Track không khả dụng (orphaned bookmark).');
			return;
		}

		// Ensure the player is loaded with the track (this logic might need refinement if clicking a bookmark from another track)
		if (player.currentTrack?.id === bookmark.trackId) {
			audioEngine.seek(bookmark.timestampStart);
			if (player.status !== 'PLAYING') {
				player.play();
			}
		} else {
			// For Phase 5, we assume we are showing bookmarks for the *current* track.
			// Later phases might need to load the track first.
			audioEngine.seek(bookmark.timestampStart);
			player.play();
		}
	}

	function deleteBookmark() {
		dialogState.show({
			title: 'Xóa Bookmark',
			message: 'Bạn có chắc chắn muốn xóa Bookmark này không?',
			confirmText: 'Xóa',
			onConfirm: async () => {
				try {
					await bookmarkService.deleteBookmark(bookmark.id);
					toastState.add('success', 'Đã xóa Bookmark');
				} catch (e) {
					console.error('Failed to delete bookmark', e);
					toastState.add('error', 'Lỗi khi xóa Bookmark');
				}
			}
		});
	}
</script>

<div class="bookmark-item" class:orphaned={bookmark.orphaned}>
	<div class="header">
		<button class="timestamp-btn" onclick={playFromBookmark} title="Play from here">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="currentColor"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polygon points="5 3 19 12 5 21 5 3"></polygon>
			</svg>
			{formatTime(bookmark.timestampStart)}
		</button>

		<div class="actions">
			<button class="icon-btn" onclick={() => (isEditing = !isEditing)} title="Edit Note">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path
						d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
					></path></svg
				>
			</button>
			<button class="icon-btn delete" onclick={deleteBookmark} title="Delete">
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="3 6 5 6 21 6"></polyline><path
						d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
					></path></svg
				>
			</button>
		</div>
	</div>

	{#if isEditing}
		<BookmarkEditor {bookmark} onclose={() => (isEditing = false)} />
	{:else if bookmark.note}
		<div class="note-content">
			{bookmark.note}
		</div>
	{:else}
		<div class="no-note">
			No note added. <button class="add-note-link" onclick={() => (isEditing = true)}
				>Add a note</button
			>
		</div>
	{/if}
</div>

<style>
	.bookmark-item {
		background: var(--surface-1, #222);
		border: 1px solid var(--border, #444);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 12px;
	}
	.bookmark-item.orphaned {
		opacity: 0.7;
		border-style: dashed;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.timestamp-btn {
		background: var(--primary-light, rgba(74, 144, 226, 0.1));
		color: var(--primary, #4a90e2);
		border: none;
		padding: 4px 12px;
		border-radius: 16px;
		font-weight: 600;
		font-family: monospace;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: background 0.2s;
	}
	.timestamp-btn:hover {
		background: var(--primary-light-hover, rgba(74, 144, 226, 0.2));
	}
	.actions {
		display: flex;
		gap: 4px;
	}
	.icon-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary, #aaa);
		cursor: pointer;
		padding: 6px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.icon-btn:hover {
		background: var(--surface-2, #333);
		color: var(--text-primary, #fff);
	}
	.icon-btn.delete:hover {
		color: var(--error, #e74c3c);
		background: rgba(231, 76, 60, 0.1);
	}
	.note-content {
		color: var(--text-primary, #fff);
		white-space: pre-wrap;
		line-height: 1.5;
		font-size: 0.95rem;
	}
	.no-note {
		color: var(--text-secondary, #aaa);
		font-size: 0.9rem;
		font-style: italic;
	}
	.add-note-link {
		background: none;
		border: none;
		color: var(--primary, #4a90e2);
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		font-style: normal;
	}
</style>
