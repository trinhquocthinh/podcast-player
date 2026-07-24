<script lang="ts">
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { bookmarkService } from '../infrastructure/bookmark-service';
	import { settingsService } from '$lib/features/settings/infrastructure/settings-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import BookmarkEditor from './BookmarkEditor.svelte';
	import type { Bookmark } from '$lib/core/db';

	let isCreating = $state(false);
	let showEditorModal = $state(false);
	let createdBookmark = $state<Bookmark | null>(null);

	async function handleBookmark() {
		if (isCreating || !player.currentTrack) return;

		isCreating = true;
		try {
			const action = await settingsService.getBookmarkPostAction();
			const timestamp = audioEngine.currentPosition;

			const bookmark = await bookmarkService.createBookmark(player.currentTrack.id, timestamp);
			createdBookmark = bookmark;

			toastState.add('success', 'Đã lưu Bookmark', 2000);

			if (action === 'PAUSE_FOR_NOTE') {
				player.pause();
				showEditorModal = true;
			}
		} catch (e) {
			console.error('Failed to create bookmark', e);
			toastState.add('error', 'Lỗi khi tạo Bookmark', 3000);
		} finally {
			isCreating = false;
		}
	}
</script>

<button
	class="bookmark-btn"
	onclick={handleBookmark}
	disabled={!player.currentTrack || isCreating}
	aria-label="Quick Bookmark"
	title="Quick Bookmark"
>
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
	</svg>
</button>

{#if showEditorModal && createdBookmark}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => (showEditorModal = false)}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h3>Nhập Ghi chú</h3>
			<BookmarkEditor bookmark={createdBookmark} onclose={() => (showEditorModal = false)} />
		</div>
	</div>
{/if}

<style>
	.bookmark-btn {
		background: none;
		border: 1px solid var(--border, #444);
		color: var(--text-secondary, #aaa);
		padding: 6px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.bookmark-btn:hover:not(:disabled) {
		color: var(--primary, #4a90e2);
		border-color: var(--primary, #4a90e2);
	}
	.bookmark-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999;
	}
	.modal-content {
		background: var(--surface-1, #222);
		padding: 24px;
		border-radius: 12px;
		width: 400px;
		max-width: 90vw;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	.modal-content h3 {
		margin-top: 0;
		margin-bottom: 16px;
		color: var(--text-primary, #fff);
	}
</style>
