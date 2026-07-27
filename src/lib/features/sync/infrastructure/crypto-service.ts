/**
 * Crypto Service — End-to-End Encryption for Cloud Sync
 *
 * Uses Web Crypto API (no external dependencies):
 * - Key derivation: PBKDF2 (SHA-256, 600,000 iterations)
 * - Encryption: AES-GCM (256-bit key, 12-byte IV)
 *
 * Encrypted format: base64(salt:iv:ciphertext+authTag)
 *
 * @see BR-P2-CLOUD-002 — Mã hóa đầu-cuối (E2EE) bắt buộc
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes (recommended for AES-GCM)
const KEY_LENGTH = 256; // bits

/**
 * Derive an AES-GCM key from a passphrase using PBKDF2.
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: 'SHA-256'
		},
		keyMaterial,
		{ name: 'AES-GCM', length: KEY_LENGTH },
		false,
		['encrypt', 'decrypt']
	);
}

/**
 * Encrypt plaintext string with a passphrase.
 * Returns a string in format: base64(salt) + ':' + base64(iv) + ':' + base64(ciphertext)
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

	const key = await deriveKey(passphrase, salt);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		encoder.encode(plaintext)
	);

	// Combine: salt:iv:ciphertext (all base64-encoded)
	return [
		uint8ArrayToBase64(salt),
		uint8ArrayToBase64(iv),
		uint8ArrayToBase64(new Uint8Array(ciphertext))
	].join(':');
}

/**
 * Decrypt an encrypted string using a passphrase.
 * Input format: base64(salt) + ':' + base64(iv) + ':' + base64(ciphertext)
 *
 * @throws Error if passphrase is wrong or data is corrupted
 */
export async function decrypt(encrypted: string, passphrase: string): Promise<string> {
	const parts = encrypted.split(':');
	if (parts.length !== 3) {
		throw new Error('Invalid encrypted data format');
	}

	const salt = base64ToUint8Array(parts[0]);
	const iv = base64ToUint8Array(parts[1]);
	const ciphertext = base64ToUint8Array(parts[2]);

	const key = await deriveKey(passphrase, salt);

	try {
		const plainBuffer = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv },
			key,
			ciphertext as unknown as BufferSource
		);

		const decoder = new TextDecoder();
		return decoder.decode(plainBuffer);
	} catch {
		throw new Error('Decryption failed — wrong passphrase or corrupted data');
	}
}

/**
 * Verify if a passphrase can decrypt the given encrypted data.
 * Returns true if decryption succeeds, false otherwise.
 */
export async function verifyPassphrase(encrypted: string, passphrase: string): Promise<boolean> {
	try {
		await decrypt(encrypted, passphrase);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create a verification token — a known plaintext encrypted with the passphrase.
 * Used to verify passphrase on new devices without exposing actual data.
 */
export async function createVerificationToken(passphrase: string): Promise<string> {
	return encrypt('focuscast-passphrase-verified', passphrase);
}

/**
 * Verify a passphrase against a verification token.
 */
export async function verifyWithToken(token: string, passphrase: string): Promise<boolean> {
	try {
		const result = await decrypt(token, passphrase);
		return result === 'focuscast-passphrase-verified';
	} catch {
		return false;
	}
}

// === Base64 Utilities ===

function uint8ArrayToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
