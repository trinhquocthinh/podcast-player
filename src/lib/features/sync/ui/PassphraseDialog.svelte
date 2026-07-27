<script lang="ts">
	import { SYNC_CONSTANTS } from '$lib/features/sync/domain/sync-types';
	import { Eye, EyeOff, AlertTriangle } from 'lucide-svelte';

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
			class="dialog glass-card"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="passphrase-title"
			tabindex="-1"
		>
			<h2 id="passphrase-title" class="text-xl font-medium text-white mb-4">
				{mode === 'setup' ? 'Tạo Passphrase mã hóa' : 'Nhập Passphrase'}
			</h2>

			{#if mode === 'setup'}
				<div
					class="flex items-start gap-3 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
				>
					<AlertTriangle class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
					<p class="text-xs text-amber-500/90 leading-relaxed">
						<strong>Quan trọng:</strong> Nếu bạn quên passphrase, dữ liệu đã mã hóa trên Google
						Drive <strong class="text-amber-400">KHÔNG THỂ</strong> khôi phục. Hãy lưu passphrase ở nơi
						an toàn.
					</p>
				</div>

				<p class="text-sm text-slate-400 mb-6 leading-relaxed">
					Passphrase này dùng để mã hóa dữ liệu trước khi đồng bộ. Bạn cần nhập lại passphrase này
					trên mỗi thiết bị mới.
				</p>
			{:else}
				<p class="text-sm text-slate-400 mb-6 leading-relaxed">
					Nhập passphrase bạn đã tạo khi thiết lập Cloud Sync lần đầu.
				</p>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
			>
				<div class="mb-4">
					<label for="passphrase-input" class="block text-sm text-slate-400 mb-2">Passphrase</label>
					<div class="relative">
						<input
							id="passphrase-input"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={passphrase}
							placeholder="Nhập passphrase..."
							autocomplete="off"
							minlength={SYNC_CONSTANTS.MIN_PASSPHRASE_LENGTH}
							class="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
						/>
						<button
							type="button"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
							onclick={() => (showPassphrase = !showPassphrase)}
							aria-label={showPassphrase ? 'Ẩn passphrase' : 'Hiện passphrase'}
						>
							{#if showPassphrase}
								<EyeOff class="w-5 h-5" />
							{:else}
								<Eye class="w-5 h-5" />
							{/if}
						</button>
					</div>
				</div>

				{#if mode === 'setup'}
					<div class="mb-4">
						<label for="confirm-passphrase-input" class="block text-sm text-slate-400 mb-2"
							>Xác nhận Passphrase</label
						>
						<input
							id="confirm-passphrase-input"
							type={showPassphrase ? 'text' : 'password'}
							bind:value={confirmPassphrase}
							placeholder="Nhập lại passphrase..."
							autocomplete="off"
							class="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
						/>
					</div>
				{/if}

				{#if error}
					<p class="text-sm text-red-400 mb-4">{error}</p>
				{/if}

				<div class="flex justify-end gap-3 mt-6">
					<button
						type="button"
						class="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
						onclick={handleCancel}
					>
						Hủy
					</button>
					<button
						type="submit"
						class="px-4 py-2 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
						disabled={!passphrase}
					>
						{mode === 'setup' ? 'Tạo \u0026 Kết nối' : 'Mở khóa'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

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
		border-radius: 16px;
		padding: 2rem;
		max-width: 480px;
		width: 100%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}
</style>
