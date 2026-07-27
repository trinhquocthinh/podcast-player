<script lang="ts">
	import '../app.css';
	import Toast from '$lib/core/ui/Toast.svelte';
	import ConfirmDialog from '$lib/core/ui/ConfirmDialog.svelte';
	import { onMount } from 'svelte';
	import { checkIntegrity } from '$lib/core/db';
	import { getStorageInfo, autoCleanupFIFO } from '$lib/core/storage/storage-monitor';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import PlayerBar from '$lib/features/playback/ui/PlayerBar.svelte';
	import BottomNav from '$lib/core/ui/BottomNav.svelte';

	let { children } = $props();
	let dbReady = $state(false);

	onMount(async () => {
		dbReady = await checkIntegrity();
		if (!dbReady) {
			console.error('Database integrity check failed.');
		}

		// Background storage check
		setTimeout(async () => {
			const info = await getStorageInfo();
			if (info && info.status === 'critical' && info.usagePercentage >= 100) {
				const { clearedTracks, bytesFreed } = await autoCleanupFIFO();
				if (clearedTracks > 0) {
					const sizeMB = (bytesFreed / (1024 * 1024)).toFixed(2);
					toastState.add(
						'success',
						`Đã tự động giải phóng ${sizeMB} MB. ${clearedTracks} episode offline đã bị xóa cache do hết dung lượng.`
					);
				}
			}
		}, 3000);
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

	<!-- Bottom Navigation -->
	<BottomNav />
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
		/* Space for raised player bar and floating bottom nav */
		padding-bottom: calc(180px + env(safe-area-inset-bottom));
	}
</style>
