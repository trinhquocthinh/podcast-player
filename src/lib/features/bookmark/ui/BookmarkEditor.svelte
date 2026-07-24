<script lang="ts">
	import type { Bookmark } from '$lib/core/db';
	import { bookmarkService, MAX_NOTE_LENGTH } from '../infrastructure/bookmark-service';

	let { bookmark, onclose } = $props<{ bookmark: Bookmark; onclose: () => void }>();

	let note = $state(bookmark.note);
	let isSaving = $state(false);
	let error = $state('');

	async function save() {
		if (note.length > MAX_NOTE_LENGTH) {
			error = `Note too long (${note.length}/${MAX_NOTE_LENGTH})`;
			return;
		}

		isSaving = true;
		error = '';
		try {
			await bookmarkService.updateBookmarkNote(bookmark.id, note);
			onclose();
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="editor">
	<textarea
		bind:value={note}
		placeholder="Add your note here..."
		maxlength={MAX_NOTE_LENGTH}
		disabled={isSaving}></textarea>

	<div class="footer">
		<span class="char-count" class:error={note.length > MAX_NOTE_LENGTH}>
			{note.length}/{MAX_NOTE_LENGTH}
		</span>

		{#if error}
			<span class="error-msg">{error}</span>
		{/if}

		<div class="actions">
			<button class="cancel-btn" onclick={onclose} disabled={isSaving}>Cancel</button>
			<button class="save-btn" onclick={save} disabled={isSaving || note === bookmark.note}
				>Save</button
			>
		</div>
	</div>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
		background: var(--surface-2, #2a2a2a);
		padding: 12px;
		border-radius: 8px;
	}
	textarea {
		width: 100%;
		min-height: 80px;
		background: var(--surface-3, #333);
		border: 1px solid var(--border, #444);
		color: var(--text-primary, #fff);
		padding: 8px;
		border-radius: 4px;
		resize: vertical;
		font-family: inherit;
	}
	textarea:focus {
		outline: none;
		border-color: var(--primary, #4a90e2);
	}
	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}
	.char-count {
		color: var(--text-secondary, #aaa);
	}
	.char-count.error {
		color: var(--error, #e74c3c);
	}
	.error-msg {
		color: var(--error, #e74c3c);
		flex: 1;
		margin: 0 12px;
	}
	.actions {
		display: flex;
		gap: 8px;
	}
	button {
		padding: 6px 12px;
		border-radius: 4px;
		border: none;
		cursor: pointer;
		font-weight: 500;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.cancel-btn {
		background: transparent;
		color: var(--text-primary, #fff);
		border: 1px solid var(--border, #444);
	}
	.save-btn {
		background: var(--primary, #4a90e2);
		color: white;
	}
</style>
