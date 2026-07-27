<script lang="ts">
	import BookmarkList from './BookmarkList.svelte';

	let {
		trackId,
		isOpen = $bindable(false),
		onClose
	} = $props<{
		trackId: string;
		isOpen: boolean;
		onClose: () => void;
	}>();
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="drawer-overlay" onclick={onClose}>
		<div class="drawer-content" onclick={(e) => e.stopPropagation()}>
			<div class="drawer-header">
				<h2>Ghi chú của tập này</h2>
				<button class="close-btn" onclick={onClose} aria-label="Close">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
			<div class="drawer-body">
				<BookmarkList {trackId} />
			</div>
		</div>
	</div>
{/if}

<style>
	.drawer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: flex-end; /* Slide up from bottom */
		z-index: 100000; /* Above PlayerBar */
		animation: fadeIn 0.2s ease;
	}

	.drawer-content {
		background: var(--surface-1, #1a1a1a);
		width: 100%;
		max-width: 800px;
		height: 70vh;
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.drawer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border, #333);
	}

	.drawer-header h2 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--text-1, #f3f4f6);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-2, #9ca3af);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition:
			background 0.2s,
			color 0.2s;
	}

	.close-btn:hover {
		background: var(--surface-2, #2d3748);
		color: var(--text-1, #f3f4f6);
	}

	.drawer-body {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
