/**
 * Crypto Service Unit Tests
 *
 * Tests encrypt/decrypt round-trip, wrong passphrase handling,
 * verification token, edge cases (empty string, unicode, long text).
 */
import { describe, it, expect } from 'vitest';
import {
	encrypt,
	decrypt,
	verifyPassphrase,
	createVerificationToken,
	verifyWithToken
} from '$lib/features/sync/infrastructure/crypto-service';

describe('crypto-service', () => {
	const TEST_PASSPHRASE = 'my-secure-passphrase-123!';

	describe('encrypt/decrypt round-trip', () => {
		it('should encrypt and decrypt a simple string', async () => {
			const plaintext = 'Hello, World!';
			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);
			const decrypted = await decrypt(encrypted, TEST_PASSPHRASE);

			expect(decrypted).toBe(plaintext);
		});

		it('should produce different ciphertexts for same input (random salt/IV)', async () => {
			const plaintext = 'same input';
			const encrypted1 = await encrypt(plaintext, TEST_PASSPHRASE);
			const encrypted2 = await encrypt(plaintext, TEST_PASSPHRASE);

			expect(encrypted1).not.toBe(encrypted2);

			// But both should decrypt to the same plaintext
			expect(await decrypt(encrypted1, TEST_PASSPHRASE)).toBe(plaintext);
			expect(await decrypt(encrypted2, TEST_PASSPHRASE)).toBe(plaintext);
		});

		it('should handle empty string', async () => {
			const plaintext = '';
			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);
			const decrypted = await decrypt(encrypted, TEST_PASSPHRASE);

			expect(decrypted).toBe(plaintext);
		});

		it('should handle unicode characters (Vietnamese, emoji)', async () => {
			const plaintext = 'Xin chào thế giới! 🎧📚 Ghi chú podcast: Đây là bài học rất hay';
			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);
			const decrypted = await decrypt(encrypted, TEST_PASSPHRASE);

			expect(decrypted).toBe(plaintext);
		});

		it('should handle large JSON payload', async () => {
			const bookmarks = Array.from({ length: 100 }, (_, i) => ({
				id: `bookmark-${i}`,
				trackId: `track-${i % 10}`,
				timestampStart: i * 30,
				note: `Note ${i}: ${'Lorem ipsum '.repeat(20)}`,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				orphaned: false
			}));
			const plaintext = JSON.stringify(bookmarks);

			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);
			const decrypted = await decrypt(encrypted, TEST_PASSPHRASE);

			expect(JSON.parse(decrypted)).toEqual(bookmarks);
		});

		it('should handle special characters in passphrase', async () => {
			const passphrase = 'p@$$w0rd!#%^&*()_+{}|:<>?~`';
			const plaintext = 'test data';
			const encrypted = await encrypt(plaintext, passphrase);
			const decrypted = await decrypt(encrypted, passphrase);

			expect(decrypted).toBe(plaintext);
		});
	});

	describe('wrong passphrase', () => {
		it('should throw error when decrypting with wrong passphrase', async () => {
			const plaintext = 'secret data';
			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);

			await expect(decrypt(encrypted, 'wrong-passphrase')).rejects.toThrow('Decryption failed');
		});

		it('should throw error when decrypting with empty passphrase', async () => {
			const plaintext = 'secret data';
			const encrypted = await encrypt(plaintext, TEST_PASSPHRASE);

			await expect(decrypt(encrypted, '')).rejects.toThrow('Decryption failed');
		});
	});

	describe('invalid encrypted data', () => {
		it('should throw error for malformed encrypted string', async () => {
			await expect(decrypt('not-valid-format', TEST_PASSPHRASE)).rejects.toThrow(
				'Invalid encrypted data format'
			);
		});

		it('should throw error for tampered ciphertext', async () => {
			const encrypted = await encrypt('test', TEST_PASSPHRASE);
			const parts = encrypted.split(':');
			// Tamper with ciphertext
			parts[2] = parts[2].slice(0, -4) + 'AAAA';
			const tampered = parts.join(':');

			await expect(decrypt(tampered, TEST_PASSPHRASE)).rejects.toThrow();
		});
	});

	describe('verifyPassphrase', () => {
		it('should return true for correct passphrase', async () => {
			const encrypted = await encrypt('test data', TEST_PASSPHRASE);
			const result = await verifyPassphrase(encrypted, TEST_PASSPHRASE);

			expect(result).toBe(true);
		});

		it('should return false for wrong passphrase', async () => {
			const encrypted = await encrypt('test data', TEST_PASSPHRASE);
			const result = await verifyPassphrase(encrypted, 'wrong');

			expect(result).toBe(false);
		});
	});

	describe('verification token', () => {
		it('should create and verify a token successfully', async () => {
			const token = await createVerificationToken(TEST_PASSPHRASE);
			const isValid = await verifyWithToken(token, TEST_PASSPHRASE);

			expect(isValid).toBe(true);
		});

		it('should fail verification with wrong passphrase', async () => {
			const token = await createVerificationToken(TEST_PASSPHRASE);
			const isValid = await verifyWithToken(token, 'wrong-passphrase');

			expect(isValid).toBe(false);
		});

		it('should fail verification with tampered token', async () => {
			const token = await createVerificationToken(TEST_PASSPHRASE);
			const tampered = token + 'tampered';
			const isValid = await verifyWithToken(tampered, TEST_PASSPHRASE);

			expect(isValid).toBe(false);
		});
	});

	describe('encrypted format', () => {
		it('should produce output in salt:iv:ciphertext format', async () => {
			const encrypted = await encrypt('test', TEST_PASSPHRASE);
			const parts = encrypted.split(':');

			expect(parts).toHaveLength(3);
			// Each part should be valid base64
			parts.forEach((part) => {
				expect(() => atob(part)).not.toThrow();
			});
		});
	});
});
