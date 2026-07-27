<script lang="ts">
	import { settingsService } from '../infrastructure/settings-service';
	import { onDestroy } from 'svelte';
	import { Bot, Info } from 'lucide-svelte';

	let isAiAssistEnabled = $state(false);
	let isAiUseCloud = $state(false);
	let aiCloudApiKey = $state('');

	const sub1 = settingsService.observeAiAssistEnabled().subscribe((val) => {
		isAiAssistEnabled = val;
	});

	const sub2 = settingsService.observeAiUseCloud().subscribe((val) => {
		isAiUseCloud = val;
	});

	const sub3 = settingsService.observeAiCloudApiKey().subscribe((val) => {
		aiCloudApiKey = val;
	});

	onDestroy(() => {
		sub1.unsubscribe();
		sub2.unsubscribe();
		sub3.unsubscribe();
	});

	function handleToggleEnabled() {
		settingsService.setAiAssistEnabled(!isAiAssistEnabled);
	}

	function handleToggleCloud() {
		settingsService.setAiUseCloud(!isAiUseCloud);
	}

	function handleSaveApiKey() {
		settingsService.setAiCloudApiKey(aiCloudApiKey);
	}
</script>

<section>
	<h2
		class="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2"
	>
		<Bot class="w-4 h-4" /> AI Assist (Thử nghiệm)
	</h2>
	<div class="glass-card rounded-3xl border border-purple-500/20 overflow-hidden relative">
		<div
			class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"
		></div>

		<div class="p-4 flex items-center justify-between relative z-10 border-b border-purple-500/10">
			<div>
				<h3 class="font-semibold text-white">Transcribe On-device</h3>
				<p class="text-xs text-slate-400 mt-0.5">Bóc băng âm thanh quanh Bookmark</p>
			</div>
			<div class="relative inline-block w-12 mr-2 align-middle select-none">
				<input
					type="checkbox"
					id="toggle-ai-assist"
					checked={isAiAssistEnabled}
					onchange={handleToggleEnabled}
					class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-slate-800 border-4 border-slate-600 appearance-none cursor-pointer z-10 top-0 left-0 checked:bg-white checked:border-purple-500 checked:right-0 checked:left-auto transition-all duration-300"
				/>
				<label
					for="toggle-ai-assist"
					class="toggle-label block overflow-hidden h-6 rounded-full bg-slate-600 cursor-pointer"
				></label>
			</div>
		</div>

		{#if isAiAssistEnabled}
			<div class="p-4 relative z-10 flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<div>
						<h4 class="font-semibold text-white text-sm">Sử dụng Cloud API (Fallback)</h4>
						<p class="text-xs text-slate-400 mt-0.5">
							Dành cho thiết bị yếu, thay vì dùng model cục bộ
						</p>
					</div>
					<div class="relative inline-block w-12 mr-2 align-middle select-none">
						<input
							type="checkbox"
							id="toggle-ai-cloud"
							checked={isAiUseCloud}
							onchange={handleToggleCloud}
							class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-slate-800 border-4 border-slate-600 appearance-none cursor-pointer z-10 top-0 left-0 checked:bg-white checked:border-purple-500 checked:right-0 checked:left-auto transition-all duration-300"
						/>
						<label
							for="toggle-ai-cloud"
							class="toggle-label block overflow-hidden h-6 rounded-full bg-slate-600 cursor-pointer"
						></label>
					</div>
				</div>

				{#if isAiUseCloud}
					<div
						class="flex flex-col gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50"
					>
						<label for="apiKey" class="text-xs font-semibold text-slate-300">OpenAI API Key:</label>
						<div class="flex gap-2">
							<input
								type="password"
								id="apiKey"
								bind:value={aiCloudApiKey}
								placeholder="sk-..."
								class="flex-1 bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-purple-500"
							/>
							<button
								onclick={handleSaveApiKey}
								class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
								>Lưu</button
							>
						</div>
						<p class="text-[10px] text-amber-500/80">
							Lưu ý: API Key của bạn được lưu cục bộ trên trình duyệt.
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<div class="px-4 pb-4 pt-2 relative z-10">
			<p
				class="text-[10px] text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20"
			>
				<Info class="w-3 h-3 inline-block mr-1 -mt-0.5" /> Mô hình mặc định chạy hoàn toàn trên máy, không
				gửi dữ liệu ra ngoài.
			</p>
		</div>
	</div>
</section>

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
