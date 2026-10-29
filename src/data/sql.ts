/**
 * The subset of expo-sqlite's async API the repository uses. Keeping it this small lets the same
 * repository run against expo-sqlite on devices and Node's built-in SQLite in Jest.
 */
export type SqlValue = string | number | null;
export type RunResult = { changes: number; lastInsertRowId: number };

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlValue[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, params?: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlValue[]): Promise<T[]>;
  /** All statements inside commit together or not at all. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
