<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Track } from '$lib/core/db';
	import {
		exportBookmarksMarkdown,
		exportAllBookmarksMarkdown,
		exportBookmarksJson,
		exportAllBookmarksJson,
		copyToClipboard,
		downloadFile
	} from '$lib/features/export/application/export-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { settingsService } from '$lib/features/settings/infrastructure/settings-service';
	import { aiService } from '$lib/features/ai/infrastructure/ai-service';
	import { onDestroy } from 'svelte';

	let tracksWithBookmarks: Track[] = $state([]);
	let selectedScope: 'all' | 'single' = $state('all');
	let selectedTrackId: string = $state('');
	let selectedFormat: 'markdown' | 'txt' | 'json' = $state('markdown');
	let isExporting = $state(false);

	let isAiAssistEnabled = $state(false);
	let includeAiSummary = $state(false);
	let isSummarizing = $state(false);
	let aiSub: { unsubscribe: () => void } | undefined;

	onMount(async () => {
		aiSub = settingsService.observeAiAssistEnabled().subscribe((val) => {
			isAiAssistEnabled = val;
			if (!val) includeAiSummary = false;
		});
		// Find all tracks that have at least one bookmark
		const allBookmarks = await db.bookmarks.toArray();
		const trackIds = Array.from(new Set(allBookmarks.map((b) => b.trackId)));
		if (trackIds.length > 0) {
			tracksWithBookmarks = await db.tracks.where('id').anyOf(trackIds).toArray();
			if (tracksWithBookmarks.length > 0) {
				selectedTrackId = tracksWithBookmarks[0].id;
			}
		}
	});

	onDestroy(() => {
		if (aiSub) aiSub.unsubscribe();
	});

	async function getSummaryText(): Promise<string> {
		if (!includeAiSummary) return '';
		isSummarizing = true;
		try {
			const bookmarks =
				selectedScope === 'all'
					? await db.bookmarks.toArray()
					: await db.bookmarks.where('trackId').equals(selectedTrackId).toArray();

			const notes = bookmarks.filter((b) => b.note).map((b) => b.note!);
			if (notes.length === 0) return '';

			const summary = await aiService.summarizeNotes(notes);
			return summary ? `\n> **[AI Summary]**\n> ${summary}\n\n---\n\n` : '';
		} catch (error: unknown) {
			console.error('AI Summary Error:', error);
			toastState.add('error', (error as Error).message || 'Lỗi khi tóm tắt AI');
			return '';
		} finally {
			isSummarizing = false;
		}
	}

	async function handleCopy() {
		try {
			isExporting = true;
			const summaryText = await getSummaryText();
			let content = '';

			if (selectedFormat === 'json') {
				let jsonStr =
					selectedScope === 'all'
						? await exportAllBookmarksJson()
						: await exportBookmarksJson(selectedTrackId);

				if (summaryText) {
					// We just inject summary into the JSON object if we parse it
					const jsonObj = JSON.parse(jsonStr);
					jsonObj.aiSummary = summaryText.replace(/[\n>*-]/g, '').trim(); // raw text
					content = JSON.stringify(jsonObj, null, 2);
				} else {
					content = jsonStr;
				}
			} else {
				let markdown =
					selectedScope === 'all'
						? await exportAllBookmarksMarkdown()
						: await exportBookmarksMarkdown(selectedTrackId);
				content = summaryText + markdown;
			}
			// We use the markdown generator for txt as well since plain text is readable markdown
			await copyToClipboard(content);
			toastState.add('success', 'Đã copy vào clipboard');
		} catch (error) {
			console.error(error);
			toastState.add('error', 'Lỗi khi copy');
		} finally {
			isExporting = false;
		}
	}

	async function handleDownload() {
		try {
			isExporting = true;
			const summaryText = await getSummaryText();
			let content = '';

			if (selectedFormat === 'json') {
				let jsonStr =
					selectedScope === 'all'
						? await exportAllBookmarksJson()
						: await exportBookmarksJson(selectedTrackId);
				if (summaryText) {
					const jsonObj = JSON.parse(jsonStr);
					jsonObj.aiSummary = summaryText.replace(/[\n>*-]/g, '').trim();
					content = JSON.stringify(jsonObj, null, 2);
				} else {
					content = jsonStr;
				}
			} else {
				let markdown =
					selectedScope === 'all'
						? await exportAllBookmarksMarkdown()
						: await exportBookmarksMarkdown(selectedTrackId);
				content = summaryText + markdown;
			}

			let ext = selectedFormat === 'markdown' ? 'md' : 'txt';
			if (selectedFormat === 'json') ext = 'json';
			let filename = `all-bookmarks.${ext}`;

			if (selectedScope === 'single') {
				const track = tracksWithBookmarks.find((t) => t.id === selectedTrackId);
				if (track) {
					// safe filename
					filename = `${track.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-bookmarks.${ext}`;
				} else {
					filename = `track-bookmarks.${ext}`;
				}
			}

			downloadFile(content, filename, selectedFormat);
			toastState.add('success', 'Đã tải xuống file');
		} catch (error) {
			console.error(error);
			toastState.add('error', 'Lỗi khi tải xuống');
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Export Notes</h1>
	</header>

	<div class="card export-container">
		{#if tracksWithBookmarks.length === 0}
			<p class="empty-state">Bạn chưa có bookmark nào để export.</p>
		{:else}
			<div class="form-group">
				<label for="scope">Phạm vi export</label>
				<select id="scope" bind:value={selectedScope} class="select-input">
					<option value="all">Tất cả tracks</option>
					<option value="single">Một track cụ thể</option>
				</select>
			</div>

			{#if selectedScope === 'single'}
				<div class="form-group">
					<label for="track">Chọn track</label>
					<select id="track" bind:value={selectedTrackId} class="select-input">
						{#each tracksWithBookmarks as track (track.id)}
							<option value={track.id}>{track.title}</option>
						{/each}
					</select>
				</div>
			{/if}

			<div class="form-group">
				<label for="format">Định dạng file</label>
				<select id="format" bind:value={selectedFormat} class="select-input">
					<option value="markdown">Markdown (.md)</option>
					<option value="txt">Plain Text (.txt)</option>
					<option value="json">JSON (.json)</option>
				</select>
			</div>

			{#if isAiAssistEnabled}
				<div class="form-group checkbox-group">
					<label>
						<input
							type="checkbox"
							bind:checked={includeAiSummary}
							disabled={isSummarizing || isExporting}
						/>
						✨ Đính kèm tóm tắt AI (Tổng hợp nội dung Note)
					</label>
				</div>
			{/if}

			<div class="actions">
				<button
					class="btn btn-secondary"
					onclick={handleCopy}
					disabled={isExporting || isSummarizing}
				>
					{#if isSummarizing}
						Đang tóm tắt...
					{:else}
						Copy to Clipboard
					{/if}
				</button>
				<button
					class="btn btn-primary"
					onclick={handleDownload}
					disabled={isExporting || isSummarizing}
				>
					{#if isSummarizing}
						Đang tóm tắt...
					{:else}
						Download {selectedFormat === 'markdown'
							? '.md'
							: selectedFormat === 'txt'
								? '.txt'
								: '.json'}
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.export-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-weight: 500;
		color: var(--text-secondary);
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		color: var(--primary, #3b82f6);
	}

	.select-input {
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 1rem;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.empty-state {
		text-align: center;
		color: var(--text-secondary);
		padding: 2rem 0;
	}
</style>
