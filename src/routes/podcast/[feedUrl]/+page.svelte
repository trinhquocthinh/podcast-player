<script lang="ts">
	import { liveQuery } from 'dexie';
	import { db, type Podcast } from '$lib/core/db';
	import { EpisodeList } from '$lib/features/library';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import {
		ChevronLeft,
		MoreVertical,
		Share2,
		CheckCircle,
		Settings,
		Trash2,
		RefreshCw
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Use $derived to ensure reactivity when data changes
	let feedUrl = $derived(decodeURIComponent(data.feedUrl));
	let podcast = $state<Podcast | null | undefined>(undefined);

	$effect(() => {
		const observable = liveQuery(() => db.podcasts.get(feedUrl));
		const sub = observable.subscribe((val) => {
			podcast = val;
		});
		return () => sub.unsubscribe();
	});

	let isMenuOpen = $state(false);

	function togglePodcastMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function actionToast(msg: string) {
		toastState.add('info', msg);
	}

	function closePodcastDetail() {
		goto('/');
	}

	async function handleDelete() {
		if (podcast) {
			await db.podcasts.delete(podcast.feedUrl);
			// Also delete tracks
			await db.tracks.where('podcastFeedUrl').equals(podcast.feedUrl).delete();
			toastState.add('success', 'Đã xóa khỏi thư viện');
			goto('/');
		}
	}
</script>

<div class="podcast-detail-view w-full min-h-screen bg-slate-950 pb-44 text-slate-200">
	{#if podcast === undefined}
		<div class="p-6 text-slate-400">Đang tải thông tin podcast...</div>
	{:else if podcast === null}
		<div class="p-6 text-red-400">Không tìm thấy Podcast này trong thư viện.</div>
	{:else}
		<!-- Overlay ẩn để đóng menu khi click ra ngoài -->
		{#if isMenuOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="fixed inset-0 z-10" onclick={closeMenu}></div>
		{/if}

		<!-- Navbar dính trên cùng -->
		<div
			class="sticky top-0 w-full glass-panel z-20 px-4 py-3 flex items-center justify-between border-b border-white/5"
		>
			<button
				onclick={closePodcastDetail}
				class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 transition"
			>
				<ChevronLeft class="w-6 h-6" />
			</button>

			<!-- NÚT 3 CHẤM BỔ SUNG ACTION VÀ DROPDOWN MENU -->
			<div class="relative">
				<button
					onclick={togglePodcastMenu}
					class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 transition active:scale-95"
				>
					<MoreVertical class="w-5 h-5" />
				</button>

				<!-- DROPDOWN MENU TÁC VỤ -->
				<div
					class="absolute right-0 top-12 w-56 glass-card border border-slate-700/50 rounded-2xl shadow-2xl py-2 origin-top-right transition-all duration-200 z-50 {isMenuOpen
						? 'opacity-100 scale-100 pointer-events-auto'
						: 'opacity-0 scale-95 pointer-events-none'}"
				>
					<button
						onclick={() => {
							actionToast('Đã sao chép link chia sẻ');
							closeMenu();
						}}
						class="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-center gap-3 text-sm text-slate-200"
					>
						<Share2 class="w-4 h-4 text-slate-400" /> Chia sẻ Podcast
					</button>
					<button
						onclick={() => {
							actionToast('Đánh dấu đã nghe tất cả');
							closeMenu();
						}}
						class="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-center gap-3 text-sm text-slate-200"
					>
						<CheckCircle class="w-4 h-4 text-slate-400" /> Đánh dấu đã nghe
					</button>
					<button
						onclick={() => {
							actionToast('Mở cài đặt tải xuống');
							closeMenu();
						}}
						class="w-full text-left px-4 py-3 hover:bg-white/5 transition flex items-center gap-3 text-sm text-slate-200"
					>
						<Settings class="w-4 h-4 text-slate-400" /> Cài đặt tự động tải
					</button>
					<div class="w-full h-px bg-slate-700/50 my-1"></div>
					<button
						onclick={handleDelete}
						class="w-full text-left px-4 py-3 hover:bg-red-500/10 transition flex items-center gap-3 text-sm text-red-400 font-medium"
					>
						<Trash2 class="w-4 h-4" /> Xóa khỏi thư viện
					</button>
				</div>
			</div>
		</div>

		<!-- Header Info Box (Hero) -->
		<div class="px-6 pt-6 pb-6 relative overflow-hidden">
			<!-- Blurred background decoration -->
			<div
				class="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[60px] pointer-events-none"
			></div>

			<div class="flex gap-5 relative z-10">
				<div
					class="w-28 h-28 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-slate-700/50"
				>
					<img src={podcast.coverImage} alt={podcast.title} class="w-full h-full object-cover" />
				</div>
				<div class="flex flex-col justify-center min-w-0">
					<h1 class="text-xl font-bold text-white leading-snug mb-1">{podcast.title}</h1>
					<p class="text-indigo-300 text-sm font-medium mb-3">{podcast.author}</p>
					<div class="flex gap-2">
						<button
							onclick={() => actionToast('Đã theo dõi Podcast')}
							class="bg-indigo-500 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20"
						>
							Đang theo dõi
						</button>
						<button
							onclick={() => actionToast('Cập nhật RSS Feed')}
							class="glass-button w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition"
						>
							<RefreshCw class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			</div>

			<div class="text-sm text-slate-400 leading-relaxed mt-6 line-clamp-3">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html podcast.description}
			</div>
		</div>

		<!-- Dải phân cách mỏng -->
		<div
			class="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mb-4"
		></div>

		<!-- List các tập (Episodes) -->
		<EpisodeList feedUrl={podcast.feedUrl} podcastCover={podcast.coverImage} />
	{/if}
</div>

<style>
	.glass-panel {
		background: rgba(30, 41, 59, 0.85);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}
	.glass-button {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
