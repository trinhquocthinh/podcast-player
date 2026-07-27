<script lang="ts">
	import { settingsService, type PostBookmarkAction } from '../infrastructure/settings-service';
	import { onMount } from 'svelte';
	import { PlayCircle, Play, Pause } from 'lucide-svelte';

	let speed = $state(1.0);
	let action = $state<PostBookmarkAction>('CONTINUE');

	onMount(() => {
		const sub1 = settingsService.observeDefaultPlaybackSpeed().subscribe((val) => {
			speed = val;
		});
		const sub2 = settingsService.observeBookmarkPostAction().subscribe((val) => {
			action = val;
		});
		return () => {
			sub1.unsubscribe();
			sub2.unsubscribe();
		};
	});

	let saveTimeout: ReturnType<typeof setTimeout>;

	function setSpeed(newSpeed: number) {
		speed = newSpeed;
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			settingsService.setDefaultPlaybackSpeed(speed);
		}, 300);
	}

	function setAction(newAction: PostBookmarkAction) {
		action = newAction;
		settingsService.setBookmarkPostAction(action);
	}
</script>

<section>
	<h2
		class="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"
	>
		<PlayCircle class="w-4 h-4" /> Mặc định Playback
	</h2>
	<div class="glass-card rounded-3xl border border-slate-700/50 p-1">
		<div class="p-3">
			<h3 class="font-semibold text-white text-sm mb-3">Tốc độ phát mặc định</h3>
			<div class="flex bg-slate-900/80 rounded-xl p-1 border border-slate-700">
				{#each [1.0, 1.2, 1.5, 2.0] as s}
					<button
						onclick={() => setSpeed(s)}
						class="flex-1 py-2 text-sm font-semibold rounded-lg transition {speed === s
							? 'bg-indigo-500 text-white shadow-md'
							: 'text-slate-400 hover:text-white'}"
					>
						{s.toFixed(1)}x
					</button>
				{/each}
			</div>
		</div>

		<div class="p-3 border-t border-slate-700/50">
			<h3 class="font-semibold text-white text-sm mb-3">Sau khi tạo Bookmark</h3>
			<div class="grid grid-cols-2 gap-2">
				<button
					onclick={() => setAction('CONTINUE')}
					class="px-3 py-3 rounded-xl border-2 text-sm font-medium flex flex-col items-center gap-1 transition {action ===
					'CONTINUE'
						? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
						: 'border-transparent bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}"
				>
					<Play class="w-5 h-5" /> Tiếp tục phát
				</button>
				<button
					onclick={() => setAction('PAUSE_FOR_NOTE')}
					class="px-3 py-3 rounded-xl border-2 text-sm font-medium flex flex-col items-center gap-1 transition {action ===
					'PAUSE_FOR_NOTE'
						? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
						: 'border-transparent bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}"
				>
					<Pause class="w-5 h-5" /> Tạm dừng
				</button>
			</div>
		</div>
	</div>
</section>

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
