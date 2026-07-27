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

<section class="settings-section cloud-sync-section">
	<div class="section-header">
		<div class="section-title-row">
			<div>
				<h3>Cloud Sync</h3>
				<p class="section-description">
					Đồng bộ ghi chú và cài đặt giữa các thiết bị qua Google Drive
				</p>
			</div>
			{#if isConnected}
				<SyncStatusIndicator status={syncState.status} lastSyncAt={syncState.lastSyncAt} />
			{/if}
		</div>
	</div>

	{#if !isEnabled}
		<!-- Disabled state — BR-P2-CLOUD-001: mặc định TẮT -->
		<div class="sync-info">
			<div class="info-card">
				<svg
					class="info-icon"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
					<path d="M12 16v-4" />
					<path d="M12 8h.01" />
				</svg>
				<div>
					<p>
						Dữ liệu được mã hóa đầu-cuối (E2EE) bằng passphrase của bạn trước khi lưu trên Google
						Drive.
					</p>
					<p class="sub-info">
						Chỉ đồng bộ ghi chú, cài đặt và trạng thái phát. <strong>Không</strong> đồng bộ file âm thanh.
					</p>
				</div>
			</div>

			<button class="btn btn-primary" onclick={handleEnableToggle}>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
				Bật Cloud Sync
			</button>
		</div>
	{:else if isConnected}
		<!-- Connected state -->
		<div class="connected-controls">
			<div class="provider-badge">
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="#22c55e"
					stroke-width="2"
				>
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
				<span>Đã kết nối Google Drive</span>
			</div>

			{#if syncState.error}
				<div class="error-banner">
					<span>⚠️ {syncState.error}</span>
				</div>
			{/if}

			<div class="action-buttons">
				<button class="btn btn-secondary" onclick={handleSyncNow} disabled={isSyncing}>
					{isSyncing ? '🔄 Đang đồng bộ...' : '🔄 Đồng bộ ngay'}
				</button>

				<button class="btn btn-danger" onclick={() => (showDisconnectConfirm = true)}>
					Ngắt kết nối
				</button>
			</div>
		</div>
	{:else}
		<!-- Enabled but not connected yet -->
		<div class="sync-info">
			<p class="pending-text">Đang chờ kết nối Google Drive...</p>
			<button class="btn btn-secondary" onclick={handleEnableToggle}> Thử lại </button>
		</div>
	{/if}
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
			class="confirm-dialog"
			onclick={(e) => e.stopPropagation()}
			role="alertdialog"
			aria-modal="true"
		>
			<h3>Ngắt kết nối Cloud Sync?</h3>
			<p>Dữ liệu trên Google Drive sẽ bị <strong>xóa ngay lập tức</strong>.</p>
			<p>Dữ liệu trên thiết bị này sẽ <strong>không bị ảnh hưởng</strong>.</p>
			<div class="button-row">
				<button class="btn btn-secondary" onclick={() => (showDisconnectConfirm = false)}
					>Hủy</button
				>
				<button class="btn btn-danger" onclick={handleDisconnect}>Ngắt kết nối</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.cloud-sync-section {
		background: var(--surface-2, #1f2937);
		border-radius: 8px;
		border: 1px solid var(--border, #374151);
		padding: 1.25rem;
	}

	.section-header {
		margin-bottom: 1rem;
	}

	.section-title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.section-title-row h3 {
		margin: 0 0 0.25rem;
		font-size: 1.1rem;
		color: var(--text-1, #f3f4f6);
	}

	.section-description {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
	}

	.sync-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.info-card {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(139, 92, 246, 0.06);
		border: 1px solid rgba(139, 92, 246, 0.15);
		border-radius: 8px;
	}

	.info-icon {
		flex-shrink: 0;
		color: var(--accent, #8b5cf6);
		margin-top: 2px;
	}

	.info-card p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-2, #9ca3af);
		line-height: 1.5;
	}

	.sub-info {
		margin-top: 0.5rem !important;
		font-size: 0.8rem !important;
		opacity: 0.8;
	}

	.connected-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.provider-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: #22c55e;
		font-weight: 500;
	}

	.error-banner {
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.85rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.btn-danger {
		background: transparent;
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.btn-danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.pending-text {
		color: var(--text-2, #9ca3af);
		font-style: italic;
	}

	/* Disconnect confirm overlay */
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
		background: var(--surface-2, #1f2937);
		border: 1px solid var(--border, #374151);
		border-radius: 16px;
		padding: 2rem;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.confirm-dialog h3 {
		margin: 0 0 1rem;
		color: var(--text-1, #f3f4f6);
	}

	.confirm-dialog p {
		color: var(--text-2, #9ca3af);
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.button-row {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}
</style>
