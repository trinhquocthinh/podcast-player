<script lang="ts">
	import { toastState } from './toast.svelte';
	import { slide } from 'svelte/transition';
</script>

<div class="toast-container">
	{#each toastState.messages as toast (toast.id)}
		<div class="toast toast-{toast.type}" transition:slide={{ duration: 200 }}>
			<span>{toast.message}</span>
			<button class="close-btn" onclick={() => toastState.remove(toast.id)} aria-label="Close">
				&times;
			</button>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: var(--spacing-xl);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		z-index: 9999;
		pointer-events: none;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-width: 300px;
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		font-weight: var(--font-weight-medium);
	}

	.toast-success {
		border-left: 4px solid var(--success);
	}
	.toast-error {
		border-left: 4px solid var(--error);
	}
	.toast-warning {
		border-left: 4px solid var(--warning);
	}
	.toast-info {
		border-left: 4px solid var(--accent-primary);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0 0 0 var(--spacing-md);
	}
	.close-btn:hover {
		color: var(--text-primary);
	}
</style>
