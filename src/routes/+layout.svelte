<script lang="ts">
	import '../app.css';
	import Toast from '$lib/core/ui/Toast.svelte';
	import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
	import { onMount } from 'svelte';
	import { checkIntegrity } from '$lib/core/db';
	import favicon from '$lib/assets/favicon.svg';
	import PlayerBar from '$lib/features/playback/ui/PlayerBar.svelte';

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

	<!-- Player Bar -->
	<PlayerBar />
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
</style>
