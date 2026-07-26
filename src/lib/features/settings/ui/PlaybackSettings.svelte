<script lang="ts">
	import { settingsService, type PostBookmarkAction } from '../infrastructure/settings-service';
	import { onMount } from 'svelte';

	let speed = $state(1.0);
	let action = $state<PostBookmarkAction>('CONTINUE');

	const actions = [
		{ value: 'CONTINUE', label: 'Tiếp tục phát' },
		{ value: 'PAUSE_FOR_NOTE', label: 'Tạm dừng để ghi chú' }
	];

	onMount(() => {
		const sub1 = settingsService.observeDefaultPlaybackSpeed().subscribe((val) => {
			speed = val;
		});
		const sub2 = settingsService.observeBookmarkPostAction().subscribe((val) => {
			action = val;
		});
		return () => {
			sub1.unsubscribe();
			sub2.unsubscribe();
		};
	});

	let saveTimeout: ReturnType<typeof setTimeout>;

	function handleSpeedChange() {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			settingsService.setDefaultPlaybackSpeed(speed);
		}, 300);
	}

	function handleActionChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		settingsService.setBookmarkPostAction(target.value as PostBookmarkAction);
	}
</script>

<div class="settings-card">
	<h3>Cấu hình Phát</h3>

	<div class="setting-item">
		<div class="setting-header">
			<label for="speed">Tốc độ phát mặc định</label>
			<span>{speed.toFixed(1)}x</span>
		</div>
		<input
			type="range"
			id="speed"
			min="0.5"
			max="3.0"
			step="0.1"
			bind:value={speed}
			oninput={handleSpeedChange}
		/>
		<p class="description">Tốc độ này sẽ được áp dụng cho các track chưa từng được phát.</p>
	</div>

	<div class="setting-item">
		<div class="setting-header">
			<label for="action">Hành động sau khi Bookmark</label>
		</div>
		<select id="action" bind:value={action} onchange={handleActionChange}>
			{#each actions as a}
				<option value={a.value}>{a.label}</option>
			{/each}
		</select>
		<p class="description">
			Điều khiển xem app có tiếp tục phát sau khi bạn bấm tạo Bookmark nhanh hay không.
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

	select {
		width: 100%;
		padding: 0.5rem;
		border-radius: 4px;
		background: var(--surface-3, #374151);
		color: var(--text-1, #f3f4f6);
		border: 1px solid var(--border, #4b5563);
		font-size: 0.95rem;
	}

	.description {
		margin: 0.5rem 0 0 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		line-height: 1.4;
	}
</style>
