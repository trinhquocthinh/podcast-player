<script lang="ts">
	import StorageInfo from '$lib/features/settings/ui/StorageInfo.svelte';
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Cài đặt</h1>
	</header>

	<div class="settings-content">
		<StorageInfo />

		<section class="settings-section">
			<a href="/settings/offline" class="settings-link">
				<div class="link-content">
					<h3>Quản lý Tải xuống</h3>
					<p>Quản lý các track đã tải về để nghe offline</p>
				</div>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
			</a>
		</section>
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

	.settings-section {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
		overflow: hidden;
	}

	.settings-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		text-decoration: none;
		color: var(--text-1, #f3f4f6);
		transition: background 0.2s;
	}

	.settings-link:hover {
		background: var(--surface-3, #374151);
	}

	.link-content h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
	}

	.link-content p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
	}

	.settings-link svg {
		color: var(--text-2, #9ca3af);
	}
</style>
