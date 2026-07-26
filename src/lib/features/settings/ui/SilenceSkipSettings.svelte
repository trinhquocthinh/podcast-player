<script lang="ts">
	import { settingsService } from '../infrastructure/settings-service';
	import { audioEngine } from '$lib/features/playback/infrastructure/engine.svelte';
	import { onMount } from 'svelte';

	let threshold = $state(-40);
	let duration = $state(300);

	onMount(() => {
		const sub1 = settingsService.observeSilenceSkipThreshold().subscribe((val) => {
			threshold = val;
		});
		const sub2 = settingsService.observeSilenceSkipMinDuration().subscribe((val) => {
			duration = val;
		});
		return () => {
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
</script>

<div class="settings-card">
	<h3>Cấu hình Bỏ qua khoảng lặng</h3>

	<div class="setting-item">
		<div class="setting-header">
			<label for="threshold">Ngưỡng âm thanh (dB)</label>
			<span>{threshold} dB</span>
		</div>
		<input
			type="range"
			id="threshold"
			min="-60"
			max="-20"
			step="1"
			bind:value={threshold}
			oninput={handleChange}
		/>
		<p class="description">
			Ngưỡng để xác định khoảng lặng. Giá trị càng cao (gần 0) càng dễ bị cắt.
		</p>
	</div>

	<div class="setting-item">
		<div class="setting-header">
			<label for="duration">Thời lượng tối thiểu (ms)</label>
			<span>{duration} ms</span>
		</div>
		<input
			type="range"
			id="duration"
			min="100"
			max="1000"
			step="50"
			bind:value={duration}
			oninput={handleChange}
		/>
		<p class="description">
			Độ dài khoảng lặng tối thiểu cần có để tính là khoảng lặng (thời gian trước và sau cũng có thể
			bị ảnh hưởng bởi crossfade).
		</p>
	</div>
</div>

<style>
	.settings-card {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
		padding: 1.5rem;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.1rem;
		color: var(--text-1, #f3f4f6);
	}

	.setting-item {
		margin-bottom: 1.5rem;
	}

	.setting-item:last-child {
		margin-bottom: 0;
	}

	.setting-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		color: var(--text-1, #f3f4f6);
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--primary, #3b82f6);
	}

	.description {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		line-height: 1.4;
	}
</style>
