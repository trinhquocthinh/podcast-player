<script lang="ts">
	import StorageInfo from '$lib/features/settings/ui/StorageInfo.svelte';
	import PlaybackSettings from '$lib/features/settings/ui/PlaybackSettings.svelte';
	import SilenceSkipSettings from '$lib/features/settings/ui/SilenceSkipSettings.svelte';
	import ThemeSettings from '$lib/features/settings/ui/ThemeSettings.svelte';
	import CloudSyncSettings from '$lib/features/settings/ui/CloudSyncSettings.svelte';
	import AiAssistSettings from '$lib/features/settings/ui/AiAssistSettings.svelte';
	import { ChevronRight } from 'lucide-svelte';
</script>

<div id="tab-settings" class="tab-content active">
	<header class="p-6 pt-10">
		<h1 class="text-2xl font-bold text-white tracking-tight">Cài đặt</h1>
	</header>

	<section class="px-6 space-y-6 pb-8">
		<StorageInfo />
		<PlaybackSettings />
		<SilenceSkipSettings />
		<ThemeSettings />

		<div>
			<h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
				Dữ liệu & Ngoại tuyến
			</h2>
			<div class="glass-card rounded-2xl overflow-hidden border border-slate-700/50">
				<a
					href="/settings/offline"
					class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
				>
					<div>
						<h3 class="font-medium text-slate-200 group-hover:text-white transition-colors">
							Quản lý Tải xuống
						</h3>
						<p class="text-xs text-slate-400 mt-0.5">Quản lý các track đã tải về để nghe offline</p>
					</div>
					<ChevronRight
						class="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors"
					/>
				</a>

				<div class="border-t border-slate-700/50"></div>

				<a
					href="/settings/backup"
					class="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
				>
					<div>
						<h3 class="font-medium text-slate-200 group-hover:text-white transition-colors">
							Sao lưu & Phục hồi
						</h3>
						<p class="text-xs text-slate-400 mt-0.5">
							Tạo bản sao lưu thư viện hoặc phục hồi từ file JSON
						</p>
					</div>
					<ChevronRight
						class="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors"
					/>
				</a>
			</div>
		</div>

		<AiAssistSettings />
		<CloudSyncSettings />
	</section>
</div>
