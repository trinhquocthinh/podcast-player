<script lang="ts">
	import { library } from '../application/library.svelte';
	import { AppError } from '$lib/core/types/errors';

	let feedUrl = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let successMsg = $state('');
	let warningMsg = $state('');
	let duplicateFeedUrl = $state('');
	let refreshResult = $state('');

	let fileInput: HTMLInputElement;

	async function handleAddRSS() {
		if (!feedUrl) return;
		isLoading = true;
		error = '';
		successMsg = '';
		warningMsg = '';
		duplicateFeedUrl = '';
		refreshResult = '';

		try {
			await library.addPodcast(feedUrl);
			successMsg = 'Đã thêm Podcast thành công!';
			feedUrl = '';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof AppError) {
				error = err.message;
				if (err.code === 'ALREADY_EXISTS') {
					duplicateFeedUrl = err.details?.feedUrl || feedUrl;
				}
			} else {
				error = 'Lỗi không xác định khi thêm RSS Feed.';
			}
		} finally {
			isLoading = false;
		}
	}

	async function handleRefreshExisting() {
		if (!duplicateFeedUrl) return;
		isLoading = true;
		error = '';
		refreshResult = '';

		try {
			const addedCount = await library.refreshPodcast(duplicateFeedUrl);
			if (addedCount > 0) {
				refreshResult = `Đã cập nhật! Tìm thấy ${addedCount} tập mới.`;
			} else {
				refreshResult = 'Feed đã được cập nhật. Không có tập mới.';
			}
			duplicateFeedUrl = '';
			feedUrl = '';
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof AppError) {
				error = err.message;
			} else {
				error = 'Lỗi khi làm mới Feed.';
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
		error = '';
		successMsg = '';
		warningMsg = '';
		duplicateFeedUrl = '';
		refreshResult = '';

		try {
			const result = await library.addLocalFile(file);
			successMsg = 'Đã thêm file audio cục bộ!';
			if (result.warning) {
				warningMsg = result.warning;
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (err: any) {
			if (err instanceof AppError) {
				error = err.message;
			} else {
				error = 'Lỗi khi parse file âm thanh.';
			}
		} finally {
			isLoading = false;
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<div class="glass-card rounded-2xl p-6 border border-slate-700/50 mt-8 shadow-lg">
	<h3 class="text-lg font-semibold text-white mb-4">Thêm nguồn phát mới</h3>

	<div class="space-y-4">
		<div>
			<label for="rss-url" class="block text-sm font-medium text-slate-300 mb-1"
				>Từ RSS Feed hoặc link Apple Podcasts</label
			>
			<p class="text-xs text-slate-500 mb-2 italic">
				Hỗ trợ dán trực tiếp link Apple Podcasts, Pocket Casts. Không hỗ trợ Spotify.
			</p>

			<div class="flex flex-col sm:flex-row gap-2">
				<input
					id="rss-url"
					type="url"
					placeholder="https://example.com/feed.xml"
					bind:value={feedUrl}
					disabled={isLoading}
					class="flex-1 bg-slate-800 text-sm text-white rounded-xl px-4 py-3 outline-none border border-slate-700 focus:border-indigo-500 transition-colors placeholder:text-slate-500"
				/>
				<button
					onclick={handleAddRSS}
					disabled={isLoading || !feedUrl}
					class="px-6 py-3 rounded-xl font-medium text-white transition-all bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-indigo-500/20"
				>
					{isLoading ? 'Đang thêm...' : 'Thêm Podcast'}
				</button>
			</div>
		</div>

		<div class="relative flex items-center py-4">
			<div class="flex-grow border-t border-slate-700"></div>
			<span class="flex-shrink-0 mx-4 text-xs font-semibold tracking-wider text-slate-500 uppercase"
				>Hoặc</span
			>
			<div class="flex-grow border-t border-slate-700"></div>
		</div>

		<div>
			<label for="local-file" class="block text-sm font-medium text-slate-300 mb-2"
				>Từ file máy tính (MP3, M4A, WAV)</label
			>
			<input
				type="file"
				id="local-file"
				accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
				bind:this={fileInput}
				onchange={handleAddLocalFile}
				disabled={isLoading}
				class="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
			/>
		</div>
	</div>

	<!-- Thông báo trạng thái -->
	{#if error}
		<div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
			{error}
			{#if duplicateFeedUrl}
				<button
					onclick={handleRefreshExisting}
					disabled={isLoading}
					class="mt-2 w-full py-2 bg-slate-800 border border-indigo-500/50 hover:bg-indigo-500/20 rounded-lg text-indigo-300 font-medium transition-colors"
				>
					🔄 {isLoading ? 'Đang làm mới...' : 'Làm mới Feed này thay vì thêm mới'}
				</button>
			{/if}
		</div>
	{/if}

	{#if refreshResult}
		<div
			class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm"
		>
			{refreshResult}
		</div>
	{/if}

	{#if warningMsg}
		<div
			class="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm"
		>
			⚠️ {warningMsg}
		</div>
	{/if}

	{#if successMsg}
		<div
			class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm"
		>
			✓ {successMsg}
		</div>
	{/if}
</div>
