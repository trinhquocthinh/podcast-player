<script lang="ts">
	interface Props {
		progress: number; // 0 to 1
		height?: string;
		color?: string;
		backgroundColor?: string;
	}

	let {
		progress,
		height = '4px',
		color = 'var(--accent-primary)',
		backgroundColor = 'var(--bg-tertiary)'
	}: Props = $props();

	// Clamp progress between 0 and 1
	let clampedProgress = $derived(Math.max(0, Math.min(1, progress)));
</script>

<div class="progress-container" style="height: {height}; background-color: {backgroundColor};">
	<div
		class="progress-bar"
		style="width: {clampedProgress * 100}%; background-color: {color};"
	></div>
</div>

<style>
	.progress-container {
		width: 100%;
		border-radius: var(--radius-sm);
		overflow: hidden;
		position: relative;
	}

	.progress-bar {
		height: 100%;
		transition: width 0.1s linear;
	}
</style>
