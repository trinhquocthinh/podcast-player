<script lang="ts">
	import { library } from '../application/library.svelte';
	import { AppError } from '$lib/core/types/errors';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { FolderUp } from 'lucide-svelte';

	let { isOpen = $bindable(false) } = $props();

	let feedUrl = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let isLoading = $state(false);

	async function handleAddRSS() {
		if (!feedUrl) return;
		isLoading = true;

		try {
			toastState.add('info', 'Đang phân tích RSS Feed...');
			await library.addPodcast(feedUrl);
			toastState.add('success', 'Đã thêm Podcast thành công!');
			feedUrl = '';
			isOpen = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof AppError) {
				if (err.code === 'ALREADY_EXISTS') {
					toastState.add('warning', 'Feed này đã tồn tại trong thư viện.');
				} else {
					toastState.add('error', err.message);
				}
			} else {
				toastState.add('error', 'Lỗi không xác định khi thêm RSS Feed.');
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleAddLocalFile(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isLoading = true;

		try {
			toastState.add('info', 'Đang quét file Audio cục bộ...');
			const result = await library.addLocalFile(file);
			toastState.add('success', 'Đã thêm file audio cục bộ!');
			if (result.warning) {
				toastState.add('warning', result.warning);
			}
			isOpen = false;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof AppError) {
				toastState.add('error', err.message);
			} else {
				toastState.add('error', 'Lỗi khi parse file âm thanh.');
			}
		} finally {
			isLoading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function close() {
		if (!isLoading) isOpen = false;
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm transition-opacity"
		onclick={close}
	></div>

	<div
		class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm glass-panel rounded-3xl z-[110] p-6 shadow-2xl shadow-black"
	>
		<h2 class="text-xl font-bold text-white mb-2">Thêm nội dung mới</h2>
		<p class="text-sm text-slate-400 mb-6">Nhập link RSS hoặc tải file Audio từ máy để bắt đầu.</p>

		<input
			type="url"
			placeholder="https://anchor.fm/s/.../podcast/rss"
			bind:value={feedUrl}
			disabled={isLoading}
			onkeydown={(e) => e.key === 'Enter' && handleAddRSS()}
			class="w-full bg-slate-900/80 text-white rounded-xl px-4 py-3.5 mb-4 border border-slate-700 focus:border-indigo-500 outline-none shadow-inner transition-colors"
		/>

		<input
			type="file"
			accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
			bind:this={fileInput}
			onchange={handleAddLocalFile}
			disabled={isLoading}
			class="hidden"
		/>

		<div class="flex gap-3">
			<button
				onclick={handleAddRSS}
				disabled={isLoading || !feedUrl}
				class="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading ? 'Đang thêm...' : 'Thêm Feed'}
			</button>
			<button
				onclick={() => fileInput.click()}
				disabled={isLoading}
				class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<FolderUp class="w-4 h-4" /> Chọn File
			</button>
		</div>
	</div>
{/if}
