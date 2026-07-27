<script lang="ts">
	import { PodcastList, LocalTrackList } from '$lib/features/library';
	import { Search, Headphones, Play } from 'lucide-svelte';
	import SearchOverlay from '$lib/core/ui/SearchOverlay.svelte';
	import AddFeedModal from '$lib/features/library/ui/AddFeedModal.svelte';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { db } from '$lib/core/db';

	let isSearchOpen = $state(false);
	let isAddModalOpen = $state(false);

	let currentTrack = $derived(player.currentTrack);
	let progressPercentage = $derived(
		currentTrack && currentTrack.duration > 0
			? (audioEngine.currentPosition / currentTrack.duration) * 100
			: 0
	);

	let coverUrl = $state<string | undefined>(undefined);

	function getGreeting() {
		// Use UTC+7 for standard local time check
		const now = new Date();
		const hour = now.getUTCHours() + 7;
		const localHour = hour >= 24 ? hour - 24 : hour;

		if (localHour >= 5 && localHour < 12) return 'Chào buổi sáng,';
		if (localHour >= 12 && localHour < 18) return 'Chào buổi chiều,';
		return 'Chào buổi tối,';
	}
	let greeting = getGreeting();

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

	function handleContinueListening() {
		if (currentTrack) {
			player.play();
		}
	}
</script>

<div id="tab-library" class="tab-content active">
	<header class="flex items-center justify-between p-6 pt-10">
		<div>
			<p class="text-sm font-medium text-slate-400">{greeting}</p>
			<h1 class="text-2xl font-bold text-white tracking-tight">Sẵn sàng học tập?</h1>
		</div>
		<button
			onclick={() => (isSearchOpen = true)}
			class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition ring-2 ring-indigo-500/30"
		>
			<Search class="w-5 h-5 text-slate-300" />
		</button>
	</header>

	{#if currentTrack}
		<section class="px-6 mb-8">
			<h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
				<Headphones class="w-5 h-5 text-indigo-400" />
				Tiếp tục nghe
			</h2>

			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				onclick={handleContinueListening}
				class="relative glass-card rounded-3xl p-5 overflow-hidden group hover:border-indigo-500/30 transition-all duration-300 cursor-pointer"
			>
				<div
					class="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"
				></div>
				<div class="relative flex items-center gap-5">
					<div
						class="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-black/50"
					>
						{#if coverUrl}
							<img src={coverUrl} alt="Cover" class="w-full h-full object-cover" />
						{:else}
							<div class="w-full h-full bg-slate-800 flex items-center justify-center">
								<span class="text-slate-500 text-xs">No Cover</span>
							</div>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<span
							class="inline-block px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full mb-2"
						>
							Đã nghe: {Math.floor(audioEngine.currentPosition / 60)} phút
						</span>
						<h3 class="font-bold text-white text-base truncate mb-1">{currentTrack.title}</h3>
						<p class="text-sm text-slate-400 truncate">
							{currentTrack.podcastFeedUrl ? 'Podcast' : 'Audio File'}
						</p>
					</div>
					<button
						class="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"
					>
						<Play class="w-5 h-5 ml-1" />
					</button>
				</div>
				<div class="mt-5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
					<div
						class="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
						style="width: {progressPercentage}%"
					></div>
				</div>
			</div>
		</section>
	{/if}

	<section class="px-6 space-y-8">
		<PodcastList onAddClick={() => (isAddModalOpen = true)} />
		<LocalTrackList />
	</section>
</div>

<SearchOverlay bind:isOpen={isSearchOpen} />
<AddFeedModal bind:isOpen={isAddModalOpen} />
