/**
 * Sync Feature — Barrel Export
 */
export {
	encrypt,
	decrypt,
	verifyPassphrase,
	createVerificationToken,
	verifyWithToken
} from './infrastructure/crypto-service';
export type {
	CloudSyncProvider,
	SyncPayload,
	SyncState,
	SyncStatus,
	ConflictRecord
} from './domain/sync-types';
export { SYNC_CONSTANTS } from './domain/sync-types';
