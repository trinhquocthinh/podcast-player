<script lang="ts">
	interface Props {
		title: string;
		description: string;
		icon?: string;
		actionText?: string;
		onaction?: () => void;
	}

	let { title, description, icon, actionText, onaction }: Props = $props();
</script>

<div class="empty-state">
	{#if icon}
		<div class="icon">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html icon}
		</div>
	{/if}
	<h3>{title}</h3>
	<p>{description}</p>
	{#if actionText && onaction}
		<button class="btn btn-primary" onclick={onaction}>
			{actionText}
		</button>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--spacing-2xl) var(--spacing-md);
		color: var(--text-secondary);
	}

	.icon {
		font-size: 3rem;
		margin-bottom: var(--spacing-md);
		color: var(--text-tertiary);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	:global(.icon svg) {
		width: 48px;
		height: 48px;
	}

	h3 {
		color: var(--text-primary);
		margin-bottom: var(--spacing-sm);
	}

	p {
		margin-bottom: var(--spacing-lg);
		max-width: 400px;
	}
</style>
