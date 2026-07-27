<script lang="ts">
	import type { Bookmark, Track, Podcast } from '$lib/core/db';
	import { renderBookmarkToDataURL } from '../utils/canvas-renderer';
	import { onMount } from 'svelte';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let { bookmark, track, podcast, onclose } = $props<{
		bookmark: Bookmark;
		track: Track;
		podcast?: Podcast;
		onclose: () => void;
	}>();

	let dataUrl = $state<string | null>(null);
	let isRendering = $state(true);

	onMount(async () => {
		try {
			dataUrl = await renderBookmarkToDataURL(bookmark, track, podcast);
		} catch (e) {
			console.error('Lỗi khi tạo ảnh chia sẻ', e);
			toastState.add('error', 'Không thể tạo ảnh chia sẻ');
		} finally {
			isRendering = false;
		}
	});

	function handleDownload() {
		if (!dataUrl) return;
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = `bookmark-${bookmark.trackId}-${bookmark.timestampStart}.png`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	async function handleNativeShare() {
		if (!dataUrl) return;
		try {
			// Convert data url to blob
			const res = await fetch(dataUrl);
			const blob = await res.blob();
			const file = new File([blob], 'bookmark.png', { type: 'image/png' });

			if (navigator.canShare && navigator.canShare({ files: [file] })) {
				await navigator.share({
					files: [file],
					title: 'Podcast Bookmark',
					text: `Ghi chú từ ${track.title}`
				});
			} else {
				toastState.add('error', 'Trình duyệt không hỗ trợ chia sẻ file ảnh trực tiếp.');
			}
		} catch (error: unknown) {
			console.error('Share failed', error);
			if ((error as Error).name !== 'AbortError') {
				toastState.add('error', 'Chia sẻ bị hủy hoặc gặp lỗi.');
			}
		}
	}
</script>

<div
	class="modal-backdrop"
	role="button"
	tabindex="-1"
	onclick={onclose}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
>
	<div
		class="modal-content"
		role="dialog"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<div class="modal-header">
			<h2>Chia sẻ Bookmark</h2>
			<button class="close-btn" onclick={onclose}>✕</button>
		</div>

		<div class="modal-body">
			{#if isRendering}
				<div class="loading">Đang tạo ảnh...</div>
			{:else if dataUrl}
				<div class="preview-container">
					<img src={dataUrl} alt="Bookmark Share Preview" class="preview-img" />
				</div>
				<div class="actions">
					<button class="btn btn-secondary" onclick={handleDownload}> Tải xuống (PNG) </button>
					{#if 'canShare' in navigator}
						<button class="btn btn-primary" onclick={handleNativeShare}> Chia sẻ </button>
					{/if}
				</div>
			{:else}
				<div class="error-msg">Đã xảy ra lỗi khi tạo ảnh.</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(2px);
	}
	.modal-content {
		background: var(--surface-1, #1a1a1d);
		border: 1px solid var(--border, #333);
		border-radius: 12px;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border, #333);
	}
	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-primary, #fff);
	}
	.close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary, #aaa);
		font-size: 1.2rem;
		cursor: pointer;
		padding: 4px;
	}
	.close-btn:hover {
		color: var(--text-primary, #fff);
	}
	.modal-body {
		padding: 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.loading {
		text-align: center;
		color: var(--text-secondary, #aaa);
		padding: 40px 0;
	}
	.error-msg {
		text-align: center;
		color: var(--error, #e74c3c);
		padding: 40px 0;
	}
	.preview-container {
		display: flex;
		justify-content: center;
		background: var(--surface-2, #111);
		padding: 12px;
		border-radius: 8px;
	}
	.preview-img {
		max-width: 100%;
		height: auto;
		max-height: 50vh;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	.actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}
	.btn {
		padding: 10px 16px;
		border-radius: 6px;
		border: none;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.btn:hover {
		opacity: 0.9;
	}
	.btn-secondary {
		background: var(--surface-3, #333);
		color: var(--text-primary, #fff);
	}
	.btn-primary {
		background: var(--primary, #4a90e2);
		color: #fff;
	}
</style>
