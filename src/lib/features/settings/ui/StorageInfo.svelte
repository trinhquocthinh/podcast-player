<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		getStorageInfo,
		clearAllAudioCache,
		clearUnbookmarkedAudioCache,
		autoCleanupFIFO,
		type StorageInfo
	} from '$lib/core/storage/storage-monitor';
	import ProgressBar from '$lib/core/ui/ProgressBar.svelte';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let info = $state<StorageInfo | null>(null);
	let isClearing = $state(false);
	let refreshInterval: ReturnType<typeof setInterval>;

	async function loadInfo() {
		info = await getStorageInfo();
		if (info && info.status === 'critical' && info.usagePercentage >= 100) {
			await handleAutoCleanup();
		}
	}

	async function handleAutoCleanup() {
		try {
			const { clearedTracks, bytesFreed } = await autoCleanupFIFO();
			if (clearedTracks > 0) {
				toastState.add(
					'success',
					`Đã tự động giải phóng ${formatBytes(bytesFreed)}. ${clearedTracks} episode offline đã bị xóa cache do hết dung lượng.`
				);
				info = await getStorageInfo();
			}
		} catch (error) {
			console.error('Lỗi khi auto cleanup:', error);
		}
	}

	onMount(() => {
		loadInfo();
		// Refresh storage info every 10 seconds
		refreshInterval = setInterval(loadInfo, 10000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	async function handleClearAllCache() {
		if (
			!confirm(
				'Bạn có chắc chắn muốn xoá toàn bộ audio cache? Bookmark của bạn sẽ được giữ nguyên.'
			)
		)
			return;
		try {
			isClearing = true;
			const clearedCount = await clearAllAudioCache();
			toastState.add('success', `Đã giải phóng cache của ${clearedCount} track.`);
			await loadInfo();
		} catch (error) {
			console.error(error);
			toastState.add('error', 'Có lỗi xảy ra khi xoá cache.');
		} finally {
			isClearing = false;
		}
	}

	async function handleClearUnbookmarkedCache() {
		if (!confirm('Bạn có chắc chắn muốn xoá cache của các track KHÔNG có bookmark?')) return;
		try {
			isClearing = true;
			const clearedCount = await clearUnbookmarkedAudioCache();
			toastState.add('success', `Đã giải phóng cache của ${clearedCount} track không có bookmark.`);
			await loadInfo();
		} catch (error) {
			console.error(error);
			toastState.add('error', 'Có lỗi xảy ra khi xoá cache.');
		} finally {
			isClearing = false;
		}
	}

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	let barColor = $derived(
		info?.status === 'critical'
			? 'var(--error-color, #e74c3c)'
			: info?.status === 'warning'
				? 'var(--warning-color, #f1c40f)'
				: 'var(--accent-primary, #3498db)'
	);
</script>

<div class="storage-info card">
	<div class="header">
		<h3>Bộ nhớ thiết bị</h3>
		{#if info}
			<span class="status-badge {info.status}">
				{info.status.toUpperCase()}
			</span>
		{/if}
	</div>

	{#if info}
		<div class="progress-section">
			<ProgressBar progress={info.usagePercentage / 100} height="8px" color={barColor} />
			<div class="usage-text">
				<span>Đã dùng: {formatBytes(info.usage)}</span>
				<span>Tổng: {formatBytes(info.quota)}</span>
			</div>
		</div>

		{#if info.status === 'warning'}
			<div class="alert warning">
				⚠️ Bộ nhớ sắp đầy. App sẽ tự động xoá các track cũ nếu hết dung lượng.
			</div>
		{/if}

		{#if info.status === 'critical'}
			<div class="alert critical">
				🚨 Bộ nhớ đã đầy! Không thể tải thêm audio offline. Vui lòng dọn dẹp bộ nhớ.
			</div>
		{/if}

		<div class="actions">
			<button
				class="btn btn-secondary"
				onclick={handleClearUnbookmarkedCache}
				disabled={isClearing}
			>
				{isClearing ? 'Đang dọn dẹp...' : 'Dọn dẹp Track Không Có Bookmark'}
			</button>
			<button class="btn btn-danger" onclick={handleClearAllCache} disabled={isClearing}>
				{isClearing ? 'Đang dọn dẹp...' : 'Xoá Toàn Bộ Audio Cache'}
			</button>
		</div>
	{:else}
		<p class="loading">Đang tải thông tin bộ nhớ...</p>
	{/if}
</div>

<style>
	.storage-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h3 {
		margin: 0;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 12px;
		font-weight: bold;
		text-transform: uppercase;
	}
	.status-badge.normal {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}
	.status-badge.warning {
		background: rgba(241, 196, 15, 0.2);
		color: #f1c40f;
	}
	.status-badge.critical {
		background: rgba(231, 76, 60, 0.2);
		color: #e74c3c;
	}

	.usage-text {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-top: 0.5rem;
	}

	.alert {
		font-size: 0.9rem;
		padding: 0.75rem;
		border-radius: 8px;
	}
	.alert.warning {
		background: rgba(241, 196, 15, 0.1);
		border: 1px solid rgba(241, 196, 15, 0.3);
		color: #f39c12;
	}
	.alert.critical {
		background: rgba(231, 76, 60, 0.1);
		border: 1px solid rgba(231, 76, 60, 0.3);
		color: #e74c3c;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.loading {
		color: var(--text-secondary);
		font-size: 0.9rem;
	}
</style>
