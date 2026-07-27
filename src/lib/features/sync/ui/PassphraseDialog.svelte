<script lang="ts">
	import { SYNC_CONSTANTS } from '$lib/features/sync/domain/sync-types';

	interface Props {
		mode: 'setup' | 'unlock';
		open: boolean;
		onConfirm: (passphrase: string) => void;
		onCancel: () => void;
	}

	let { mode, open, onConfirm, onCancel }: Props = $props();

	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let error = $state('');
	let showPassphrase = $state(false);

	function handleSubmit() {
		error = '';

		if (passphrase.length < SYNC_CONSTANTS.MIN_PASSPHRASE_LENGTH) {
			error = `Passphrase phải có ít nhất ${SYNC_CONSTANTS.MIN_PASSPHRASE_LENGTH} ký tự`;
			return;
		}

		if (mode === 'setup' && passphrase !== confirmPassphrase) {
			error = 'Passphrase không khớp';
			return;
		}

		onConfirm(passphrase);
		resetForm();
	}

	function handleCancel() {
		resetForm();
		onCancel();
	}

	function resetForm() {
		passphrase = '';
		confirmPassphrase = '';
		error = '';
		showPassphrase = false;
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" onclick={handleCancel}>
		<div
			class="dialog"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="passphrase-title"
			tabindex="-1"
		>
			<h2 id="passphrase-title">
				{mode === 'setup' ? 'Tạo Passphrase mã hóa' : 'Nhập Passphrase'}
			</h2>

			{#if mode === 'setup'}
				<div class="warning-box">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
						/>
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					<p>
						<strong>Quan trọng:</strong> Nếu bạn quên passphrase, dữ liệu đã mã hóa trên Google
						Drive
						<strong>KHÔNG THỂ</strong> khôi phục. Hãy lưu passphrase ở nơi an toàn.
					</p>
				</div>

				<p class="description">
					Passphrase này dùng để mã hóa dữ liệu trước khi đồng bộ. Bạn cần nhập lại passphrase này
					trên mỗi thiết bị mới.
				</p>
			{:else}
				<p class="description">Nhập passphrase bạn đã tạo khi thiết lập Cloud Sync lần đầu.</p>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="input-group">
					<label for="passphrase-input">Passphrase</label>
					<div class="input-wrapper">
						<input
							id="passphrase-input"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={passphrase}
							placeholder="Nhập passphrase..."
							autocomplete="off"
							minlength={SYNC_CONSTANTS.MIN_PASSPHRASE_LENGTH}
						/>
						<button
							type="button"
							class="toggle-visibility"
							onclick={() => (showPassphrase = !showPassphrase)}
							aria-label={showPassphrase ? 'Ẩn passphrase' : 'Hiện passphrase'}
						>
							{showPassphrase ? '🙈' : '👁️'}
						</button>
					</div>
				</div>

				{#if mode === 'setup'}
					<div class="input-group">
						<label for="confirm-passphrase-input">Xác nhận Passphrase</label>
						<input
							id="confirm-passphrase-input"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={confirmPassphrase}
							placeholder="Nhập lại passphrase..."
							autocomplete="off"
						/>
					</div>
				{/if}

				{#if error}
					<p class="error-text">{error}</p>
				{/if}

				<div class="button-row">
					<button type="button" class="btn btn-secondary" onclick={handleCancel}> Hủy </button>
					<button type="submit" class="btn btn-primary" disabled={!passphrase}>
						{mode === 'setup' ? 'Tạo \u0026 Kết nối' : 'Mở khóa'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.dialog {
		background: var(--surface-2, #1f2937);
		border: 1px solid var(--border, #374151);
		border-radius: 16px;
		padding: 2rem;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.dialog h2 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		color: var(--text-1, #f3f4f6);
	}

	.warning-box {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.3);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.warning-box svg {
		flex-shrink: 0;
		color: #eab308;
		margin-top: 2px;
	}

	.warning-box p {
		margin: 0;
		font-size: 0.85rem;
		color: #eab308;
		line-height: 1.5;
	}

	.description {
		color: var(--text-2, #9ca3af);
		font-size: 0.9rem;
		line-height: 1.5;
		margin-bottom: 1.5rem;
	}

	.input-group {
		margin-bottom: 1rem;
	}

	.input-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		font-weight: 500;
	}

	.input-wrapper {
		position: relative;
		display: flex;
	}

	.input-group input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--surface-1, #111827);
		border: 1px solid var(--border, #374151);
		border-radius: 8px;
		color: var(--text-1, #f3f4f6);
		font-size: 1rem;
		outline: none;
		transition: border-color 0.2s;
	}

	.input-group input:focus {
		border-color: var(--accent, #8b5cf6);
	}

	.toggle-visibility {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.1rem;
		padding: 0.25rem;
	}

	.error-text {
		color: #ef4444;
		font-size: 0.85rem;
		margin: 0.5rem 0 1rem;
	}

	.button-row {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}
</style>
