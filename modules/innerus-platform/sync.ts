import { requireOptionalNativeModule } from 'expo';

/**
 * Typed binding for the iOS CloudKit adapter (ios/InnerUsSyncModule.swift + SyncCloud.swift).
 * Null on Android, in Jest, Expo Go and web: callers treat that as local-only. Every call resolves to
 * `{ ok: true, ... }` or `{ ok: false, error: SyncErrorCode }` and never throws.
 */
export type SyncErrorCode =
  | 'notConfigured' | 'notAuthenticated' | 'networkUnavailable' | 'retryLater' | 'quotaExceeded' | 'zoneNotFound'
  | 'changeTokenExpired' | 'serverRecordChanged' | 'unknownItem' | 'limitExceeded' | 'assetFileNotFound' | 'cancelled'
  | 'unavailable' | 'error';

export type SyncFailure = { ok: false; error: SyncErrorCode; retryAfter?: number };
export type CloudAccountStatus = 'available' | 'noAccount' | 'restricted' | 'couldNotDetermine' | 'temporarilyUnavailable' | 'unknown' | 'notConfigured';

/** A record as sent to the adapter. Strings and numbers only (nulls are encoded by the engine). */
export type OutgoingRecord = {
  recordType: string;
  recordName: string;
  systemFields?: string;
  fields: Record<string, string | number>;
  encrypted: Record<string, string>;
  /** Absolute file path (no file://) uploaded as the record's `file` asset. */
  assetPath?: string;
};

/** A record as returned by the adapter (assets are never included). */
export type IncomingRecord = {
  recordType: string;
  recordName: string;
  changeTag: string;
  systemFields: string;
  fields: Record<string, string | number>;
  encrypted: Record<string, string>;
};

export type ModifyResult =
  | { ok: true; saved: { recordName: string; changeTag: string; systemFields: string }[]; deleted: string[]; failed: { recordName: string; error: SyncErrorCode; serverRecord?: IncomingRecord }[] }
  | SyncFailure;
export type FetchResult = { ok: true; records: IncomingRecord[]; deleted: { recordName: string; recordType: string }[]; token: string } | SyncFailure;

type NativeSync = {
  isConfigured: boolean;
  accountStatus(): Promise<{ ok: true; status: CloudAccountStatus; accountHash?: string } | SyncFailure>;
  ensureZone(): Promise<{ ok: true } | SyncFailure>;
  deleteZone(): Promise<{ ok: true } | SyncFailure>;
  modifyRecords(save: OutgoingRecord[], deleteNames: string[], overwrite: boolean, plainKeys: string[], encryptedKeys: string[]): Promise<ModifyResult>;
  fetchChanges(token: string, plainKeys: string[], encryptedKeys: string[]): Promise<FetchResult>;
  recordExists(recordName: string): Promise<{ ok: true; exists: boolean } | SyncFailure>;
  downloadAsset(recordName: string, targetPath: string, requestId: string): Promise<{ ok: true; bytes: number } | SyncFailure>;
  cancelDownload(requestId: string): void;
  addListener(event: 'onDownloadProgress', listener: (event: { requestId: string; progress: number }) => void): { remove(): void };
};

const native = requireOptionalNativeModule<NativeSync>('InnerUsSync');
const missing: SyncFailure = { ok: false, error: 'unavailable' };

/** True only on an iOS build whose native adapter is present (entitlement may still be absent). */
export const isCloudSyncAdapterPresent = native != null;

async function guarded<T>(call: () => Promise<T>): Promise<T | SyncFailure> {
  if (!native) return missing;
  try { return await call(); } catch { return { ok: false, error: 'error' }; }
}

export const cloudSync = {
  isConfigured(): boolean {
    try { return native?.isConfigured === true; } catch { return false; }
  },
  accountStatus: () => guarded(() => native!.accountStatus()),
  ensureZone: () => guarded(() => native!.ensureZone()),
  deleteZone: () => guarded(() => native!.deleteZone()),
  modifyRecords: (save: OutgoingRecord[], deleteNames: string[], overwrite: boolean, plainKeys: string[], encryptedKeys: string[]) =>
    guarded(() => native!.modifyRecords(save, deleteNames, overwrite, plainKeys, encryptedKeys)),
  fetchChanges: (token: string | null, plainKeys: string[], encryptedKeys: string[]) =>
    guarded(() => native!.fetchChanges(token ?? '', plainKeys, encryptedKeys)),
  recordExists: (recordName: string) => guarded(() => native!.recordExists(recordName)),
  downloadAsset: (recordName: string, targetPath: string, requestId: string) => guarded(() => native!.downloadAsset(recordName, targetPath, requestId)),
  cancelDownload(requestId: string) {
    try { native?.cancelDownload(requestId); } catch { /* nothing to cancel */ }
  },
  onDownloadProgress(listener: (event: { requestId: string; progress: number }) => void): () => void {
    if (!native) return () => undefined;
    try {
      const subscription = native.addListener('onDownloadProgress', listener);
      return () => subscription.remove();
    } catch {
      return () => undefined;
    }
  },
};
