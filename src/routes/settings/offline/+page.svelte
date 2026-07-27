<script lang="ts">
	import { db } from '$lib/core/db';
	import { liveQuery } from 'dexie';
	import { offlineService } from '$lib/features/library/infrastructure/offline-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { Trash } from 'lucide-svelte';

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

<div id="tab-offline" class="tab-content active">
	<header class="p-6 pt-10">
		<h1 class="text-2xl font-bold text-white tracking-tight">Quản lý bộ nhớ</h1>
		<p class="text-sm text-slate-400 mt-1">Lưu trữ cục bộ an toàn trên thiết bị (IndexedDB)</p>
	</header>

	<section class="px-6 mb-8">
		<div class="glass-card rounded-2xl p-5 border border-slate-700/50">
			<div class="flex justify-between items-end mb-2">
				<div>
					<span class="text-3xl font-bold text-white">
						{formatBytes(totalSize).split(' ')[0]}<span class="text-lg text-slate-400 font-medium"
							>{formatBytes(totalSize).split(' ')[1] || 'B'}</span
						>
					</span>
					<span class="text-sm text-slate-400 block mt-1"
						>Đã sử dụng ({$offlineTracks?.length || 0} tracks)</span
					>
				</div>
				{#if $offlineTracks && $offlineTracks.length > 0}
					<button
						onclick={handleDeleteAll}
						class="text-sm text-red-400 hover:text-red-300 font-medium transition flex items-center gap-1"
					>
						<Trash class="w-4 h-4" /> Dọn dẹp
					</button>
				{/if}
			</div>

			<div class="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden flex">
				<div
					class="bg-indigo-500 h-full"
					style="width: {totalSize > 0 ? '100%' : '0%'}"
					title="Audio Offline"
				></div>
			</div>
		</div>
	</section>

	<section class="px-6 pb-8">
		<h2 class="text-lg font-semibold text-white mb-4">Danh sách đã tải</h2>

		{#if $offlineTracks === undefined}
			<p class="text-slate-400">Đang tải...</p>
		{:else if $offlineTracks.length === 0}
			<div class="p-6 text-center bg-slate-800/50 rounded-xl border border-slate-700/50">
				<p class="text-slate-400">Chưa có track nào được tải về.</p>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each $offlineTracks as track (track.id)}
					<li
						class="glass-card p-4 rounded-xl border border-slate-700/50 flex items-center justify-between group transition-colors hover:border-indigo-500/30"
					>
						<div class="min-w-0 flex-1 pr-4">
							<h4 class="font-medium text-slate-200 truncate">{track.title}</h4>
							<span class="text-xs text-slate-500 mt-1 block">{formatBytes(track.fileSize)}</span>
						</div>
						<button
							class="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
							onclick={() => handleDelete(track.id)}
							title="Xóa"
						>
							<Trash class="w-4 h-4" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
