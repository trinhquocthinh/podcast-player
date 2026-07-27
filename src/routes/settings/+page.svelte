<script lang="ts">
	import StorageInfo from '$lib/features/settings/ui/StorageInfo.svelte';
	import PlaybackSettings from '$lib/features/settings/ui/PlaybackSettings.svelte';
	import SilenceSkipSettings from '$lib/features/settings/ui/SilenceSkipSettings.svelte';
	import CloudSyncSettings from '$lib/features/settings/ui/CloudSyncSettings.svelte';
	import AiAssistSettings from '$lib/features/settings/ui/AiAssistSettings.svelte';
</script>

<div id="tab-settings" class="tab-content active h-full overflow-y-auto bg-slate-950 pb-24">
	<!-- Header -->
	<div
		class="px-6 pt-12 pb-6 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-20 border-b border-slate-800/50"
	>
		<h1 class="text-3xl font-extrabold text-white tracking-tight">Cài đặt</h1>
		<p class="text-sm text-slate-400 mt-1">Quản lý trải nghiệm cá nhân hóa của bạn</p>
	</div>

	<!-- Content -->
	<div class="px-6 py-6 space-y-8 mx-auto">
		<SilenceSkipSettings />
		<PlaybackSettings />
		<CloudSyncSettings />
		<AiAssistSettings />
		<StorageInfo />
	</div>
</div>
