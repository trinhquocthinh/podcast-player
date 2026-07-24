<script lang="ts">
	import { onMount } from 'svelte';
	import { db, type Track } from '$lib/core/db';
	import {
		exportBookmarksMarkdown,
		exportAllBookmarksMarkdown,
		copyToClipboard,
		downloadFile
	} from '$lib/features/export/application/export-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let tracksWithBookmarks: Track[] = $state([]);
	let selectedScope: 'all' | 'single' = $state('all');
	let selectedTrackId: string = $state('');
	let selectedFormat: 'markdown' | 'txt' = $state('markdown');
	let isExporting = $state(false);

	onMount(async () => {
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

	async function handleCopy() {
		try {
			isExporting = true;
			const content =
				selectedScope === 'all'
					? await exportAllBookmarksMarkdown()
					: await exportBookmarksMarkdown(selectedTrackId);
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
			const content =
				selectedScope === 'all'
					? await exportAllBookmarksMarkdown()
					: await exportBookmarksMarkdown(selectedTrackId);

			const ext = selectedFormat === 'markdown' ? 'md' : 'txt';
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
				</select>
			</div>

			<div class="actions">
				<button class="btn btn-secondary" onclick={handleCopy} disabled={isExporting}>
					Copy to Clipboard
				</button>
				<button class="btn btn-primary" onclick={handleDownload} disabled={isExporting}>
					Download {selectedFormat === 'markdown' ? '.md' : '.txt'}
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
