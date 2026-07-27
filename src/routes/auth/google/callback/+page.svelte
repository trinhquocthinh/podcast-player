<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toastState } from '$lib/core/ui/toastState.svelte';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorMessage = $state('');

	onMount(async () => {
		const url = new URL(window.location.href);
		const code = url.searchParams.get('code');
		const error = url.searchParams.get('error');

		if (error) {
			status = 'error';
			errorMessage =
				error === 'access_denied'
					? 'Bạn đã từ chối quyền truy cập Google Drive.'
					: `Lỗi OAuth: ${error}`;
			return;
		}

		if (!code) {
			status = 'error';
			errorMessage = 'Không nhận được mã xác thực từ Google.';
			return;
		}

		try {
			// Store the code temporarily and redirect to settings
			// The CloudSyncSettings component will handle the code exchange
			sessionStorage.setItem('google_oauth_code', code);
			status = 'success';

			toastState.add('success', 'Đã kết nối Google Drive thành công!');

			// Redirect back to settings after a short delay
			setTimeout(() => {
				goto('/settings', { replaceState: true });
			}, 1000);
		} catch (err) {
			status = 'error';
			errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
		}
	});
</script>

<div class="page-container">
	<div class="callback-container">
		{#if status === 'loading'}
			<div class="status-card">
				<div class="spinner"></div>
				<h2>Đang xử lý...</h2>
				<p>Đang kết nối với Google Drive</p>
			</div>
		{:else if status === 'success'}
			<div class="status-card success">
				<svg
					class="check-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
				<h2>Kết nối thành công!</h2>
				<p>Đang chuyển về trang Cài đặt...</p>
			</div>
		{:else}
			<div class="status-card error">
				<svg
					class="error-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				<h2>Kết nối thất bại</h2>
				<p>{errorMessage}</p>
				<a href="/settings" class="btn btn-primary">Quay lại Cài đặt</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.callback-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.status-card {
		text-align: center;
		padding: 3rem 2rem;
		background: var(--surface-2, #1f2937);
		border-radius: 16px;
		border: 1px solid var(--border, #374151);
		max-width: 400px;
		width: 100%;
	}

	.status-card h2 {
		margin: 1rem 0 0.5rem;
		font-size: 1.5rem;
		color: var(--text-1, #f3f4f6);
	}

	.status-card p {
		color: var(--text-2, #9ca3af);
		margin: 0 0 1.5rem;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--border, #374151);
		border-top-color: var(--accent, #8b5cf6);
		border-radius: 50%;
		margin: 0 auto;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.check-icon {
		width: 48px;
		height: 48px;
		color: #22c55e;
		margin: 0 auto;
	}

	.error-icon {
		width: 48px;
		height: 48px;
		color: #ef4444;
		margin: 0 auto;
	}

	.success h2 {
		color: #22c55e;
	}

	.error h2 {
		color: #ef4444;
	}
</style>
