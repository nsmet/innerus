// Test-only adapter: Node's built-in SQLite behind the same SqlDatabase interface as expo-sqlite.
import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase, SqlValue } from '../sql';

export function openNodeDatabase(path = ':memory:'): SqlDatabase & { close(): void } {
  const db = new DatabaseSync(path);
  return {
    async execAsync(source) { db.exec(source); },
    async runAsync(source, params: SqlValue[] = []) {
      const r = db.prepare(source).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, params: SqlValue[] = []) { return (db.prepare(source).get(...params) as T | undefined) ?? null; },
    async getAllAsync<T>(source: string, params: SqlValue[] = []) { return db.prepare(source).all(...params) as T[]; },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try { await task(); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close() { db.close(); },
  };
}
