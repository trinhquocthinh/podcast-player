<script lang="ts">
	import { db } from '$lib/core/db';
	import { liveQuery } from 'dexie';
	import { offlineService } from '$lib/features/library/infrastructure/offline-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { Trash, Play, HardDrive, Headphones } from 'lucide-svelte';
	import { player } from '$lib/features/playback/application/player.svelte';

	let offlineTracks = liveQuery(() =>
		db.tracks.filter((t) => t.offlineAvailable === true).toArray()
	);

	function formatBytes(bytes?: number) {
		if (!bytes) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	let totalSize = $derived(
		$offlineTracks?.reduce((sum, track) => sum + (track.fileSize || 0), 0) || 0
	);

	// Giả lập dung lượng dữ liệu metadata (khoảng 5% của tổng audio hoặc fix cứng)
	let dataSize = $derived(totalSize > 0 ? totalSize * 0.05 : 0);

	let maxStorage = 2 * 1024 * 1024 * 1024; // 2GB fake limit for visual
	let audioPercent = $derived(Math.min((totalSize / maxStorage) * 100, 100));
	let dataPercent = $derived(totalSize > 0 ? Math.max((dataSize / maxStorage) * 100, 2) : 0);

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
				toastState.add('success', 'Đã dọn dẹp bộ nhớ đệm thành công');
			}
		} catch {
			toastState.add('error', 'Lỗi khi dọn dẹp');
		}
	}

	// Helper component logic
	async function getCoverUrl(feedUrl?: string) {
		if (!feedUrl) return undefined;
		const p = await db.podcasts.get(feedUrl);
		return p?.coverImage;
	}
</script>

<div id="tab-offline" class="tab-content active text-slate-200">
	<header class="p-6 pt-10">
		<h1 class="text-2xl font-bold text-white tracking-tight">Quản lý lưu trữ</h1>
		<p class="text-sm text-slate-400 mt-1">Quản lý các file âm thanh đã tải về thiết bị</p>
	</header>

	<section class="px-6 mb-8">
		<div
			class="glass-card rounded-3xl p-6 border border-slate-700/50 shadow-2xl relative overflow-hidden"
		>
			<!-- Background glow -->
			<div
				class="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"
			></div>

			<div class="flex justify-between items-start mb-6 relative z-10">
				<div>
					<div class="flex items-baseline gap-1">
						<span class="text-5xl font-bold text-white tracking-tighter">
							{formatBytes(totalSize + dataSize).split(' ')[0]}
						</span>
						<span class="text-xl text-slate-400 font-medium tracking-tight">
							{formatBytes(totalSize + dataSize).split(' ')[1] || 'B'}
						</span>
					</div>
					<span class="text-sm text-slate-400 block mt-1">
						Đã sử dụng ({$offlineTracks?.length || 0} mục)
					</span>
				</div>
				{#if $offlineTracks && $offlineTracks.length > 0}
					<button
						onclick={handleDeleteAll}
						class="text-xs font-semibold px-4 py-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-1.5 shadow-sm border border-red-500/20 active:scale-95"
					>
						<Trash class="w-3.5 h-3.5" /> Dọn dẹp
					</button>
				{/if}
			</div>

			<div
				class="w-full bg-slate-900 rounded-full h-4 mt-2 overflow-hidden shadow-inner flex border border-slate-800 relative z-10"
			>
				<div
					class="bg-indigo-500 h-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all duration-500"
					style="width: {audioPercent}%"
					title="Audio"
				></div>
				<div
					class="bg-purple-500 h-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] transition-all duration-500"
					style="width: {dataPercent}%"
					title="Dữ liệu"
				></div>
			</div>

			<div class="flex items-center gap-6 mt-4 text-xs font-medium text-slate-400 relative z-10">
				<div class="flex items-center gap-2">
					<div
						class="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
					></div>
					<span>Audio ({formatBytes(totalSize)})</span>
				</div>
				<div class="flex items-center gap-2">
					<div
						class="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
					></div>
					<span>Dữ liệu ({formatBytes(dataSize)})</span>
				</div>
			</div>
		</div>
	</section>

	<section class="px-6 pb-8">
		<h2 class="text-lg font-semibold text-white mb-4">Danh sách tải xuống</h2>

		{#if $offlineTracks === undefined}
			<p class="text-slate-400">Đang tải...</p>
		{:else if $offlineTracks.length === 0}
			<div class="p-8 text-center bg-slate-800/30 rounded-2xl border border-slate-700/50">
				<HardDrive class="w-12 h-12 text-slate-600 mx-auto mb-3" />
				<p class="text-slate-400 font-medium">Chưa có tập nào được tải về</p>
			</div>
		{:else}
			<ul class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each $offlineTracks as track (track.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<li
						class="glass-card p-3 rounded-2xl border border-slate-700/50 flex items-center gap-4 group transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
						onclick={() => player.selectTrack(track)}
					>
						<div
							class="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-800 shadow-md"
						>
							{#await getCoverUrl(track.podcastFeedUrl) then cover}
								{#if cover}
									<img
										src={cover}
										alt="cover"
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center">
										<Headphones class="w-6 h-6 text-slate-500" />
									</div>
								{/if}
							{/await}
							<!-- Play Overlay -->
							<div
								class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
							>
								<Play class="w-6 h-6 text-white fill-white ml-0.5 shadow-lg" />
							</div>
						</div>

						<div class="min-w-0 flex-1">
							<h4
								class="font-semibold text-slate-200 text-sm line-clamp-2 group-hover:text-white transition-colors leading-tight mb-1"
							>
								{track.title}
							</h4>
							<span
								class="text-xs text-indigo-400 font-mono tracking-wide bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 inline-block"
								>{formatBytes(track.fileSize)}</span
							>
						</div>

						<!-- Nút xoá, stop propagation để không trigger play -->
						<button
							class="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors z-10"
							onclick={(e) => {
								e.stopPropagation();
								handleDelete(track.id);
							}}
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

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
