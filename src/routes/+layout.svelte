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
	import BookmarkModal from '$lib/features/bookmark/ui/BookmarkModal.svelte';

	let { children } = $props();
	let dbReady = $state(false);
	let isBookmarkModalOpen = $state(false);

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
	<title>FocusCast</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="pb-40 min-h-screen relative overflow-x-hidden">
	{@render children()}
</main>

<!-- KHU VỰC CỐ ĐỊNH: Player + Bottom Nav -->
<div class="fixed bottom-0 left-0 w-full z-50">
	<PlayerBar bind:isBookmarkModalOpen />
	<BottomNav />
</div>

<!-- Modal Ghi Chú (Bottom Sheet) -->
<BookmarkModal bind:isOpen={isBookmarkModalOpen} />

<Toast />
<ConfirmDialog />
