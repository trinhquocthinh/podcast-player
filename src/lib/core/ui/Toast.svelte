<script lang="ts">
	import { toastState, type ToastMessage } from './toastState.svelte';
	import { fly } from 'svelte/transition';
	import {
		Info,
		CheckCircle,
		AlertTriangle,
		XCircle,
		Zap,
		Scissors,
		FastForward,
		Play,
		Pause,
		Rss,
		FileAudio
	} from 'lucide-svelte';

	function getToastConfig(type: string) {
		switch (type) {
			case 'success':
				return { bg: 'bg-green-500', shadow: 'shadow-green-500/20', icon: CheckCircle };
			case 'error':
				return { bg: 'bg-red-500', shadow: 'shadow-red-500/20', icon: XCircle };
			case 'warning':
				return { bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/20', icon: AlertTriangle };
			case 'info':
			default:
				return { bg: 'bg-indigo-500', shadow: 'shadow-indigo-500/20', icon: Info };
		}
	}

	// Optional specific icons based on message content or extending the toast state type
	function getIcon(toast: ToastMessage) {
		const msg = toast.message.toLowerCase();
		if (msg.includes('đã lùi') || msg.includes('đã tiến')) return Zap;
		if (msg.includes('đang phát')) return Play;
		if (msg.includes('tạm dừng')) return Pause;
		if (msg.includes('cắt khoảng lặng')) return Scissors;
		if (msg.includes('tốc độ')) return FastForward;
		if (msg.includes('bookmark')) return CheckCircle;
		if (msg.includes('rss')) return Rss;
		if (msg.includes('audio')) return FileAudio;
		return getToastConfig(toast.type).icon;
	}

	function getColor(toast: ToastMessage) {
		const msg = toast.message.toLowerCase();
		if (
			msg.includes('đã lùi') ||
			msg.includes('đã tiến') ||
			msg.includes('tạm dừng') ||
			msg.includes('tắt cắt')
		) {
			return { bg: 'bg-slate-600', shadow: 'shadow-slate-500/20' };
		}
		if (
			msg.includes('đang phát') ||
			msg.includes('bật cắt') ||
			msg.includes('tốc độ') ||
			msg.includes('rss') ||
			msg.includes('audio')
		) {
			return { bg: 'bg-indigo-500', shadow: 'shadow-indigo-500/20' };
		}
		if (msg.includes('bookmark')) {
			return { bg: 'bg-purple-500', shadow: 'shadow-purple-500/20' };
		}
		return getToastConfig(toast.type);
	}
</script>

<div
	class="fixed top-12 left-1/2 -translate-x-1/2 z-[150] flex flex-col gap-3 w-max pointer-events-none"
>
	{#each toastState.messages as toast (toast.id)}
		{@const conf = getColor(toast)}
		{@const Icon = getIcon(toast)}
		<div
			in:fly={{ y: -40, duration: 300 }}
			out:fly={{ y: -40, duration: 300, opacity: 0 }}
			class="px-4 py-2.5 rounded-full shadow-2xl {conf.shadow} text-sm font-semibold flex items-center gap-2 {conf.bg} text-white pointer-events-auto"
		>
			<Icon class="w-4 h-4" />
			{toast.message}
		</div>
	{/each}
</div>
