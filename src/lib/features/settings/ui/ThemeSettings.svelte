<script lang="ts">
	import { settingsService } from '../infrastructure/settings-service';
	import { onMount } from 'svelte';

	let theme = $state('system');

	const themes = [
		{ value: 'system', label: 'Theo hệ thống' },
		{ value: 'light', label: 'Sáng' },
		{ value: 'dark', label: 'Tối' }
	];

	onMount(() => {
		const sub = settingsService.observeTheme().subscribe((val) => {
			theme = val;
			applyTheme(val);
		});
		return () => {
			sub.unsubscribe();
		};
	});

	function handleThemeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const newTheme = target.value;
		settingsService.setTheme(newTheme);
		applyTheme(newTheme);
	}

	function applyTheme(t: string) {
		if (typeof document === 'undefined') return;
		if (t === 'system') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', t);
		}
	}
</script>

<div class="settings-card">
	<h3>Giao diện</h3>

	<div class="setting-item">
		<div class="setting-header">
			<label for="theme">Chủ đề (Theme)</label>
		</div>
		<select id="theme" bind:value={theme} onchange={handleThemeChange}>
			{#each themes as t}
				<option value={t.value}>{t.label}</option>
			{/each}
		</select>
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

	select {
		width: 100%;
		padding: 0.5rem;
		border-radius: 4px;
		background: var(--surface-3, #374151);
		color: var(--text-1, #f3f4f6);
		border: 1px solid var(--border, #4b5563);
		font-size: 0.95rem;
	}
</style>
