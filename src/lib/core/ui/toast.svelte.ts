import { generateId } from '../utils/uuid';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
	id: string;
	type: ToastType;
	message: string;
	durationMs?: number;
}

class ToastState {
	messages = $state<ToastMessage[]>([]);

	add(type: ToastType, message: string, durationMs: number = 3000) {
		const id = generateId();
		this.messages.push({ id, type, message, durationMs });

		if (durationMs > 0) {
			setTimeout(() => {
				this.remove(id);
			}, durationMs);
		}
	}

	remove(id: string) {
		this.messages = this.messages.filter((m) => m.id !== id);
	}
}

export const toastState = new ToastState();
