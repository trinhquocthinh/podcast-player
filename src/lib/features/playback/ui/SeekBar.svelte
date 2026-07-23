<script lang="ts">
	import { audioEngine } from '../infrastructure/engine.svelte';
	import { formatTimestamp } from '$lib/core/utils/time';

	let position = $derived(audioEngine.currentPosition);
	let duration = $derived(audioEngine.duration);

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		audioEngine.seek(parseFloat(target.value));
	}
</script>

<div class="seek-bar-container">
	<span class="time">{formatTimestamp(position)}</span>
	<input
		type="range"
		class="seek-bar"
		min="0"
		max={duration || 100}
		step="0.1"
		value={position}
		onchange={handleSeek}
		oninput={handleSeek}
		disabled={duration === 0}
	/>
	<span class="time">{formatTimestamp(duration)}</span>
</div>

<style>
	.seek-bar-container {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
	}
	.seek-bar {
		flex: 1;
		cursor: pointer;
	}
	.time {
		font-size: 0.8rem;
		color: var(--text-secondary, #aaa);
		min-width: 5ch;
	}
</style>
