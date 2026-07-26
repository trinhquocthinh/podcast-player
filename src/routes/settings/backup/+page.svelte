<script lang="ts">
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import {
		exportFullBackup,
		importFullBackup,
		downloadFile
	} from '$lib/features/export/application/export-service';

	let isExporting = $state(false);
	let isImporting = $state(false);
	let fileInput: HTMLInputElement;

	async function handleExportBackup() {
		try {
			isExporting = true;
			toastState.add('info', 'Đang tạo bản sao lưu...');
			const backupJson = await exportFullBackup();

			const date = new Date();
			const filename = `focuscast-backup-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.json`;

			// We can hack downloadFile by letting it fallback to plain text, but filename is .json
			// The function uses selectedFormat for mimeType. Let's just use 'txt' which gives text/plain.
			downloadFile(backupJson, filename, 'txt');
			toastState.add('success', 'Đã lưu bản sao lưu thành công');
		} catch (error) {
			console.error('Backup error', error);
			toastState.add('error', 'Lỗi khi tạo bản sao lưu');
		} finally {
			isExporting = false;
		}
	}

	function triggerFileInput() {
		fileInput.click();
	}

	async function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;

		const file = target.files[0];
		if (!file.name.endsWith('.json')) {
			toastState.add('error', 'Vui lòng chọn file JSON hợp lệ');
			return;
		}

		try {
			isImporting = true;
			toastState.add('info', 'Đang phục hồi dữ liệu...');

			const text = await file.text();
			await importFullBackup(text);

			toastState.add('success', 'Đã phục hồi dữ liệu thành công. Đang tải lại trang...');

			// Reload page to reflect new DB state across all stores
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			const err = error as Error;
			console.error('Restore error', err);
			toastState.add('error', err.message || 'Lỗi khi phục hồi dữ liệu');
		} finally {
			isImporting = false;
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<div class="page-container">
	<header class="page-header">
		<h1>Sao lưu & Phục hồi</h1>
	</header>

	<div class="card backup-container">
		<section class="backup-section">
			<div class="section-info">
				<h2>Tạo bản sao lưu (Backup)</h2>
				<p>Xuất toàn bộ thư viện, lịch sử nghe và ghi chú của bạn ra một file an toàn.</p>
				<p class="warning">
					Lưu ý: File sao lưu KHÔNG chứa các tệp âm thanh (Local file, Offline download) để tránh
					dung lượng quá lớn.
				</p>
			</div>
			<button
				class="btn btn-primary"
				onclick={handleExportBackup}
				disabled={isExporting || isImporting}
			>
				{isExporting ? 'Đang tạo...' : 'Tải xuống Backup'}
			</button>
		</section>

		<hr class="divider" />

		<section class="backup-section">
			<div class="section-info">
				<h2>Phục hồi dữ liệu (Restore)</h2>
				<p>Nhập dữ liệu từ file JSON bạn đã sao lưu trước đó.</p>
				<p class="info-note">
					Quá trình này sẽ thêm mới hoặc ghi đè lên dữ liệu hiện tại, nhưng <strong>KHÔNG</strong> xóa
					các file âm thanh đã lưu trên máy.
				</p>
			</div>

			<input
				type="file"
				accept=".json"
				bind:this={fileInput}
				onchange={handleFileChange}
				style="display: none;"
			/>

			<button
				class="btn btn-secondary"
				onclick={triggerFileInput}
				disabled={isExporting || isImporting}
			>
				{isImporting ? 'Đang phục hồi...' : 'Chọn file phục hồi'}
			</button>
		</section>
	</div>
</div>

<style>
	.backup-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.backup-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}

	.section-info h2 {
		margin-bottom: 0.5rem;
		font-size: 1.25rem;
		color: var(--text-primary);
	}

	.section-info p {
		color: var(--text-secondary);
		line-height: 1.5;
		margin-bottom: 0.25rem;
	}

	.warning {
		color: #eab308;
		font-size: 0.9rem;
	}

	.info-note {
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-style: italic;
	}

	.divider {
		border: 0;
		border-top: 1px solid var(--border-color);
		margin: 0;
	}
</style>
