<script lang="ts">
	import { dialogState } from './dialog.svelte';
	import { fade } from 'svelte/transition';
</script>

{#if dialogState.isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="dialog-overlay"
		transition:fade={{ duration: 200 }}
		onclick={() => dialogState.close()}
	>
		<div class="dialog-content card" onclick={(e) => e.stopPropagation()}>
			<h3>{dialogState.title}</h3>
			<p>{dialogState.message}</p>

			<div class="dialog-actions">
				<button class="btn btn-secondary" onclick={() => dialogState.onCancel?.()}>
					{dialogState.cancelText}
				</button>
				<button class="btn btn-primary" onclick={() => dialogState.onConfirm?.()}>
					{dialogState.confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	}

	.dialog-content {
		min-width: 320px;
		max-width: 90%;
	}

	h3 {
		margin-bottom: var(--spacing-sm);
	}

	p {
		color: var(--text-secondary);
		margin-bottom: var(--spacing-lg);
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-md);
	}
</style>
