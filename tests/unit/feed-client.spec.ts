import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addFeed, refreshFeed } from '../../src/lib/features/library/infrastructure/feed-client';
import { AppError } from '../../src/lib/core/types/errors';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('feed-client.ts', () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	describe('addFeed', () => {
		it('returns data on successful fetch', async () => {
			const mockData = { podcast: { title: 'Test' }, episodes: [] };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockData
			});

			const result = await addFeed('https://example.com/feed');

			expect(result).toEqual(mockData);
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/feed',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ url: 'https://example.com/feed' })
				})
			);
		});

		it('throws AppError on failed fetch', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Invalid URL', code: 'INVALID_URL', retryable: false })
			});

			try {
				await addFeed('invalid');
				expect.fail('Should have thrown AppError');
			} catch (err) {
				const error = err as AppError;
				expect(error).toBeInstanceOf(AppError);
				expect(error.code).toBe('INVALID_URL');
				expect(error.message).toBe('Invalid URL');
			}
		});
	});

	describe('refreshFeed', () => {
		it('returns data on successful fetch', async () => {
			const mockData = { episodes: [], totalEpisodes: 0, lastFetched: '2023-01-01' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockData
			});

			const result = await refreshFeed('https://example.com/feed');

			expect(result).toEqual(mockData);
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/feed/refresh',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({ feedUrl: 'https://example.com/feed' })
				})
			);
		});

		it('throws AppError on failed fetch', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Network Error', code: 'NETWORK_ERROR', retryable: true })
			});

			try {
				await refreshFeed('https://example.com/feed');
				expect.fail('Should have thrown AppError');
			} catch (err) {
				const error = err as AppError;
				expect(error).toBeInstanceOf(AppError);
				expect(error.code).toBe('NETWORK_ERROR');
				expect(error.message).toBe('Network Error');
			}
		});
	});
});
