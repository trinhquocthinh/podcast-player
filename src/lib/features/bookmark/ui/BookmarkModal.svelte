<script lang="ts">
	import { Play, Edit3, Trash2, Send, Download, BookOpen } from 'lucide-svelte';
	import { player } from '$lib/features/playback/application/player.svelte';
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { db } from '$lib/core/db';
	import { liveQuery } from 'dexie';
	import { formatTimestamp } from '$lib/core/utils/time';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let { isOpen = $bindable(false) } = $props();

	let currentTrack = $derived(player.currentTrack);
	let newNote = $state('');

	// Query bookmarks for current track
	let bookmarks = $derived(
		currentTrack
			? liveQuery(() =>
					db.bookmarks.where('trackId').equals(currentTrack.id).reverse().sortBy('timestampStart')
				)
			: undefined
	);

	function close() {
		isOpen = false;
	}

	async function handleAddNote() {
		if (!currentTrack) return;
		const pos = audioEngine.currentPosition;
		try {
			const nowStr = new Date().toISOString();
			await db.bookmarks.add({
				id: crypto.randomUUID(),
				trackId: currentTrack.id,
				timestampStart: pos,
				note: newNote,
				createdAt: nowStr,
				updatedAt: nowStr,
				orphaned: false
			});
			toastState.add('success', 'Đã lưu ghi chú!');
			newNote = '';
		} catch {
			toastState.add('error', 'Lỗi khi lưu ghi chú');
		}
	}

	async function handleDelete(id?: string) {
		if (!id) return;
		try {
			await db.bookmarks.delete(id);
			toastState.add('info', 'Đã xóa ghi chú');
		} catch {
			toastState.add('error', 'Lỗi khi xóa ghi chú');
		}
	}

	function playFrom(position: number) {
		audioEngine.seek(position);
		player.play();
	}
</script>

<!-- Overlay -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="drawer-overlay fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[60] transition-opacity"
	class:open={isOpen}
	onclick={close}
></div>

<!-- Nội dung Modal -->
<div
	class="drawer-content fixed bottom-0 left-0 w-full h-[85vh] md:h-[75vh] bg-slate-900 border-t border-slate-700/50 rounded-t-3xl z-[70] flex flex-col shadow-2xl shadow-black transition-transform"
	class:open={isOpen}
>
	<!-- Handle -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="w-full flex justify-center pt-4 pb-2 cursor-pointer" onclick={close}>
		<div class="w-12 h-1.5 bg-slate-700 rounded-full"></div>
	</div>

	<!-- Header Modal -->
	<div class="px-6 pb-4 pt-2 flex items-center justify-between border-b border-slate-800">
		<div class="min-w-0 pr-4">
			<h2 class="text-lg font-bold text-white flex items-center gap-2">
				<BookOpen class="w-5 h-5 text-indigo-400" />
				Ghi chú tập này
			</h2>
			<p class="text-xs text-slate-400 mt-0.5 truncate">
				{currentTrack?.title || 'Không có tập nào đang phát'}
			</p>
		</div>
		<button
			class="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white/10 transition text-xs font-semibold text-indigo-300 shrink-0"
		>
			<Download class="w-3.5 h-3.5" />
			Xuất MD
		</button>
	</div>

	<!-- Danh sách Bookmark -->
	<div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
		{#if $bookmarks === undefined}
			<p class="text-slate-500 text-sm">Đang tải ghi chú...</p>
		{:else if $bookmarks.length === 0}
			<p class="text-slate-500 text-sm italic">Chưa có ghi chú nào. Hãy tạo một Bookmark mới!</p>
		{:else}
			{#each $bookmarks as bookmark (bookmark.id)}
				<div
					class="glass-card p-4 rounded-2xl group border border-slate-700/50 hover:border-indigo-500/30 transition-colors"
				>
					<div class="flex justify-between items-start mb-2">
						<div class="flex items-center gap-2 text-indigo-400">
							<button
								onclick={() => playFrom(bookmark.timestampStart)}
								class="bg-indigo-500/20 hover:bg-indigo-500/40 p-1.5 rounded-lg transition-colors text-white"
								title="Phát từ đoạn này"
							>
								<Play class="w-4 h-4 fill-current" />
							</button>
							<span class="font-mono text-sm font-semibold"
								>{formatTimestamp(bookmark.timestampStart)}</span
							>
						</div>
						<div class="flex gap-2">
							<button class="text-slate-500 hover:text-white transition"
								><Edit3 class="w-4 h-4" /></button
							>
							<button
								onclick={() => handleDelete(bookmark.id)}
								class="text-slate-500 hover:text-red-400 transition"
								><Trash2 class="w-4 h-4" /></button
							>
						</div>
					</div>
					<p
						class="text-slate-200 text-sm leading-relaxed mt-2 {bookmark.note
							? ''
							: 'italic text-slate-400'}"
					>
						{bookmark.note || 'Chạm để thêm ghi chú...'}
					</p>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Thanh nhập liệu nhanh -->
	<div class="p-4 border-t border-slate-800 bg-slate-900 pb-safe">
		<div class="flex gap-2 relative items-center">
			<button
				class="w-10 h-10 shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center transition-colors pointer-events-none"
				title="Mốc thời gian hiện tại"
			>
				<span class="font-mono text-[10px] font-bold"
					>{formatTimestamp(audioEngine.currentPosition)}</span
				>
			</button>
			<input
				type="text"
				bind:value={newNote}
				onkeydown={(e) => e.key === 'Enter' && handleAddNote()}
				placeholder="Ghi chú nhanh..."
				class="w-full bg-slate-800 text-sm text-white rounded-xl px-4 py-3 outline-none border border-slate-700 focus:border-indigo-500 transition-colors"
			/>
			<button
				onclick={handleAddNote}
				disabled={!currentTrack}
				class="w-12 h-12 shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20"
			>
				<Send class="w-5 h-5 ml-0.5" />
			</button>
		</div>
	</div>
</div>
