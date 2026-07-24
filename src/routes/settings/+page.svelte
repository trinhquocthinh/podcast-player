<script lang="ts">
	import StorageInfo from '$lib/features/settings/ui/StorageInfo.svelte';
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Cài đặt</h1>
	</header>

	<div class="settings-content">
		<StorageInfo />
		<!-- Other settings can go here later -->
	</div>
</div>

<style>
	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
	}
</style>
