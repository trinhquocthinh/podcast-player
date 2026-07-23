export class AppError extends Error {
	constructor(
		public code: string,
		message: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		public details?: any
	) {
		super(message);
		this.name = 'AppError';
	}
}
