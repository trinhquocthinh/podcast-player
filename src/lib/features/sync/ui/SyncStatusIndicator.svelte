<script lang="ts">
	import type { SyncStatus } from '$lib/features/sync/domain/sync-types';

	interface Props {
		status: SyncStatus;
		lastSyncAt: string | null;
	}

	let { status, lastSyncAt }: Props = $props();

	const statusConfig: Record<SyncStatus, { icon: string; label: string; color: string }> = {
		idle: { icon: '🟢', label: 'Đã đồng bộ', color: '#22c55e' },
		syncing: { icon: '🔄', label: 'Đang đồng bộ...', color: '#8b5cf6' },
		error: { icon: '🔴', label: 'Lỗi đồng bộ', color: '#ef4444' },
		disconnected: { icon: '⚪', label: 'Chưa kết nối', color: '#6b7280' }
	};

	function formatRelativeTime(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000);

		if (minutes < 1) return 'Vừa xong';
		if (minutes < 60) return `${minutes} phút trước`;

		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} giờ trước`;

		const days = Math.floor(hours / 24);
		return `${days} ngày trước`;
	}
</script>

<div class="sync-indicator" style="--status-color: {statusConfig[status].color}">
	<span class="status-icon" class:spinning={status === 'syncing'}>
		{statusConfig[status].icon}
	</span>
	<div class="status-info">
		<span class="status-label">{statusConfig[status].label}</span>
		{#if lastSyncAt && status !== 'disconnected'}
			<span class="last-sync">Lần cuối: {formatRelativeTime(lastSyncAt)}</span>
		{/if}
	</div>
</div>

<style>
	.sync-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
	}

	.status-icon {
		font-size: 0.9rem;
		line-height: 1;
	}

	.status-icon.spinning {
		animation: spin 1.5s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.status-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--status-color);
	}

	.last-sync {
		font-size: 0.7rem;
		color: var(--text-2, #9ca3af);
	}
</style>
