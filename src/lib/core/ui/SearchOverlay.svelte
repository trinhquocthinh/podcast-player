<script lang="ts">
	import { Search } from 'lucide-svelte';

	let { isOpen = $bindable(false) } = $props();

	let searchQuery = $state('');

	function close() {
		isOpen = false;
	}

	function handleSuggestionClick(term: string) {
		searchQuery = term;
		// Handle search trigger here in the future
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md px-6 pt-12 flex flex-col transition-opacity"
	>
		<div class="flex items-center gap-3">
			<div class="relative flex-1">
				<Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
				<!-- svelte-ignore a11y_autofocus -->
				<input
					type="text"
					bind:value={searchQuery}
					autofocus
					class="w-full bg-slate-800/50 rounded-2xl pl-12 pr-4 py-3.5 text-white border border-slate-700 focus:border-indigo-500 focus:bg-slate-800 outline-none transition-all shadow-xl"
					placeholder="Tìm podcast, tập, ghi chú..."
				/>
			</div>
			<button onclick={close} class="text-slate-400 font-medium hover:text-white transition"
				>Hủy</button
			>
		</div>
		<div class="mt-8">
			<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
				Gợi ý tìm kiếm
			</p>
			<div class="flex flex-wrap gap-2">
				<button
					onclick={() => handleSuggestionClick('System Design')}
					class="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
					>System Design</button
				>
				<button
					onclick={() => handleSuggestionClick('Huberman Lab')}
					class="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
					>Huberman Lab</button
				>
				<button
					onclick={() => handleSuggestionClick('Ghi chú tuần trước')}
					class="px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
					>Ghi chú tuần trước</button
				>
			</div>
		</div>
	</div>
{/if}
