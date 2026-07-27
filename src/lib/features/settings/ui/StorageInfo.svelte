<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		getStorageInfo,
		clearUnbookmarkedAudioCache,
		autoCleanupFIFO,
		type StorageInfo
	} from '$lib/core/storage/storage-monitor';
	import {
		exportAllBookmarksMarkdown,
		downloadFile,
		exportFullBackup,
		importFullBackup
	} from '$lib/features/export/application/export-service';
	import { toastState } from '$lib/core/ui/toastState.svelte';
	import {
		Database,
		FileText,
		DownloadCloud,
		RefreshCw,
		ChevronRight,
		Trash2
	} from 'lucide-svelte';

	let info = $state<StorageInfo | null>(null);
	let isClearing = $state(false);
	let refreshInterval: ReturnType<typeof setInterval>;
	let isExportingNotes = $state(false);
	let isExportingBackup = $state(false);

	async function handleCleanup() {
		try {
			isClearing = true;
			const { clearedTracks, bytesFreed } = await clearUnbookmarkedAudioCache();
			toastState.add('success', `Đã dọn dẹp ${clearedTracks} tập tin (${formatMB(bytesFreed)}MB).`);
			info = await getStorageInfo();
		} catch (error) {
			console.error('Cleanup error', error);
			toastState.add('error', 'Lỗi khi dọn dẹp cache');
		} finally {
			isClearing = false;
		}
	}
	let isImportingBackup = $state(false);
	let fileInput: HTMLInputElement;

	async function handleExportBackup() {
		try {
			isExportingBackup = true;
			toastState.add('info', 'Đang tạo bản sao lưu...');
			const backupJson = await exportFullBackup();

			const date = new Date();
			const filename = `focuscast-backup-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.json`;

			downloadFile(backupJson, filename, 'txt');
			toastState.add('success', 'Đã lưu bản sao lưu thành công');
		} catch (error) {
			console.error('Backup error', error);
			toastState.add('error', 'Lỗi khi tạo bản sao lưu');
		} finally {
			isExportingBackup = false;
		}
	}

	function triggerFileInput() {
		if (fileInput) fileInput.click();
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
			isImportingBackup = true;
			toastState.add('info', 'Đang phục hồi dữ liệu...');

			const text = await file.text();
			await importFullBackup(text);

			toastState.add('success', 'Đã phục hồi dữ liệu thành công. Đang tải lại trang...');

			setTimeout(() => {
				window.location.reload();
			}, 1500);
		} catch (error) {
			const err = error as Error;
			console.error('Restore error', err);
			toastState.add('error', err.message || 'Lỗi khi phục hồi dữ liệu');
		} finally {
			isImportingBackup = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function loadInfo() {
		info = await getStorageInfo();
		if (info && info.status === 'critical' && info.usagePercentage >= 100) {
			await handleAutoCleanup();
		}
	}

	async function handleAutoCleanup() {
		try {
			const { clearedTracks, bytesFreed } = await autoCleanupFIFO();
			if (clearedTracks > 0) {
				toastState.add(
					'success',
					`Đã tự động giải phóng ${formatMB(bytesFreed)}MB. ${clearedTracks} episode offline đã bị xóa cache do hết dung lượng.`
				);
				info = await getStorageInfo();
			}
		} catch (error) {
			console.error('Lỗi khi auto cleanup:', error);
		}
	}

	onMount(() => {
		loadInfo();
		refreshInterval = setInterval(loadInfo, 10000);
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});

	function formatMB(bytes: number) {
		if (bytes === 0) return '0';
		const mb = bytes / (1024 * 1024);
		return mb.toFixed(1);
	}

	async function handleExportNotes() {
		try {
			isExportingNotes = true;
			toastState.add('info', 'Đang xuất ghi chú...');
			const md = await exportAllBookmarksMarkdown();

			const date = new Date();
			const filename = `focuscast-notes-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.md`;

			downloadFile(md, filename, 'markdown');
			toastState.add('success', 'Đã xuất ghi chú thành công');
		} catch (error) {
			console.error(error);
			toastState.add('error', 'Lỗi khi xuất ghi chú');
		} finally {
			isExportingNotes = false;
		}
	}
</script>

<section>
	<h2
		class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2"
	>
		<Database class="w-4 h-4" /> Dữ liệu & Sao lưu (Local First)
	</h2>
	<div class="glass-card rounded-3xl border border-emerald-500/20 overflow-hidden">
		<!-- Storage Usage -->
		<div class="p-4 border-b border-emerald-500/10 bg-emerald-500/5 relative">
			{#if info}
				<div class="flex justify-between items-end mb-2 relative z-10">
					<div>
						<h3 class="font-semibold text-white">Lưu trữ cục bộ</h3>
						<p class="text-[10px] text-emerald-400 mt-0.5">Dữ liệu an toàn trên thiết bị của bạn</p>
					</div>
					<div class="text-right">
						<span class="text-xl font-bold font-mono text-white tracking-tighter"
							>{formatMB(info.usage)}</span
						>
						<span class="text-xs text-slate-400">MB</span>
					</div>
				</div>
				<!-- Progress Bar -->
				<div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-3 relative z-10">
					<div
						class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500"
						style="width: {info.usagePercentage}%"
					></div>
				</div>
				{#if info.status === 'warning'}
					<p class="text-[10px] text-amber-400 mt-2">⚠️ Bộ nhớ sắp đầy.</p>
				{/if}
				{#if info.status === 'critical'}
					<p class="text-[10px] text-red-400 mt-2">🚨 Bộ nhớ đã đầy!</p>
				{/if}
			{:else}
				<div class="h-[60px] flex items-center justify-center">
					<span class="text-xs text-slate-400">Đang tải...</span>
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="p-2 flex flex-col gap-1">
			<button
				onclick={handleCleanup}
				disabled={isClearing}
				class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition group cursor-pointer text-left"
			>
				<div class="flex items-start gap-3">
					<div
						class="w-8 h-8 mt-0.5 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition shrink-0"
					>
						<Trash2 class="w-4 h-4" />
					</div>
					<div>
						<h4 class="font-semibold text-white text-sm">
							{isClearing ? 'Đang dọn dẹp...' : 'Dọn dẹp (Cleanup)'}
						</h4>
						<p class="text-[10px] text-slate-400 mt-1 leading-relaxed">
							Xóa các file âm thanh offline <br />
							<span class="text-red-500/80">Không ảnh hưởng đến bookmark.</span>
						</p>
					</div>
				</div>
				<ChevronRight class="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
			</button>

			<button
				onclick={handleExportNotes}
				disabled={isExportingNotes}
				class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition group cursor-pointer text-left"
			>
				<div class="flex items-center gap-3">
					<div
						class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition shrink-0"
					>
						<FileText class="w-4 h-4" />
					</div>
					<div>
						<h4 class="font-semibold text-white text-sm">
							{isExportingNotes ? 'Đang xuất...' : 'Xuất Ghi chú (Markdown)'}
						</h4>
					</div>
				</div>
				<ChevronRight class="w-4 h-4 text-slate-500 group-hover:text-white transition" />
			</button>

			<button
				onclick={handleExportBackup}
				disabled={isExportingBackup || isImportingBackup}
				class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition group cursor-pointer text-left"
			>
				<div class="flex items-start gap-3">
					<div
						class="w-8 h-8 mt-0.5 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition shrink-0"
					>
						<DownloadCloud class="w-4 h-4" />
					</div>
					<div>
						<h4 class="font-semibold text-white text-sm">
							{isExportingBackup ? 'Đang tạo sao lưu...' : 'Sao lưu toàn bộ (Backup)'}
						</h4>
						<p class="text-[10px] text-slate-400 mt-1 leading-relaxed">
							Xuất toàn bộ thư viện, lịch sử nghe và ghi chú. <br />
							<span class="text-amber-500/80">Không chứa tệp âm thanh.</span>
						</p>
					</div>
				</div>
				<ChevronRight class="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
			</button>

			<input
				type="file"
				accept=".json"
				bind:this={fileInput}
				onchange={handleFileChange}
				style="display: none;"
			/>

			<button
				onclick={triggerFileInput}
				disabled={isExportingBackup || isImportingBackup}
				class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition group cursor-pointer text-left"
			>
				<div class="flex items-start gap-3">
					<div
						class="w-8 h-8 mt-0.5 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition shrink-0"
					>
						<RefreshCw class="w-4 h-4" />
					</div>
					<div>
						<h4 class="font-semibold text-white text-sm">
							{isImportingBackup ? 'Đang phục hồi...' : 'Khôi phục (Restore)'}
						</h4>
						<p class="text-[10px] text-slate-400 mt-1 leading-relaxed">
							Nhập dữ liệu từ file JSON. Ghi đè/thêm mới dữ liệu hiện tại, <br />
							<span class="text-emerald-500/80">không xóa âm thanh đã lưu.</span>
						</p>
					</div>
				</div>
				<ChevronRight class="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0" />
			</button>
		</div>
	</div>
</section>

<style>
	.glass-card {
		background: linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
