<script lang="ts">
	import '../app.css';
	import Toast from '$lib/core/ui/Toast.svelte';
	import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
	import { onMount } from 'svelte';
	import { checkIntegrity } from '$lib/core/db';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let dbReady = $state(false);

	onMount(async () => {
		dbReady = await checkIntegrity();
		if (!dbReady) {
			console.error('Database integrity check failed.');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<main class="main-content">
		{@render children()}
	</main>

	<!-- Placeholder for PlayerBar in Phase 2 -->
	<div class="player-bar-placeholder">PlayerBar Placeholder</div>
</div>

<Toast />
<ConfirmDialog />

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
		padding-bottom: 80px; /* Space for player bar */
	}

	.player-bar-placeholder {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 80px;
		background-color: var(--bg-secondary);
		border-top: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		z-index: 100;
	}
</style>
