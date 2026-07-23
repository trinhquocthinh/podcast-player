<script lang="ts">
	import { player, PlaybackStatus } from '../application/player.svelte';
	import { audioEngine } from '../infrastructure/engine.svelte';

	let status = $derived(player.status);

	function togglePlay() {
		if (status === PlaybackStatus.PLAYING) {
			player.pause();
		} else {
			player.play();
		}
	}

	function skipBackward() {
		audioEngine.seek(audioEngine.currentPosition - 15);
	}

	function skipForward() {
		audioEngine.seek(audioEngine.currentPosition + 30);
	}
</script>

<div class="controls">
	<button
		onclick={skipBackward}
		aria-label="Skip backward 15 seconds"
		disabled={status === PlaybackStatus.IDLE ||
			status === PlaybackStatus.LOADING ||
			status === PlaybackStatus.ERROR}
	>
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"
			></polygon></svg
		>
	</button>
	<button
		class="play-btn"
		onclick={togglePlay}
		aria-label={status === PlaybackStatus.PLAYING ? 'Pause' : 'Play'}
		disabled={status === PlaybackStatus.IDLE ||
			status === PlaybackStatus.LOADING ||
			status === PlaybackStatus.ERROR}
	>
		{#if status === PlaybackStatus.PLAYING}
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"
				></rect></svg
			>
		{:else if status === PlaybackStatus.LOADING}
			<svg
				class="spinner"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"
				></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line
					x1="16.24"
					y1="16.24"
					x2="19.07"
					y2="19.07"
				></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"
				></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line
					x1="16.24"
					y1="7.76"
					x2="19.07"
					y2="4.93"
				></line></svg
			>
		{:else}
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg
			>
		{/if}
	</button>
	<button
		onclick={skipForward}
		aria-label="Skip forward 30 seconds"
		disabled={status === PlaybackStatus.IDLE ||
			status === PlaybackStatus.LOADING ||
			status === PlaybackStatus.ERROR}
	>
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"
			></polygon></svg
		>
	</button>
</div>

<style>
	.controls {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	button {
		background: none;
		border: none;
		color: var(--text-primary, #fff);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.play-btn {
		background: var(--primary, #4a90e2);
		width: 48px;
		height: 48px;
		border-radius: 50%;
		color: white;
	}
	.spinner {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		100% {
			transform: rotate(360deg);
		}
	}
</style>
