<script lang="ts">
	import { player, PlaybackStatus } from '../application/player.svelte';
	import { audioEngine } from '../infrastructure/engine.svelte';
	import { db } from '$lib/core/db';
	import {
		BookOpen,
		BookmarkPlus,
		Scissors,
		Pause,
		Play,
		RotateCcw,
		RotateCw
	} from 'lucide-svelte';
	import { formatTimestamp } from '$lib/core/utils/time';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	// eslint-disable-next-line no-useless-assignment
	let { isBookmarkModalOpen = $bindable(false) } = $props();

	let currentTrack = $derived(player.currentTrack);
	let error = $derived(player.error);
	let isPlaying = $derived(player.status === PlaybackStatus.PLAYING);
	let isSilenceSkip = $derived(player.isSilenceSkipEnabled);

	let engineProgress = $derived(
		currentTrack && currentTrack.duration > 0
			? (audioEngine.currentPosition / currentTrack.duration) * 100
			: 0
	);

	let isDragging = $state(false);
	let dragProgress = $state(0);
	let displayProgress = $derived(isDragging ? dragProgress : engineProgress);
	let displayPosition = $derived(
		isDragging && currentTrack
			? (dragProgress / 100) * currentTrack.duration
			: audioEngine.currentPosition
	);

	let coverUrl = $state<string | undefined>(undefined);

	$effect(() => {
		if (currentTrack) {
			if (currentTrack.coverBlob) {
				const url = URL.createObjectURL(currentTrack.coverBlob);
				coverUrl = url;
				return () => URL.revokeObjectURL(url);
			} else if (currentTrack.podcastFeedUrl) {
				db.podcasts.get(currentTrack.podcastFeedUrl).then((p) => {
					if (p) coverUrl = p.coverImage;
				});
			} else {
				coverUrl = undefined;
			}
		} else {
			coverUrl = undefined;
		}
	});

	function togglePlay() {
		if (isPlaying) {
			player.pause();
			toastState.add('info', 'Đã tạm dừng');
		} else {
			player.play();
			toastState.add('success', 'Đang phát');
		}
	}

	function toggleSilenceSkip() {
		player.toggleSilenceSkip();
		if (!isSilenceSkip) {
			toastState.add('success', 'Bật cắt khoảng lặng');
		} else {
			toastState.add('info', 'Tắt cắt khoảng lặng');
		}
	}

	async function quickBookmark() {
		if (!currentTrack) return;
		try {
			const nowStr = new Date().toISOString();
			await db.bookmarks.add({
				id: crypto.randomUUID(),
				trackId: currentTrack.id,
				timestampStart: audioEngine.currentPosition,
				note: '',
				createdAt: nowStr,
				updatedAt: nowStr,
				orphaned: false
			});
			toastState.add(
				'success',
				`Đã lưu Bookmark tại ${formatTimestamp(audioEngine.currentPosition)}`
			);
		} catch {
			toastState.add('error', 'Lỗi khi lưu Bookmark');
		}
	}

	function cycleSpeed() {
		const speeds = [1.0, 1.2, 1.5, 2.0];
		const currentIdx = speeds.indexOf(audioEngine.speed);
		const nextIdx = (currentIdx + 1) % speeds.length;
		audioEngine.setSpeed(speeds[nextIdx]);
		toastState.add('info', `Tốc độ: ${speeds[nextIdx].toFixed(1)}x`);
	}

	function seekRelative(seconds: number) {
		if (!currentTrack) return;
		const newPos = Math.max(
			0,
			Math.min(audioEngine.currentPosition + seconds, currentTrack.duration)
		);
		audioEngine.seek(newPos);
		toastState.add(
			'info',
			seconds > 0 ? `Đã tiến ${seconds} giây` : `Đã lùi ${Math.abs(seconds)} giây`
		);
	}

	function handleSeekInput(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		isDragging = true;
		dragProgress = val;
	}

	function handleSeekChange(e: Event) {
		const val = parseFloat((e.target as HTMLInputElement).value);
		if (currentTrack && currentTrack.duration > 0) {
			audioEngine.seek((val / 100) * currentTrack.duration);
		}
		isDragging = false;
	}
</script>

{#if currentTrack}
	<div class="px-3 pb-3">
		{#if error}
			<div class="bg-red-500 text-white text-xs p-2 rounded mb-2 flex justify-between mx-1">
				<span>{error.message}</span>
				<button onclick={() => player.dismissError()} class="underline">Dismiss</button>
			</div>
		{/if}

		<div
			class="glass-panel rounded-3xl shadow-2xl shadow-black overflow-hidden relative flex flex-col border border-white/10"
		>
			<!-- TẦNG 1: TIMELINE -->
			<div class="w-full h-1.5 bg-slate-800/80 relative group cursor-pointer">
				<input
					type="range"
					min="0"
					max="100"
					step="0.1"
					value={displayProgress}
					oninput={handleSeekInput}
					onchange={handleSeekChange}
					class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
				/>

				<div
					class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 relative pointer-events-none transition-all duration-75"
					style="width: {displayProgress}%;"
				>
					<div
						class="seek-thumb absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,1)] scale-0 transition-transform duration-200"
					></div>
				</div>
			</div>

			<!-- TẦNG 2A: INFO & PLAYBACK CONTROLS -->
			<div class="px-4 py-3 flex items-center justify-between gap-2">
				<div class="flex items-center gap-3 min-w-0 flex-1">
					{#if coverUrl}
						<img
							src={coverUrl}
							alt="Cover"
							class="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-700 shadow-md"
						/>
					{:else}
						<div
							class="w-11 h-11 rounded-xl bg-slate-800 shrink-0 border border-slate-700 flex items-center justify-center shadow-md"
						>
							<span class="text-slate-500 text-[10px]">No Cover</span>
						</div>
					{/if}
					<div class="flex flex-col min-w-0">
						<h4 class="text-sm font-bold text-white truncate">{currentTrack.title}</h4>
						<p class="text-[10px] text-slate-400 font-mono mt-0.5">
							{formatTimestamp(displayPosition)} / {formatTimestamp(currentTrack.duration)}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3 shrink-0">
					<button
						onclick={() => seekRelative(-10)}
						class="text-slate-300 hover:text-white transition active:scale-95"
						title="-10s"
					>
						<RotateCcw class="w-5 h-5" />
					</button>

					<button
						onclick={togglePlay}
						class="w-11 h-11 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.2)]"
					>
						{#if isPlaying}
							<Pause class="w-5 h-5 fill-current" />
						{:else}
							<Play class="w-5 h-5 fill-current ml-1" />
						{/if}
					</button>

					<button
						onclick={() => seekRelative(10)}
						class="text-slate-300 hover:text-white transition active:scale-95"
						title="+10s"
					>
						<RotateCw class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- TẦNG 2B: SECONDARY ACTIONS -->
			<div class="px-4 pb-3 pt-1 flex items-center justify-between border-t border-slate-700/30">
				<!-- Tốc độ -->
				<button
					onclick={cycleSpeed}
					class="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-md transition border border-indigo-500/20 active:scale-95"
				>
					{audioEngine.speed.toFixed(1)}x
				</button>

				<!-- Công cụ -->
				<div class="flex gap-5">
					<button
						onclick={toggleSilenceSkip}
						class="{isSilenceSkip
							? 'text-indigo-400'
							: 'text-slate-400'} relative hover:text-indigo-300 transition active:scale-90"
						title="Silence Skipping"
					>
						<Scissors class="w-4.5 h-4.5" />
						{#if isSilenceSkip}
							<span
								class="absolute -top-1 -right-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]"
							></span>
						{/if}
					</button>

					<button
						onclick={quickBookmark}
						class="text-slate-400 hover:text-white transition active:scale-90"
						title="Đánh dấu nhanh"
					>
						<BookmarkPlus class="w-4.5 h-4.5" />
					</button>

					<button
						onclick={() => (isBookmarkModalOpen = true)}
						class="text-slate-400 hover:text-white transition active:scale-90"
						title="Xem ghi chú"
					>
						<BookOpen class="w-4.5 h-4.5" />
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 0px;
		height: 0px;
	}
	input[type='range']:active + div .seek-thumb,
	input[type='range']:hover + div .seek-thumb {
		transform: scale(1);
	}
</style>
