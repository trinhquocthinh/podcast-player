<script lang="ts">
	import { player } from '../application/player.svelte';
</script>

<button
	class="silence-skip-toggle"
	class:active={player.isSilenceSkipEnabled}
	onclick={() => player.toggleSilenceSkip()}
	title={player.isSilenceSkipEnabled ? 'Disable Silence Skipping' : 'Enable Silence Skipping'}
	aria-label="Toggle silence skipping"
	aria-pressed={player.isSilenceSkipEnabled}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<!-- Scissors icon for skipping/cutting silences -->
		<circle cx="6" cy="6" r="3" />
		<circle cx="6" cy="18" r="3" />
		<line x1="20" y1="4" x2="8.12" y2="15.88" />
		<line x1="14.47" y1="14.48" x2="20" y2="20" />
		<line x1="8.12" y1="8.12" x2="12" y2="12" />
	</svg>
</button>

<style>
	.silence-skip-toggle {
		background: none;
		border: 1px solid var(--border, #444);
		color: var(--text-muted, #888);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.silence-skip-toggle:hover {
		color: var(--text, #fff);
		border-color: var(--text, #fff);
	}

	.silence-skip-toggle.active {
		color: var(--primary, #3498db);
		border-color: var(--primary, #3498db);
		background: rgba(52, 152, 219, 0.1);
	}
</style>
