import { AppError } from '../types/errors';

export async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	baseDelayMs: number = 1000
): Promise<T> {
	let attempt = 0;
	while (attempt < maxRetries) {
		try {
			return await operation();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			attempt++;

			// Do not retry on explicit INVALID_XML or INVALID_URL from server
			if (
				error instanceof AppError &&
				(error.code === 'INVALID_XML' || error.code === 'INVALID_URL')
			) {
				throw error;
			}

			if (attempt >= maxRetries) {
				throw error;
			}

			const delay = baseDelayMs * Math.pow(2, attempt - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error('Unreachable');
}
