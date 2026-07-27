<script lang="ts">
	import { settingsService } from '../infrastructure/settings-service';
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { onMount } from 'svelte';
	import { AudioLines } from 'lucide-svelte';

	let enabled = $state(true);
	let threshold = $state(-40);
	let duration = $state(300);

	onMount(() => {
		const sub0 = settingsService.observeSilenceSkipEnabled().subscribe((val) => {
			enabled = val;
		});
		const sub1 = settingsService.observeSilenceSkipThreshold().subscribe((val) => {
			threshold = val;
		});
		const sub2 = settingsService.observeSilenceSkipMinDuration().subscribe((val) => {
			duration = val;
		});
		return () => {
			sub0.unsubscribe();
			sub1.unsubscribe();
			sub2.unsubscribe();
		};
	});

	let saveTimeout: ReturnType<typeof setTimeout>;

	function handleChange() {
		// Update engine immediately
		audioEngine.updateSilenceSkipOptions({
			amplitudeThresholdDb: threshold,
			minSilenceDurationMs: duration
		});

		// Debounce saving to DB
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			settingsService.setSilenceSkipThreshold(threshold);
			settingsService.setSilenceSkipMinDuration(duration);
		}, 300);
	}

	function handleToggleChange() {
		settingsService.setSilenceSkipEnabled(enabled);
		// Update engine or logic based on enabled state
	}
</script>

<section>
	<h2
		class="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"
	>
		<AudioLines class="w-4 h-4" /> Audio & Engine
	</h2>
	<div class="glass-card rounded-3xl border border-slate-700/50 overflow-hidden">
		<!-- Toggle -->
		<div class="p-4 flex items-center justify-between border-b border-slate-700/50">
			<div>
				<h3 class="font-semibold text-white">Silence Skipping</h3>
				<p class="text-xs text-slate-400 mt-0.5">Tự động bỏ qua khoảng lặng</p>
			</div>
			<!-- Custom Toggle -->
			<div
				class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in"
			>
				<input
					type="checkbox"
					id="toggle-silence-skip"
					bind:checked={enabled}
					onchange={handleToggleChange}
					class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-indigo-500 appearance-none cursor-pointer z-10 top-0 left-0 checked:right-0 checked:left-auto transition-all duration-300"
				/>
				<label
					for="toggle-silence-skip"
					class="toggle-label block overflow-hidden h-6 rounded-full bg-indigo-500 cursor-pointer"
				></label>
			</div>
		</div>

		<!-- Threshold Slider -->
		<div class="p-4 pb-2" class:opacity-50={!enabled} class:pointer-events-none={!enabled}>
			<div class="flex justify-between text-sm mb-2">
				<span class="text-slate-300">Ngưỡng âm lượng (Threshold)</span>
				<span class="font-mono text-indigo-300 font-medium">{threshold} dB</span>
			</div>
			<input
				type="range"
				min="-60"
				max="-20"
				step="1"
				bind:value={threshold}
				oninput={handleChange}
				class="w-full accent-indigo-500 custom-slider"
			/>
			<div class="flex justify-between text-[10px] text-slate-500 mt-1">
				<span>Nhạy (-60dB)</span>
				<span>Kém nhạy (-20dB)</span>
			</div>
		</div>

		<!-- Duration Slider -->
		<div class="p-4 pt-2" class:opacity-50={!enabled} class:pointer-events-none={!enabled}>
			<div class="flex justify-between text-sm mb-2">
				<span class="text-slate-300">Khoảng lặng tối thiểu</span>
				<span class="font-mono text-indigo-300 font-medium">{duration} ms</span>
			</div>
			<input
				type="range"
				min="100"
				max="1000"
				step="50"
				bind:value={duration}
				oninput={handleChange}
				class="w-full accent-indigo-500 custom-slider"
			/>
			<div class="flex justify-between text-[10px] text-slate-500 mt-1">
				<span>100ms</span>
				<span>1000ms</span>
			</div>
		</div>
	</div>
</section>

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.toggle-checkbox:checked {
		right: 0;
		border-color: #68d391; /* emerald/green for active */
	}
	.toggle-checkbox:checked + .toggle-label {
		background-color: #6366f1; /* indigo-500 */
	}

	/* Custom Range Slider */
	input[type='range'].custom-slider {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
	}
	input[type='range'].custom-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		margin-top: -6px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
	}
	input[type='range'].custom-slider::-webkit-slider-runnable-track {
		width: 100%;
		height: 4px;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}
	input[type='range'].custom-slider:focus {
		outline: none;
	}
</style>
