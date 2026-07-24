<script lang="ts">
	import { library } from '../application/library.svelte';
	import { AppError } from '$lib/core/types/errors';

	let feedUrl = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let successMsg = $state('');
	let warningMsg = $state('');
	let duplicateFeedUrl = $state(''); // Track URL trùng để gợi ý Refresh
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
				// BR-SRC-003: Gợi ý Refresh khi feed đã tồn tại
				if (err.code === 'ALREADY_EXISTS') {
					// Sử dụng feedUrl đã resolve (RSS thực) nếu có, fallback về URL user nhập
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
			// BR-SRC-002: Hiển thị cảnh báo dung lượng nếu có
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

<div class="add-feed-container">
	<h3>Thêm nguồn phát</h3>

	<div class="form-group">
		<label for="rss-url">Từ RSS Feed hoặc link Apple Podcasts</label>
		<p class="hint">
			Hỗ trợ dán trực tiếp link Apple Podcasts, Pocket Casts. Không hỗ trợ Spotify.
		</p>
		<div class="input-row">
			<input
				id="rss-url"
				type="url"
				placeholder="https://example.com/feed.xml"
				bind:value={feedUrl}
				disabled={isLoading}
			/>
			<button onclick={handleAddRSS} disabled={isLoading || !feedUrl}>
				{isLoading ? 'Đang thêm...' : 'Thêm Podcast'}
			</button>
		</div>
	</div>

	<div class="form-group divider">
		<span>HOẶC</span>
	</div>

	<div class="form-group">
		<label for="local-file">Từ file máy tính (MP3, M4A, WAV)</label>
		<input
			type="file"
			id="local-file"
			accept="audio/mpeg,audio/mp4,audio/wav,audio/ogg"
			bind:this={fileInput}
			onchange={handleAddLocalFile}
			disabled={isLoading}
		/>
	</div>

	{#if error}
		<p class="error">{error}</p>
		{#if duplicateFeedUrl}
			<button class="refresh-suggest-btn" onclick={handleRefreshExisting} disabled={isLoading}>
				🔄 {isLoading ? 'Đang làm mới...' : 'Làm mới Feed này thay vì thêm mới'}
			</button>
		{/if}
	{/if}
	{#if refreshResult}
		<p class="success">{refreshResult}</p>
	{/if}
	{#if warningMsg}
		<p class="warning">⚠️ {warningMsg}</p>
	{/if}
	{#if successMsg}
		<p class="success">{successMsg}</p>
	{/if}
</div>

<style>
	.add-feed-container {
		background: var(--surface-2, #1f2937);
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1.2rem;
		color: var(--text-1, #f3f4f6);
	}

	.form-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		font-size: 0.9rem;
		color: var(--text-2, #9ca3af);
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	input[type='url'] {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--border, #374151);
		border-radius: 6px;
		background: var(--surface-1, #111827);
		color: var(--text-1, #f3f4f6);
	}

	input[type='url']:focus {
		outline: 2px solid var(--primary, #3b82f6);
	}

	input[type='file'] {
		margin-top: 0.5rem;
		color: var(--text-2, #9ca3af);
	}

	button {
		padding: 0.75rem 1.5rem;
		background: var(--primary, #3b82f6);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: var(--primary-hover, #2563eb);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.divider {
		text-align: center;
		color: var(--text-3, #6b7280);
		font-size: 0.85rem;
		margin: 1.5rem 0;
		position: relative;
	}

	.divider::before,
	.divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: var(--border, #374151);
	}

	.divider::before {
		left: 0;
	}
	.divider::after {
		right: 0;
	}

	.error {
		color: var(--danger, #ef4444);
		font-size: 0.9rem;
		margin-top: 1rem;
	}

	.success {
		color: var(--success, #10b981);
		font-size: 0.9rem;
		margin-top: 1rem;
	}

	.warning {
		color: var(--warning, #f59e0b);
		font-size: 0.9rem;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 6px;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--text-3, #6b7280);
		margin: 0.25rem 0 0 0;
		font-style: italic;
	}

	.refresh-suggest-btn {
		margin-top: 0.75rem;
		padding: 0.6rem 1.2rem;
		background: var(--surface-3, #374151);
		color: var(--text-1, #f3f4f6);
		border: 1px solid var(--primary, #3b82f6);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.2s;
		width: 100%;
	}

	.refresh-suggest-btn:hover:not(:disabled) {
		background: var(--primary, #3b82f6);
	}

	.refresh-suggest-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
