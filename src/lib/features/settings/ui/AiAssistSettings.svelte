<script lang="ts">
	import { settingsService } from '../infrastructure/settings-service';
	import { onDestroy } from 'svelte';

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

<section class="settings-section">
	<div class="setting-header">
		<div>
			<h3>AI Assist (Thử nghiệm)</h3>
			<p>Hỗ trợ tóm tắt và ghi âm bằng AI</p>
		</div>
		<label class="toggle">
			<input type="checkbox" checked={isAiAssistEnabled} onchange={handleToggleEnabled} />
			<span class="slider"></span>
		</label>
	</div>

	{#if isAiAssistEnabled}
		<div class="setting-content">
			<div class="ai-config-row">
				<div>
					<h4>Sử dụng Cloud API (Fallback)</h4>
					<p>Bật nếu thiết bị yếu, thay vì dùng model cục bộ. Yêu cầu nhập API Key của OpenAI.</p>
				</div>
				<label class="toggle">
					<input type="checkbox" checked={isAiUseCloud} onchange={handleToggleCloud} />
					<span class="slider"></span>
				</label>
			</div>

			{#if isAiUseCloud}
				<div class="api-key-container">
					<label for="apiKey">OpenAI API Key:</label>
					<div class="input-group">
						<input type="password" id="apiKey" bind:value={aiCloudApiKey} placeholder="sk-..." />
						<button class="save-btn" onclick={handleSaveApiKey}>Lưu</button>
					</div>
					<p class="warning-text">Lưu ý: API Key của bạn được lưu cục bộ trên trình duyệt.</p>
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.settings-section {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.setting-header h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
	}

	.setting-header p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
	}

	.setting-content {
		border-top: 1px solid var(--border, #374151);
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ai-config-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.ai-config-row h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.95rem;
	}

	.ai-config-row p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		max-width: 80%;
	}

	.api-key-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--surface-3, #374151);
		padding: 1rem;
		border-radius: 6px;
	}

	.api-key-container label {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.input-group {
		display: flex;
		gap: 0.5rem;
	}

	.input-group input {
		flex: 1;
		background: var(--surface-1, #111827);
		border: 1px solid var(--border, #4b5563);
		color: var(--text-1, #f3f4f6);
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.input-group input:focus {
		outline: none;
		border-color: var(--primary, #3b82f6);
	}

	.save-btn {
		background: var(--primary, #3b82f6);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.save-btn:hover {
		background: var(--primary-hover, #2563eb);
	}

	.warning-text {
		margin: 0;
		font-size: 0.8rem;
		color: var(--warning, #f59e0b);
	}

	/* Toggle Switch Styles */
	.toggle {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
		flex-shrink: 0;
	}

	.toggle input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: var(--surface-3, #4b5563);
		transition: 0.3s;
		border-radius: 24px;
	}

	.slider:before {
		position: absolute;
		content: '';
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: var(--primary, #3b82f6);
	}

	input:focus + .slider {
		box-shadow: 0 0 1px var(--primary, #3b82f6);
	}

	input:checked + .slider:before {
		transform: translateX(20px);
	}
</style>
