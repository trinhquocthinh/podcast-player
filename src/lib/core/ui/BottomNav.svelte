<script lang="ts">
	import { page } from '$app/stores';
</script>

<nav class="bottom-nav">
	<a
		href="/"
		class="nav-item"
		class:active={$page.url.pathname === '/' || $page.url.pathname.startsWith('/podcast')}
	>
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
			<polyline points="9 22 9 12 15 12 15 22"></polyline>
		</svg>
		<span>Thư viện</span>
	</a>
	<a href="/settings" class="nav-item" class:active={$page.url.pathname.startsWith('/settings')}>
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<circle cx="12" cy="12" r="3"></circle>
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
			></path>
		</svg>
		<span>Cài đặt</span>
	</a>
</nav>

<style>
	.bottom-nav {
		position: fixed;
		bottom: calc(16px + env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		background: rgba(30, 30, 30, 0.85); /* Slightly lighter for glass effect */
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 10px 24px;
		gap: 56px; /* Generous spacing between the two icons */
		border-radius: 999px; /* Pill shape */
		z-index: 1000;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		color: var(--text-2, #9ca3af);
		text-decoration: none;
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		min-width: 64px;
	}

	.nav-item:hover {
		color: var(--text-1, #f3f4f6);
		transform: translateY(-2px);
	}

	.nav-item.active {
		color: var(--primary, #3b82f6);
	}

	.nav-item svg {
		width: 24px;
		height: 24px;
	}
</style>
