import { describe, it, expect, vi } from 'vitest';
import { AppError } from '../../src/lib/core/types/errors';
import { formatTimestamp, formatDuration } from '../../src/lib/core/utils/time';
import { generateId } from '../../src/lib/core/utils/uuid';
import { isValidFeedUrl } from '../../src/lib/core/utils/validators';
import { retryWithBackoff } from '../../src/lib/core/utils/retry';

describe('Core Utilities', () => {
	describe('time.ts', () => {
		it('formats timestamp correctly', () => {
			expect(formatTimestamp(0)).toBe('00:00');
			expect(formatTimestamp(59)).toBe('00:59');
			expect(formatTimestamp(60)).toBe('01:00');
			expect(formatTimestamp(3599)).toBe('59:59');
			expect(formatTimestamp(3600)).toBe('1:00:00');
			expect(formatTimestamp(3665)).toBe('1:01:05');
			expect(formatTimestamp(-1)).toBe('00:00');
			expect(formatTimestamp(NaN)).toBe('00:00');
		});

		it('formats duration correctly', () => {
			expect(formatDuration(0)).toBe('0s');
			expect(formatDuration(59)).toBe('59s');
			expect(formatDuration(60)).toBe('1m 0s');
			expect(formatDuration(150)).toBe('2m 30s');
			expect(formatDuration(3600)).toBe('1h 0m');
			expect(formatDuration(3665)).toBe('1h 1m');
		});
	});

	describe('uuid.ts', () => {
		it('generates valid v4 UUIDs', () => {
			const id = generateId();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
		});
	});

	describe('validators.ts', () => {
		it('validates feed URLs correctly', () => {
			expect(isValidFeedUrl('https://example.com/feed.xml')).toBe(true);
			expect(isValidFeedUrl('http://example.com/feed')).toBe(true);

			// Invalid protocols
			expect(isValidFeedUrl('ftp://example.com')).toBe(false);
			expect(isValidFeedUrl('file:///etc/passwd')).toBe(false);

			// SSRF protection (localhost/private IP)
			expect(isValidFeedUrl('http://localhost:8080')).toBe(false);
			expect(isValidFeedUrl('http://127.0.0.1')).toBe(false);
			expect(isValidFeedUrl('http://192.168.1.1')).toBe(false);
			expect(isValidFeedUrl('http://10.0.0.1')).toBe(false);

			// Invalid URLs
			expect(isValidFeedUrl('not_a_url')).toBe(false);
		});
	});

	describe('retry.ts', () => {
		it('resolves on first attempt if successful', async () => {
			const operation = vi.fn().mockResolvedValue('success');
			const result = await retryWithBackoff(operation);
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it('retries on failure', async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce(new Error('fail 1'))
				.mockResolvedValueOnce('success');

			const result = await retryWithBackoff(operation, 3, 10); // fast retry for tests
			expect(result).toBe('success');
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it('throws after max retries', async () => {
			const operation = vi.fn().mockRejectedValue(new Error('always fail'));

			await expect(retryWithBackoff(operation, 2, 10)).rejects.toThrow('always fail');
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it('does not retry on specific AppErrors', async () => {
			const operation = vi.fn().mockRejectedValue(new AppError('INVALID_XML', 'Bad XML'));

			await expect(retryWithBackoff(operation, 3, 10)).rejects.toThrow('Bad XML');
			expect(operation).toHaveBeenCalledTimes(1);
		});
	});
});
