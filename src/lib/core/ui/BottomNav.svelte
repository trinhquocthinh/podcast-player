<script lang="ts">
	import { page } from '$app/stores';
	import { LayoutGrid, DownloadCloud, Settings } from 'lucide-svelte';
</script>

<!-- BOTTOM NAVIGATION -->
<nav class="glass-panel h-16 w-full flex items-center justify-around px-8 border-t border-white/5">
	<a
		href="/"
		class="nav-btn flex flex-col items-center gap-1 w-16 transition"
		class:text-indigo-400={$page.url.pathname === '/' || $page.url.pathname.startsWith('/podcast')}
		class:text-slate-500={$page.url.pathname !== '/' && !$page.url.pathname.startsWith('/podcast')}
	>
		<LayoutGrid class="w-5 h-5" />
		<span class="text-[10px] font-semibold">Thư viện</span>
	</a>

	<a
		href="/settings/offline"
		class="nav-btn flex flex-col items-center gap-1 w-16 transition hover:text-slate-300"
		class:text-indigo-400={$page.url.pathname.startsWith('/settings/offline')}
		class:text-slate-500={!$page.url.pathname.startsWith('/settings/offline')}
	>
		<DownloadCloud class="w-5 h-5" />
		<span class="text-[10px] font-semibold">Offline</span>
	</a>

	<a
		href="/settings"
		class="nav-btn flex flex-col items-center gap-1 w-16 transition hover:text-slate-300"
		class:text-indigo-400={$page.url.pathname === '/settings'}
		class:text-slate-500={$page.url.pathname !== '/settings'}
	>
		<Settings class="w-5 h-5" />
		<span class="text-[10px] font-semibold">Cài đặt</span>
	</a>
</nav>
