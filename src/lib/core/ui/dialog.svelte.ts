class DialogState {
	isOpen = $state(false);
	title = $state('');
	message = $state('');
	confirmText = $state('Confirm');
	cancelText = $state('Cancel');
	onConfirm = $state<(() => void) | null>(null);
	onCancel = $state<(() => void) | null>(null);

	show(options: {
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void;
		onCancel?: () => void;
	}) {
		this.title = options.title;
		this.message = options.message;
		this.confirmText = options.confirmText || 'Confirm';
		this.cancelText = options.cancelText || 'Cancel';
		this.onConfirm = () => {
			options.onConfirm();
			this.close();
		};
		this.onCancel = () => {
			if (options.onCancel) options.onCancel();
			this.close();
		};
		this.isOpen = true;
	}

	close() {
		this.isOpen = false;
		this.onConfirm = null;
		this.onCancel = null;
	}
}

export const dialogState = new DialogState();
