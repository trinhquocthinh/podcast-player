<script lang="ts">
	import { db } from '$lib/core/db';
	import { liveQuery } from 'dexie';
	import { offlineService } from '$lib/features/library/infrastructure/offline-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let offlineTracks = liveQuery(() =>
		db.tracks.filter((t) => t.offlineAvailable === true).toArray()
	);

	function formatBytes(bytes?: number) {
		if (!bytes) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	let totalSize = $derived(
		$offlineTracks?.reduce((sum, track) => sum + (track.fileSize || 0), 0) || 0
	);

	async function handleDelete(trackId: string) {
		try {
			await offlineService.removeOfflineEpisode(trackId);
			toastState.add('success', 'Đã xóa bản offline');
		} catch {
			toastState.add('error', 'Lỗi khi xóa bản offline');
		}
	}

	async function handleDeleteAll() {
		if (
			!confirm(
				'Bạn có chắc muốn xóa tất cả bản offline? Dữ liệu đánh dấu (bookmarks) vẫn được giữ lại.'
			)
		) {
			return;
		}

		try {
			if ($offlineTracks) {
				for (const track of $offlineTracks) {
					await offlineService.removeOfflineEpisode(track.id);
				}
				toastState.add('success', 'Đã xóa tất cả bản offline');
			}
		} catch {
			toastState.add('error', 'Lỗi khi xóa bản offline');
		}
	}
</script>

<div class="page-container">
	<header>
		<div class="title-bar">
			<a href="/settings" class="back-btn">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
				Cài đặt
			</a>
			<h1>Quản lý Tải xuống</h1>
		</div>
	</header>

	<main>
		<div class="summary-card">
			<h3>Tổng dung lượng lưu trữ</h3>
			<div class="size-display">{formatBytes(totalSize)}</div>
			<div class="track-count">{$offlineTracks?.length || 0} tracks đã tải</div>

			{#if $offlineTracks && $offlineTracks.length > 0}
				<button class="btn danger mt-4" onclick={handleDeleteAll}>Xóa tất cả</button>
			{/if}
		</div>

		<h2>Danh sách đã tải</h2>

		{#if $offlineTracks === undefined}
			<p>Đang tải...</p>
		{:else if $offlineTracks.length === 0}
			<p class="empty-state">Chưa có track nào được tải về.</p>
		{:else}
			<ul class="track-list">
				{#each $offlineTracks as track (track.id)}
					<li class="track-item">
						<div class="track-info">
							<h4>{track.title}</h4>
							<span class="track-size">{formatBytes(track.fileSize)}</span>
						</div>
						<button class="delete-btn" onclick={() => handleDelete(track.id)} title="Xóa">
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
								/>
							</svg>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>

<style>
	.page-container {
		padding: 1rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.title-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--text-2, #9ca3af);
		font-weight: 500;
	}

	.back-btn:hover {
		color: var(--text-1, #f3f4f6);
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--text-1, #f3f4f6);
	}

	h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
		color: var(--text-1, #f3f4f6);
	}

	.summary-card {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		text-align: center;
		border: 1px solid var(--border, #374151);
	}

	.summary-card h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text-2, #9ca3af);
		font-size: 1rem;
		font-weight: 500;
	}

	.size-display {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-1, #f3f4f6);
		margin-bottom: 0.5rem;
	}

	.track-count {
		color: var(--text-2, #9ca3af);
		font-size: 0.9rem;
	}

	.mt-4 {
		margin-top: 1rem;
	}

	.btn.danger {
		background: transparent;
		color: var(--error, #ef4444);
		border: 1px solid var(--error, #ef4444);
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn.danger:hover {
		background: var(--error, #ef4444);
		color: white;
	}

	.empty-state {
		text-align: center;
		color: var(--text-2, #9ca3af);
		padding: 2rem 0;
	}

	.track-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.track-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--surface-2, #1f2937);
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
	}

	.track-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		color: var(--text-1, #f3f4f6);
	}

	.track-size {
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: var(--text-2, #9ca3af);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.delete-btn:hover {
		color: var(--error, #ef4444);
		background: var(--surface-3, #374151);
	}
</style>
