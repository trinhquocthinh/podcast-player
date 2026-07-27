<script lang="ts">
	import type { Track } from '$lib/core/db';
	import { formatDuration } from '$lib/core/utils/time';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { offlineService } from '$lib/features/library/infrastructure/offline-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { Play, Clock, CheckCircle2, DownloadCloud, XCircle } from 'lucide-svelte';

	let { episode } = $props<{ episode: Track; podcastCover?: string }>();

	let isDownloading = $state(false);
	let downloadProgress = $state(0);

	function handlePlay() {
		// Delegate cho Player layer — xử lý blob URL on-the-fly
		player.selectTrack(episode);
	}

	async function handleDownload() {
		if (isDownloading) return;
		isDownloading = true;
		downloadProgress = 0;
		try {
			await offlineService.downloadEpisodeForOffline(episode.id, (progress) => {
				downloadProgress = progress;
			});
			episode.offlineAvailable = true;
			toastState.add('success', 'Đã tải xong episode');
		} catch (error) {
			const err = error as Error;
			if (err.message !== 'Đã huỷ tải xuống.') {
				toastState.add('error', err.message || 'Lỗi tải xuống');
			}
		} finally {
			isDownloading = false;
			downloadProgress = 0;
		}
	}

	function handleCancelDownload() {
		offlineService.cancelDownload(episode.id);
		isDownloading = false;
	}

	async function handleDeleteOffline() {
		try {
			await offlineService.removeOfflineEpisode(episode.id);
			episode.offlineAvailable = false;
			toastState.add('success', 'Đã xóa bản offline');
		} catch {
			toastState.add('error', 'Lỗi khi xóa bản offline');
		}
	}
</script>

<div
	class="glass-card p-4 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-colors group cursor-pointer relative overflow-hidden"
>
	{#if episode.publishedAt}
		<p class="text-[11px] text-slate-500 font-mono font-bold tracking-wider uppercase mb-1.5">
			{new Date(episode.publishedAt).toLocaleDateString()}
		</p>
	{/if}

	<h4
		class="font-bold text-slate-100 text-base leading-tight mb-2 group-hover:text-white transition-colors"
	>
		{episode.title}
	</h4>

	{#if episode.description}
		<div class="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html episode.description}
		</div>
	{/if}

	<div class="flex items-center justify-between">
		<button
			onclick={handlePlay}
			class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-white hover:bg-slate-700 hover:text-indigo-400 transition-colors shadow-lg shadow-black/20"
		>
			<Play class="w-4 h-4 fill-current ml-0.5" />
		</button>

		<div class="flex items-center gap-4 text-slate-500">
			<span class="text-xs font-mono font-medium flex items-center gap-1.5">
				<Clock class="w-3.5 h-3.5" />
				{formatDuration(episode.duration)}
			</span>

			{#if isDownloading}
				<div class="flex items-center gap-2">
					<span class="text-xs text-indigo-400 font-mono">{downloadProgress.toFixed(0)}%</span>
					<button
						onclick={handleCancelDownload}
						class="text-red-400 hover:text-red-300 transition"
						title="Hủy"
					>
						<XCircle class="w-5 h-5" />
					</button>
				</div>
			{:else if episode.offlineAvailable}
				<button
					onclick={handleDeleteOffline}
					class="text-green-400 hover:text-green-300 transition"
					title="Đã tải xuống (Xóa)"
				>
					<CheckCircle2 class="w-5 h-5" />
				</button>
			{:else if episode.sourceType === 'rss'}
				<button onclick={handleDownload} class="hover:text-white transition" title="Tải xuống">
					<DownloadCloud class="w-5 h-5" />
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
