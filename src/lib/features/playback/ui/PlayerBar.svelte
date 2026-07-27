<script lang="ts">
	import { player } from '../application/player.svelte';
	import PlaybackControls from './PlaybackControls.svelte';
	import SeekBar from './SeekBar.svelte';
	import SpeedControl from './SpeedControl.svelte';
	import SilenceSkipToggle from './SilenceSkipToggle.svelte';
	import TimeSavedDisplay from './TimeSavedDisplay.svelte';
	import QuickBookmarkButton from '$lib/features/bookmark/ui/QuickBookmarkButton.svelte';
	import BookmarksDrawer from '$lib/features/bookmark/ui/BookmarksDrawer.svelte';

	let currentTrack = $derived(player.currentTrack);
	let error = $derived(player.error);
	let isBookmarksDrawerOpen = $state(false);
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
				<button
					class="drawer-btn"
					onclick={() => (isBookmarksDrawerOpen = true)}
					title="Xem Ghi chú"
					aria-label="Xem Ghi chú"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
					</svg>
				</button>
				<QuickBookmarkButton />
				<SilenceSkipToggle />
				<SpeedControl />
			</div>
		</div>
	</div>
</div>

{#if currentTrack}
	<BookmarksDrawer
		trackId={currentTrack.id}
		isOpen={isBookmarksDrawerOpen}
		onClose={() => (isBookmarksDrawerOpen = false)}
	/>
{/if}

<style>
	.player-bar-wrapper {
		position: fixed;
		bottom: calc(90px + env(safe-area-inset-bottom)); /* Sit above the floating BottomNav */
		left: 16px;
		right: 16px;
		transform: translateY(150%);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
		background: rgba(34, 34, 34, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 12px 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
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
	.drawer-btn {
		background: none;
		border: 1px solid var(--border, #444);
		color: var(--text-secondary, #aaa);
		padding: 6px;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	.drawer-btn:hover {
		color: var(--primary, #4a90e2);
		border-color: var(--primary, #4a90e2);
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
