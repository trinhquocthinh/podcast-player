<script lang="ts">
	import { player } from '../application/player.svelte';
	import PlaybackControls from './PlaybackControls.svelte';
	import SeekBar from './SeekBar.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import SilenceSkipToggle from './SilenceSkipToggle.svelte';
	import TimeSavedDisplay from './TimeSavedDisplay.svelte';

	let currentTrack = $derived(player.currentTrack);
	let error = $derived(player.error);
</script>

<div class="player-bar-wrapper" class:visible={currentTrack !== null}>
	{#if error}
		<div class="error-banner">
			<span>{error.message}</span>
			<button onclick={() => player.dismissError()}>Dismiss</button>
		</div>
	{/if}

	<div class="player-bar">
		<div class="track-info">
			{#if currentTrack}
				<div class="title" title={currentTrack.title}>{currentTrack.title}</div>
			{/if}
		</div>

		<div class="center-controls">
			<PlaybackControls />
			<SeekBar />
		</div>

		<div class="right-controls">
			<TimeSavedDisplay />
			<div class="toggles">
				<SilenceSkipToggle />
				<SpeedControl />
			</div>
		</div>
	</div>
</div>

<style>
	.player-bar-wrapper {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		transform: translateY(100%);
		transition: transform 0.3s ease;
		z-index: 1000;
	}
	.player-bar-wrapper.visible {
		transform: translateY(0);
	}
	.error-banner {
		background: var(--error, #e74c3c);
		color: white;
		padding: 8px 16px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.9rem;
	}
	.error-banner button {
		background: none;
		border: 1px solid white;
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		cursor: pointer;
	}
	.player-bar {
		background: var(--surface-1, #222);
		border-top: 1px solid var(--border, #444);
		padding: 12px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
	}
	.track-info {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.center-controls {
		flex: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.right-controls {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: flex-end;
		gap: 8px;
	}
	.toggles {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	@media (max-width: 768px) {
		.player-bar {
			flex-direction: column;
			gap: 16px;
			padding: 16px;
		}
		.center-controls {
			width: 100%;
		}
		.right-controls {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
