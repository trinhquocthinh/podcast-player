<script lang="ts">
	import { player } from '../application/player.svelte';
	import { audioEngine } from '../infrastructure/engine.svelte';

	// Calculate speed adjusted time saved based on current position
	// If played 60 seconds of audio at 2x speed, it took 30 seconds of real time.
	// The time saved is 60 - 30 = 30 seconds.
	// So timeSaved = currentPosition - (currentPosition / speed)
	let speedAdjustedTime = $derived(
		audioEngine.speed > 1.0
			? audioEngine.currentPosition - audioEngine.currentPosition / audioEngine.speed
			: 0
	);

	let silenceSkippedTime = $derived(player.silenceSkippedTime);

	function formatTime(seconds: number): string {
		if (!seconds || seconds <= 0) return '0s';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	}
</script>

{#if silenceSkippedTime > 0 || speedAdjustedTime > 0}
	<div class="time-saved-display">
		<span class="label">Time Saved:</span>
		<div class="metrics">
			{#if silenceSkippedTime > 0}
				<span class="metric silence" title="Silence Skipped">
					✂️ {formatTime(silenceSkippedTime)}
				</span>
			{/if}
			{#if speedAdjustedTime > 0}
				<span class="metric speed" title="Speed Adjusted">
					⚡ {formatTime(speedAdjustedTime)}
				</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.time-saved-display {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		font-size: 0.75rem;
		color: var(--text-muted, #888);
		background: rgba(0, 0, 0, 0.2);
		padding: 4px 8px;
		border-radius: 6px;
	}

	.label {
		font-weight: 600;
		margin-bottom: 2px;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.metrics {
		display: flex;
		gap: 8px;
	}

	.metric {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.metric.silence {
		color: var(--primary, #3498db);
	}

	.metric.speed {
		color: var(--secondary, #2ecc71);
	}
</style>
