<script lang="ts">
	/**
	 * CloudSyncSettings — Main Cloud Sync configuration UI
	 *
	 * BR-P2-CLOUD-001: Mặc định TẮT, user phải chủ động bật
	 * BR-P2-CLOUD-002: Passphrase dialog trước khi kết nối
	 * BR-P2-CLOUD-005: Ngắt kết nối xóa remote, giữ local
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import { settingsService } from '$lib/features/settings/infrastructure/settings-service';
	import { syncService } from '$lib/features/sync/application/sync-service';
	import { GoogleDriveProvider } from '$lib/features/sync/infrastructure/google-drive-provider';
	import {
		createVerificationToken,
		verifyWithToken
	} from '$lib/features/sync/infrastructure/crypto-service';

	import type { SyncState } from '$lib/features/sync/domain/sync-types';
	import PassphraseDialog from '$lib/features/sync/ui/PassphraseDialog.svelte';
	import SyncStatusIndicator from '$lib/features/sync/ui/SyncStatusIndicator.svelte';
	import { db } from '$lib/core/db';
	import { CloudSync } from 'lucide-svelte';

	// State
	let isEnabled = $state(false);
	let isConnected = $state(false);
	let syncState = $state<SyncState>({
		status: 'disconnected',
		lastSyncAt: null,
		error: null,
		provider: null
	});
	let showPassphraseDialog = $state(false);
	let passphraseMode = $state<'setup' | 'unlock'>('setup');
	let isSyncing = $state(false);
	let showDisconnectConfirm = $state(false);
	let clientId = $state('');

	onMount(async () => {
		if (!browser) return;

		// Load state
		isEnabled = await settingsService.isCloudSyncEnabled();
		const provider = await settingsService.getCloudSyncProvider();
		isConnected = provider === 'google_drive' && isEnabled;

		// Check for OAuth callback code in sessionStorage
		const oauthCode = sessionStorage.getItem('google_oauth_code');
		if (oauthCode) {
			sessionStorage.removeItem('google_oauth_code');
			await handleOAuthCallback(oauthCode);
		}

		// Fetch client ID from server (public value)
		try {
			const res = await fetch('/api/auth/google/client-id');
			if (res.ok) {
				const data = await res.json();
				clientId = data.clientId;
			}
		} catch {
			console.warn('Could not fetch Google client ID');
		}

		// Subscribe to sync state changes
		syncService.onStateChange = (state) => {
			syncState = state;
			isSyncing = state.status === 'syncing';
		};

		// If already connected, try to initialize and auto-sync
		if (isConnected && clientId) {
			const storedToken = await db.settings.get('cloud_sync_passphrase_token');
			if (storedToken?.value) {
				// Need passphrase to initialize — show unlock dialog
				showPassphraseDialog = true;
				passphraseMode = 'unlock';
			}
		}
	});

	async function handleEnableToggle() {
		if (!isEnabled) {
			// User wants to enable — show passphrase setup
			showPassphraseDialog = true;
			passphraseMode = 'setup';
		} else {
			// User wants to disable — show disconnect confirmation
			showDisconnectConfirm = true;
		}
	}

	async function handlePassphraseConfirm(passphrase: string) {
		showPassphraseDialog = false;

		if (passphraseMode === 'setup') {
			await setupCloudSync(passphrase);
		} else {
			await unlockAndSync(passphrase);
		}
	}

	async function setupCloudSync(passphrase: string) {
		try {
			// Create passphrase verification token
			const token = await createVerificationToken(passphrase);
			await db.settings.put({ key: 'cloud_sync_passphrase_token', value: token });

			// Store settings
			await settingsService.setCloudSyncEnabled(true);
			await settingsService.setCloudSyncProvider('google_drive');

			isEnabled = true;

			// Initialize provider and start OAuth
			if (clientId) {
				const provider = new GoogleDriveProvider(passphrase, clientId);
				await provider.connect(); // Will redirect to Google
			} else {
				toastState.add('error', 'Chưa cấu hình Google Client ID');
				await settingsService.setCloudSyncEnabled(false);
				isEnabled = false;
			}
		} catch (error) {
			console.error('Setup cloud sync failed:', error);
			toastState.add('error', 'Lỗi khi thiết lập Cloud Sync');
			await settingsService.setCloudSyncEnabled(false);
			isEnabled = false;
		}
	}

	async function handleOAuthCallback(code: string) {
		try {
			const storedToken = await db.settings.get('cloud_sync_passphrase_token');
			if (!storedToken?.value) {
				toastState.add('error', 'Không tìm thấy passphrase token');
				return;
			}

			// Need passphrase to complete connection — show unlock dialog
			showPassphraseDialog = true;
			passphraseMode = 'unlock';

			// Store the code for later use
			sessionStorage.setItem('pending_oauth_code', code);
		} catch (error) {
			console.error('OAuth callback handling failed:', error);
			toastState.add('error', 'Lỗi khi kết nối Google Drive');
		}
	}

	async function unlockAndSync(passphrase: string) {
		try {
			// Verify passphrase
			const storedToken = await db.settings.get('cloud_sync_passphrase_token');
			if (storedToken?.value) {
				const isValid = await verifyWithToken(storedToken.value, passphrase);
				if (!isValid) {
					toastState.add('error', 'Passphrase không đúng');
					return;
				}
			}

			if (!clientId) {
				toastState.add('error', 'Chưa cấu hình Google Client ID');
				return;
			}

			const provider = new GoogleDriveProvider(passphrase, clientId);

			// Check for pending OAuth code
			const pendingCode = sessionStorage.getItem('pending_oauth_code');
			if (pendingCode) {
				sessionStorage.removeItem('pending_oauth_code');
				await provider.completeConnection(pendingCode);
			}

			await syncService.initialize(provider, passphrase);

			isConnected = provider.isConnected();
			if (isConnected) {
				// Perform initial sync
				await syncService.syncNow();
				syncService.startAutoSync();
				toastState.add('success', 'Cloud Sync đã sẵn sàng!');
			}
		} catch (error) {
			console.error('Unlock and sync failed:', error);
			toastState.add('error', error instanceof Error ? error.message : 'Lỗi kết nối');
		}
	}

	async function handleSyncNow() {
		if (syncState.status === 'disconnected') {
			showPassphraseDialog = true;
			passphraseMode = 'unlock';
			return;
		}

		try {
			isSyncing = true;
			await syncService.syncNow();
			toastState.add('success', 'Đồng bộ thành công!');
		} catch (error) {
			console.error('Manual sync failed:', error);
			toastState.add('error', 'Lỗi đồng bộ');
		} finally {
			isSyncing = false;
		}
	}

	async function handleDisconnect() {
		showDisconnectConfirm = false;

		try {
			await syncService.disconnect();
			await settingsService.setCloudSyncEnabled(false);
			await settingsService.setCloudSyncProvider('');

			isEnabled = false;
			isConnected = false;
			syncState = { status: 'disconnected', lastSyncAt: null, error: null, provider: null };

			toastState.add(
				'success',
				'Đã ngắt kết nối Cloud Sync. Dữ liệu trên thiết bị vẫn được giữ nguyên.'
			);
		} catch (error) {
			console.error('Disconnect failed:', error);
			toastState.add('error', 'Lỗi khi ngắt kết nối');
		}
	}
</script>

<section>
	<h2
		class="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"
	>
		<CloudSync class="w-4 h-4" /> Đồng bộ đám mây
	</h2>
	<div class="glass-card rounded-3xl border border-slate-700/50 p-4">
		<div class="flex items-start gap-4">
			<div
				class="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20"
			>
				<svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"
					><path
						d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5M9.73 15L6.3 21h13.12l3.43-6M12 3.5L8.57 9.5h13.12l-3.43-6"
					/></svg
				>
			</div>
			<div class="flex-1">
				<h3 class="font-semibold text-white">Google Drive Sync</h3>
				<p class="text-xs text-slate-400 mt-1 leading-relaxed">
					Đồng bộ E2EE (Mã hóa đầu cuối) thông qua AppData ẩn. Dữ liệu của bạn được bảo mật 100%.
				</p>
				{#if isConnected}
					<div class="mt-2 text-[10px]">
						<SyncStatusIndicator status={syncState.status} lastSyncAt={syncState.lastSyncAt} />
					</div>
					{#if syncState.error}
						<div class="mt-2 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded">
							⚠️ {syncState.error}
						</div>
					{/if}
				{/if}
			</div>
		</div>

		{#if !isEnabled}
			<div class="mt-4 flex gap-2">
				<button
					onclick={handleEnableToggle}
					class="flex-1 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
				>
					Kết nối tài khoản
				</button>
			</div>
		{:else if isConnected}
			<div class="mt-4 flex gap-2">
				<button
					onclick={handleSyncNow}
					disabled={isSyncing}
					class="flex-1 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
				>
					{isSyncing ? '🔄 Đang đồng bộ...' : '🔄 Đồng bộ ngay'}
				</button>
				<button
					onclick={() => (showDisconnectConfirm = true)}
					class="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl font-semibold text-sm hover:text-white transition"
				>
					Ngắt kết nối
				</button>
			</div>
		{:else}
			<div class="mt-4 flex gap-2">
				<p class="text-xs text-slate-400 flex-1 flex items-center">Đang chờ kết nối...</p>
				<button
					onclick={handleEnableToggle}
					class="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl font-semibold text-sm hover:text-white transition"
				>
					Thử lại
				</button>
			</div>
		{/if}
	</div>
</section>

<!-- Passphrase Dialog -->
<PassphraseDialog
	mode={passphraseMode}
	open={showPassphraseDialog}
	onConfirm={handlePassphraseConfirm}
	onCancel={() => (showPassphraseDialog = false)}
/>

<!-- Disconnect Confirmation -->
{#if showDisconnectConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => (showDisconnectConfirm = false)}>
		<div
			class="confirm-dialog glass-card"
			onclick={(e) => e.stopPropagation()}
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
		>
			<h3 class="text-lg font-bold text-white mb-2">Ngắt kết nối Cloud Sync?</h3>
			<p class="text-sm text-slate-400 mb-1">
				Dữ liệu trên Google Drive sẽ bị <strong class="text-red-400">xóa ngay lập tức</strong>.
			</p>
			<p class="text-sm text-slate-400 mb-4">
				Dữ liệu trên thiết bị này sẽ <strong class="text-white">không bị ảnh hưởng</strong>.
			</p>
			<div class="flex gap-2 justify-end">
				<button
					class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition"
					onclick={() => (showDisconnectConfirm = false)}>Hủy</button
				>
				<button
					class="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition"
					onclick={handleDisconnect}>Ngắt kết nối</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
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

	.confirm-dialog {
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
