import type { FocusCastDB } from './index';

/**
 * Applies database migrations when version upgrades occur.
 * Currently at Version 1 (Initial schema).
 *
 * Example usage for future versions:
 *
 * export function applyMigrations(db: FocusCastDB) {
 *   db.version(2).upgrade(trans => {
 *     // Example: add new column 'playCount' to tracks
 *     return trans.table('tracks').toCollection().modify(track => {
 *       track.playCount = 0;
 *     });
 *   });
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function applyMigrations(db: FocusCastDB) {
	// Base schema is defined in db/index.ts via version(1).stores(...)
	// Future migrations will be added here using db.version(2).upgrade(...)
}
