<script lang="ts">
	import { audioEngine } from '../infrastructure/engine.svelte';

	let currentSpeed = $derived(audioEngine.speed);

	function changeSpeed(delta: number) {
		audioEngine.setSpeed(audioEngine.speed + delta);
	}
</script>

<div class="speed-control">
	<button
		onclick={() => changeSpeed(-0.1)}
		aria-label="Decrease speed"
		disabled={currentSpeed <= 0.5}>-</button
	>
	<span class="speed-display">{currentSpeed.toFixed(1)}x</span>
	<button
		onclick={() => changeSpeed(0.1)}
		aria-label="Increase speed"
		disabled={currentSpeed >= 3.0}>+</button
	>
</div>

<style>
	.speed-control {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--surface-2, #333);
		padding: 4px 8px;
		border-radius: 12px;
	}
	button {
		background: none;
		border: none;
		color: var(--text-primary, #fff);
		cursor: pointer;
		font-weight: bold;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.speed-display {
		font-size: 0.9rem;
		min-width: 3ch;
		text-align: center;
	}
</style>
