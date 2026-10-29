import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { preparePrivateDirectory, protectFile } from '../../modules/innerus-platform';
import { migrate } from './schema';
import { PrivateRepository } from './repository';
import type { SqlDatabase } from './sql';

export const PRIVATE_DATABASE_NAME = 'innerus-private.db';

/**
 * Opens the protected private store. The database lives in the platform adapter's private directory
 * (iOS Application Support/InnerUsPrivate, file protection + excluded from backup; Android
 * noBackupFilesDir/InnerUsPrivate + backup/transfer exclusion rules) — never in expo-sqlite's
 * default directory, which is inside Documents (iOS) and is backed up.
 */
export async function openPrivateStore(): Promise<{ repository: PrivateRepository; directory: string }> {
  const directory = preparePrivateDirectory();
  const db = fromExpoSqlite(await openDatabaseAsync(PRIVATE_DATABASE_NAME, undefined, directory));
  await migrate(db);
  // The directory is already excluded; flag the database files too (Apple notes the flag can reset).
  for (const suffix of ['', '-wal', '-shm']) {
    try { protectFile(`${directory}/${PRIVATE_DATABASE_NAME}${suffix}`); } catch { /* file may not exist yet */ }
  }
  return { repository: new PrivateRepository(db), directory };
}

export function fromExpoSqlite(db: SQLiteDatabase): SqlDatabase {
  return {
    execAsync: source => db.execAsync(source),
    runAsync: (source, params = []) => db.runAsync(source, params),
    getFirstAsync: (source, params = []) => db.getFirstAsync(source, params),
    getAllAsync: (source, params = []) => db.getAllAsync(source, params),
    withTransactionAsync: task => db.withTransactionAsync(task),
  };
}
