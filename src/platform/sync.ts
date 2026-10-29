import { AppState, Platform, type AppStateStatus } from 'react-native';
import { uuid } from 'expo';
import { File } from 'expo-file-system';
import {
  cloudSync, isCloudSyncAdapterPresent, type IncomingRecord, type OutgoingRecord, type SyncErrorCode, type SyncFailure,
} from '../../modules/innerus-platform/sync';
import type { Attachment, Moment, MomentSource, NewAttachment, OutboxItem, PrivateRepository, SyncMarks } from '../data/repository';
import type { Language } from '../content/types';

/**
 * Private iCloud sync engine (iOS only; spec 32-34, AC21-AC25).
 *
 * Simple by design: the repository writes an outbox row in the same transaction as every committed
 * change; this engine pulls the zone's changes, applies them by stable id, then pushes the outbox.
 * CloudKit is eventual, so the app never waits for it: every state below is a quiet status.
 *
 * Triggers: app start, return to foreground, shortly after a local change, manual retry, and a
 * backoff timer while waiting (offline / iCloud busy). No silent push, no background work.
 * Account change: sync pauses; nothing is uploaded to the new account unless the person chooses it.
 */
export type SyncStatus =
  | 'local-only'      // Android, or no native adapter (Expo Go, tests)
  | 'not-configured'  // iOS build without the CloudKit entitlement
  | 'off'             // the person switched app sync off
  | 'checking'
  | 'syncing'
  | 'pending'         // waiting to sync (retry later)
  | 'synced'          // the last run confirmed every queued change
  | 'offline'
  | 'unavailable'     // no Apple Account in iCloud / restricted
  | 'quota-full'
  | 'account-changed';

export type SyncNotice = 'cloud-deleted' | 'cloud-removed' | null;

export type SyncSnapshot = {
  /** iOS with the sync adapter present. False on Android: local-only. */
  supported: boolean;
  enabled: boolean;
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  notice: SyncNotice;
  /** An account change was detected and its explanation has not been dismissed yet. */
  accountNoticeDue: boolean;
  marks: SyncMarks;
};

export type DownloadOutcome = 'done' | 'offline' | 'unavailable' | 'failed' | 'cancelled';
export type RemoveDownloadOutcome = 'removed' | 'not-confirmed' | 'offline' | 'failed';
export type DeleteCloudOutcome = 'deleted' | 'offline' | 'unavailable' | 'failed';

const emptyMarks = (): SyncMarks => ({ pending: new Set(), failed: new Set(), confirmed: new Set() });

export const initialSyncSnapshot: SyncSnapshot = {
  supported: Platform.OS === 'ios' && isCloudSyncAdapterPresent,
  enabled: false,
  status: Platform.OS === 'ios' && isCloudSyncAdapterPresent ? 'checking' : 'local-only',
  pendingCount: 0,
  lastSyncedAt: null,
  notice: null,
  accountNoticeDue: false,
  marks: emptyMarks(),
};

// ---- Record mapping -------------------------------------------------------------------------------

const PLAIN_KEYS = ['schema', 'topicId', 'topicVersion', 'promptId', 'contentLanguage', 'source', 'version', 'createdAt', 'updatedAt',
  'momentId', 'kind', 'bytes', 'durationMs', 'ext', 'on', 'key', 'value', 'entity', 'targetId', 'deletedAt'];
/** Private text uses CloudKit encrypted fields (spec 36). */
const ENCRYPTED_KEYS = ['title', 'body', 'questionSnapshot', 'participantLabel'];

const TYPE = { moment: 'Moment', attachment: 'Attachment', pref: 'Preference', tombstone: 'Tombstone' } as const;
const prefName = (key: string) => `pref.${key}`;
const tombstoneName = (entity: string, id: string) => `tomb.${entity}.${id}`;

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const orNull = (v: string) => (v === '' ? null : v);

function momentRecord(m: Moment, systemFields: string | null): OutgoingRecord {
  return {
    recordType: TYPE.moment, recordName: m.id, systemFields: systemFields ?? undefined,
    fields: {
      schema: 1, topicId: m.topicId, topicVersion: m.topicVersion, promptId: m.promptId ?? '', contentLanguage: m.contentLanguage,
      source: m.source, version: m.version, createdAt: m.createdAt, updatedAt: m.updatedAt,
    },
    encrypted: { title: m.title, body: m.body, questionSnapshot: m.questionSnapshot ?? '', participantLabel: m.participantLabel ?? '' },
  };
}

function momentFromRecord(r: IncomingRecord): Moment | null {
  const f = r.fields;
  const e = r.encrypted;
  const source = str(f.source) as MomentSource;
  const language = str(f.contentLanguage) as Language;
  if (!str(f.topicId) || !['typed', 'reviewed-ai', 'audio'].includes(source) || !['en', 'nl'].includes(language)) return null;
  return {
    id: r.recordName, topicId: str(f.topicId), topicVersion: str(f.topicVersion) || '1', promptId: orNull(str(f.promptId)),
    questionSnapshot: orNull(str(e.questionSnapshot)), contentLanguage: language, title: str(e.title), body: str(e.body), source,
    participantLabel: orNull(str(e.participantLabel)), version: Math.max(1, num(f.version, 1)),
    createdAt: str(f.createdAt) || new Date().toISOString(), updatedAt: str(f.updatedAt) || str(f.createdAt) || new Date().toISOString(),
  };
}

function extensionOf(relativePath: string) {
  const name = relativePath.split('/').pop() ?? '';
  return name.includes('.') ? name.split('.').pop() ?? '' : '';
}

function attachmentFromRecord(r: IncomingRecord): (NewAttachment & { createdAt: string }) | null {
  const f = r.fields;
  const kind = str(f.kind);
  if (!str(f.momentId) || (kind !== 'audio' && kind !== 'transcript')) return null;
  const ext = str(f.ext).replace(/[^a-z0-9]/gi, '') || (kind === 'audio' ? 'm4a' : 'txt');
  const durationMs = num(f.durationMs, -1);
  return {
    id: r.recordName, momentId: str(f.momentId), kind, relativePath: `${kind === 'audio' ? 'audio' : 'transcripts'}/${r.recordName}.${ext}`,
    bytes: num(f.bytes), durationMs: durationMs < 0 ? null : durationMs, createdAt: str(f.createdAt) || new Date().toISOString(),
  };
}

// ---- Errors ---------------------------------------------------------------------------------------

class SyncStop extends Error {
  constructor(readonly status: SyncStatus, readonly retryAfter?: number) { super('sync stopped'); }
}

function statusFor(code: SyncErrorCode): SyncStatus {
  switch (code) {
    case 'networkUnavailable': return 'offline';
    case 'notAuthenticated': return 'unavailable';
    case 'quotaExceeded': return 'quota-full';
    case 'notConfigured':
    case 'unavailable': return 'not-configured';
    default: return 'pending';
  }
}

function stopFor(result: SyncFailure): SyncStop {
  return new SyncStop(statusFor(result.error), result.retryAfter);
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

// ---- Engine ---------------------------------------------------------------------------------------

export class SyncEngine {
  private snapshot: SyncSnapshot = initialSyncSnapshot;
  private listeners = new Set<(s: SyncSnapshot) => void>();
  private running: Promise<void> | null = null;
  private again = false;
  private debounce: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 30_000;
  private appStateSubscription: { remove(): void } | null = null;
  private stopped = false;

  constructor(
    private readonly repo: PrivateRepository,
    /** Plain filesystem path of the private directory (no file://). */
    private readonly privateDirectory: string,
    /** Called after remote changes were applied, so the app reloads its lists. */
    private readonly onRemoteChanges: () => void,
  ) {}

  get supported() { return this.snapshot.supported; }
  getSnapshot() { return this.snapshot; }

  subscribe(listener: (s: SyncSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => { this.listeners.delete(listener); };
  }

  async start(): Promise<void> {
    if (!this.snapshot.supported) { await this.publish('local-only'); return; }
    this.repo.setSyncTracking(true);
    this.appStateSubscription = AppState.addEventListener('change', this.onAppState);
    void this.run();
  }

  stop() {
    this.stopped = true;
    this.appStateSubscription?.remove();
    if (this.debounce) clearTimeout(this.debounce);
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private onAppState = (state: AppStateStatus) => {
    if (state === 'active') void this.run();
    else if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
  };

  /** Call after any local change. Debounced so a burst of edits becomes one sync. */
  nudge() {
    if (!this.snapshot.supported || this.stopped) return;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => { this.debounce = null; void this.run(); }, 1500);
    void this.publish(); // pending counts update right away
  }

  /** Manual "Try again". */
  retry() { this.retryDelay = 30_000; return this.run(); }

  async isEnabled(): Promise<boolean> {
    // On by default on iOS when iCloud is available (spec 32); the flag is device-local.
    return (await this.repo.getSyncState('enabled')) !== '0';
  }

  async setEnabled(on: boolean): Promise<void> {
    await this.repo.setSyncState('enabled', on ? '1' : '0');
    await this.repo.setSyncState('notice', null);
    if (on) {
      await this.repo.enqueueAllUnsynced();
      void this.run();
    } else {
      // Stops new sync activity only. Local and cloud copies stay (spec 37).
      await this.publish('off');
    }
  }

  async dismissNotice() {
    await this.repo.setSyncState('notice', null);
    await this.publish();
  }

  async acknowledgeAccountChange() {
    const changed = await this.repo.getSyncState('accountChangedTo');
    if (changed) await this.repo.setSyncState('accountNoticeSeen', changed);
    await this.publish();
  }

  /**
   * Deliberate choice after an Apple Account change: start syncing this iPhone's library with the
   * account that is signed in now. Never automatic (spec 34, AC23).
   */
  async useCurrentAccount(): Promise<void> {
    const changed = await this.repo.getSyncState('accountChangedTo');
    if (!changed) return;
    await this.repo.resetSyncMetadata();
    await this.repo.setSyncState('account', changed);
    await this.repo.setSyncState('accountChangedTo', null);
    await this.repo.setSyncState('bootstrapped', null);
    void this.run();
  }

  /** "Delete iCloud copies": removes the InnerUs zone from this Apple Account's iCloud and turns sync off. */
  async deleteCloudCopies(): Promise<DeleteCloudOutcome> {
    const account = await cloudSync.accountStatus();
    if (!account.ok) return account.error === 'networkUnavailable' ? 'offline' : 'unavailable';
    if (account.status !== 'available') return 'unavailable';
    const stored = await this.repo.getSyncState('account');
    if (stored && account.accountHash && stored !== account.accountHash) return 'unavailable'; // never touch another account's data
    const result = await cloudSync.deleteZone();
    if (!result.ok) return result.error === 'networkUnavailable' ? 'offline' : 'failed';
    await this.repo.resetSyncMetadata();
    await this.repo.setSyncState('enabled', '0');
    await this.repo.setSyncState('bootstrapped', null);
    await this.repo.setSyncState('notice', 'cloud-deleted');
    this.onRemoteChanges();
    await this.publish('off');
    return 'deleted';
  }

  /** Downloads one cloud-only attachment file (spec 33) with cancelable progress. */
  download(attachment: Attachment, onProgress: (fraction: number) => void): { promise: Promise<DownloadOutcome>; cancel: () => void } {
    const requestId = uuid.v4();
    const unsubscribe = cloudSync.onDownloadProgress(event => { if (event.requestId === requestId) onProgress(event.progress); });
    const promise = (async (): Promise<DownloadOutcome> => {
      try {
        const result = await cloudSync.downloadAsset(attachment.id, `${this.privateDirectory}/${attachment.relativePath}`, requestId);
        if (!result.ok) {
          if (result.error === 'cancelled') return 'cancelled';
          if (result.error === 'networkUnavailable') return 'offline';
          if (result.error === 'notAuthenticated' || result.error === 'notConfigured' || result.error === 'unavailable') return 'unavailable';
          return 'failed';
        }
        await this.repo.setAttachmentLocalFile(attachment.id, true, result.bytes);
        this.onRemoteChanges();
        return 'done';
      } finally {
        unsubscribe();
      }
    })();
    return { promise, cancel: () => cloudSync.cancelDownload(requestId) };
  }

  /**
   * "Remove this download": deletes only the local copy, after confirming iCloud still holds one.
   * Never for a pending or failed upload (that local file may be the only copy).
   */
  async removeDownload(attachment: Attachment): Promise<RemoveDownloadOutcome> {
    const marks = await this.repo.syncMarks();
    const key = `attachment:${attachment.id}`;
    if (!marks.confirmed.has(key) || marks.pending.has(key)) return 'not-confirmed';
    const check = await cloudSync.recordExists(attachment.id);
    if (!check.ok) return check.error === 'networkUnavailable' ? 'offline' : 'failed';
    if (!check.exists) return 'not-confirmed';
    try {
      const file = new File(`file://${this.privateDirectory}/${attachment.relativePath}`);
      if (file.exists) file.delete();
    } catch {
      return 'failed';
    }
    await this.repo.setAttachmentLocalFile(attachment.id, false);
    this.onRemoteChanges();
    await this.publish();
    return 'removed';
  }

  // ---- Run loop ---------------------------------------------------------------------------------

  run(): Promise<void> {
    if (!this.snapshot.supported || this.stopped) return Promise.resolve();
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.runOnce();
        } while (this.again && !this.stopped);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async runOnce(): Promise<void> {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    if (!cloudSync.isConfigured()) { await this.publish('not-configured'); return; }
    if (!(await this.isEnabled())) { await this.publish('off'); return; }
    await this.publish(this.snapshot.status === 'checking' ? 'checking' : 'syncing');

    let status: SyncStatus;
    let retryAfter: number | undefined;
    try {
      const ready = await this.prepareAccount();
      if (ready !== true) {
        status = ready;
      } else {
        await this.pull();
        const pushProblem = await this.push();
        const remaining = await this.repo.outboxCount();
        status = pushProblem ?? (remaining > 0 ? 'pending' : 'synced');
        if (status === 'synced') await this.repo.setSyncState('lastSyncedAt', new Date().toISOString());
      }
    } catch (error) {
      if (error instanceof SyncStop) { status = error.status; retryAfter = error.retryAfter; }
      else status = 'pending'; // unexpected local error: keep everything queued, retry later
    }
    await this.publish(status);
    this.scheduleRetry(status, retryAfter);
  }

  private scheduleRetry(status: SyncStatus, retryAfter?: number) {
    if (this.stopped || AppState.currentState !== 'active') return;
    if (status === 'synced') { this.retryDelay = 30_000; return; }
    if (!['pending', 'offline', 'quota-full', 'syncing'].includes(status)) return;
    const delay = retryAfter ? retryAfter * 1000 : this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, 10 * 60_000);
    this.retryTimer = setTimeout(() => { this.retryTimer = null; void this.run(); }, delay);
  }

  /** Account checks. Returns true when sync may proceed, otherwise the status to show. */
  private async prepareAccount(): Promise<true | SyncStatus> {
    const account = await cloudSync.accountStatus();
    if (!account.ok) return statusFor(account.error);
    if (account.status === 'notConfigured') return 'not-configured';
    if (account.status === 'temporarilyUnavailable' || account.status === 'couldNotDetermine') return 'pending';
    if (account.status !== 'available') return 'unavailable';
    const hash = account.accountHash;
    if (!hash) return 'pending';

    const stored = await this.repo.getSyncState('account');
    if (!stored) {
      await this.repo.setSyncState('account', hash);
    } else if (stored !== hash) {
      // Different Apple Account: pause and keep the previous account's content separate (AC23).
      await this.repo.setSyncState('accountChangedTo', hash);
      return 'account-changed';
    } else if (await this.repo.getSyncState('accountChangedTo')) {
      await this.repo.setSyncState('accountChangedTo', null); // signed back in to the original account
    }

    if ((await this.repo.getSyncState('zoneReady')) !== hash) {
      const zone = await cloudSync.ensureZone();
      if (!zone.ok) throw stopFor(zone);
      await this.repo.setSyncState('zoneReady', hash);
    }
    if ((await this.repo.getSyncState('bootstrapped')) !== hash) {
      await this.repo.enqueueAllUnsynced();
      await this.repo.setSyncState('bootstrapped', hash);
    }
    return true;
  }

  private async pull(): Promise<void> {
    const token = await this.repo.getSyncState('changeToken');
    let result = await cloudSync.fetchChanges(token, PLAIN_KEYS, ENCRYPTED_KEYS);
    if (!result.ok && result.error === 'changeTokenExpired') {
      // Full refetch. Deletions are still honoured through Tombstone records.
      result = await cloudSync.fetchChanges(null, PLAIN_KEYS, ENCRYPTED_KEYS);
    }
    if (!result.ok && result.error === 'zoneNotFound') {
      if (token) {
        await this.handleCloudRemoved();
        throw new SyncStop('off');
      }
      const zone = await cloudSync.ensureZone();
      if (!zone.ok) throw stopFor(zone);
      return;
    }
    if (!result.ok) throw stopFor(result);

    let changed = false;
    const order = [TYPE.moment, TYPE.attachment, TYPE.pref, TYPE.tombstone] as string[];
    const records = [...result.records].sort((a, b) => order.indexOf(a.recordType) - order.indexOf(b.recordType));
    const filesToRemove: string[] = [];

    for (const record of records) {
      switch (record.recordType) {
        case TYPE.moment: {
          const moment = momentFromRecord(record);
          if (!moment) break;
          const outcome = await this.repo.applyRemoteMoment(moment, record.changeTag, record.systemFields);
          changed ||= outcome === 'inserted' || outcome === 'updated' || outcome === 'conflict';
          break;
        }
        case TYPE.attachment: {
          const attachment = attachmentFromRecord(record);
          if (!attachment) break;
          changed ||= (await this.repo.applyRemoteAttachment(attachment, record.changeTag, record.systemFields)) === 'inserted';
          break;
        }
        case TYPE.pref: {
          const key = str(record.fields.key);
          if (!key) break;
          changed ||= (await this.repo.applyRemotePref(key, str(record.fields.value), record.changeTag, record.systemFields)) === 'updated';
          break;
        }
        case TYPE.tombstone: {
          const entity = str(record.fields.entity);
          const target = str(record.fields.targetId);
          if ((entity === 'moment' || entity === 'attachment') && target) {
            filesToRemove.push(...await this.repo.applyRemoteDeletion(entity, target));
            changed = true;
          }
          break;
        }
        default: break;
      }
    }
    for (const deletion of result.deleted) {
      if (deletion.recordType === TYPE.moment || deletion.recordType === TYPE.attachment) {
        filesToRemove.push(...await this.repo.applyRemoteDeletion(deletion.recordType === TYPE.moment ? 'moment' : 'attachment', deletion.recordName));
        changed = true;
      }
    }
    for (const relativePath of filesToRemove) {
      try { const file = new File(`file://${this.privateDirectory}/${relativePath}`); if (file.exists) file.delete(); } catch { /* removed at next cleanup */ }
    }
    if (result.token) await this.repo.setSyncState('changeToken', result.token);
    if (changed) this.onRemoteChanges();
    await this.downloadTranscripts();
  }

  /** Restored transcripts are small text files: fetch them quietly so the text is complete offline. */
  private async downloadTranscripts() {
    const missing = (await this.repo.listAttachments()).filter(a => a.kind === 'transcript' && !a.localFile);
    for (const attachment of missing.slice(0, 20)) {
      const outcome = await this.download(attachment, () => undefined).promise;
      if (outcome === 'offline') break;
    }
  }

  /** iCloud copies vanished (deleted from another device or in iOS Settings). Stop and explain. */
  private async handleCloudRemoved() {
    await this.repo.resetSyncMetadata();
    await this.repo.setSyncState('enabled', '0');
    await this.repo.setSyncState('bootstrapped', null);
    await this.repo.setSyncState('notice', 'cloud-removed');
    this.onRemoteChanges();
  }

  /** Pushes the outbox. Returns a status when something blocks completion (quota, offline), else null. */
  private async push(): Promise<SyncStatus | null> {
    let problem: SyncStatus | null = null;
    for (let pass = 0; pass < 2; pass++) {
      const items = await this.repo.listOutbox(500);
      if (!items.length) return problem;
      const retry = new Set<string>();
      const note = (code: SyncErrorCode) => {
        const status = statusFor(code);
        if (status === 'quota-full' || status === 'offline') problem = status;
        else if (!problem) problem = 'pending';
      };

      // 1. Moments (conflict-checked against the server copy).
      for (const group of chunk(items.filter(i => i.entity === 'moment' && i.op === 'upsert'), 100)) {
        const built: { item: OutboxItem; version: number; record: OutgoingRecord }[] = [];
        for (const item of group) {
          const moment = await this.repo.getMoment(item.id);
          if (!moment) { await this.repo.dropOutboxItem(item); continue; }
          const meta = await this.repo.getSyncRecord('moment', item.id);
          built.push({ item, version: moment.version, record: momentRecord(moment, meta?.systemFields ?? null) });
        }
        if (!built.length) continue;
        const result = await cloudSync.modifyRecords(built.map(b => b.record), [], false, PLAIN_KEYS, ENCRYPTED_KEYS);
        if (!result.ok) throw stopFor(result);
        for (const saved of result.saved) {
          const entry = built.find(b => b.record.recordName === saved.recordName);
          if (entry) await this.repo.markPushed(entry.item, { changeTag: saved.changeTag, systemFields: saved.systemFields, syncedVersion: entry.version });
        }
        for (const failed of result.failed) {
          const entry = built.find(b => b.record.recordName === failed.recordName);
          if (!entry) continue;
          if (failed.error === 'serverRecordChanged' && failed.serverRecord) {
            // Someone else's edit reached iCloud first: keep it as the other version, then push ours.
            const remote = momentFromRecord(failed.serverRecord);
            if (remote) await this.repo.applyRemoteMoment(remote, failed.serverRecord.changeTag, failed.serverRecord.systemFields);
            else await this.repo.updateSystemFields('moment', entry.item.id, failed.serverRecord.changeTag, failed.serverRecord.systemFields);
            retry.add(`moment:${entry.item.id}`);
            this.onRemoteChanges();
          } else {
            await this.repo.markPushFailed(entry.item, failed.error);
            note(failed.error);
          }
        }
      }

      // 2. Attachments (immutable; the file travels as a protected CloudKit asset).
      for (const group of chunk(items.filter(i => i.entity === 'attachment' && i.op === 'upsert'), 10)) {
        const built: { item: OutboxItem; record: OutgoingRecord }[] = [];
        for (const item of group) {
          const attachment = await this.repo.getAttachment(item.id);
          const path = attachment ? `${this.privateDirectory}/${attachment.relativePath}` : '';
          let present = false;
          try { present = !!attachment?.localFile && new File(`file://${path}`).exists; } catch { present = false; }
          if (!attachment || !present) { await this.repo.dropOutboxItem(item); continue; }
          built.push({
            item,
            record: {
              recordType: TYPE.attachment, recordName: attachment.id,
              fields: { schema: 1, momentId: attachment.momentId, kind: attachment.kind, bytes: attachment.bytes, durationMs: attachment.durationMs ?? -1, createdAt: attachment.createdAt, ext: extensionOf(attachment.relativePath) },
              encrypted: {},
              assetPath: path,
            },
          });
        }
        if (!built.length) continue;
        const result = await cloudSync.modifyRecords(built.map(b => b.record), [], true, PLAIN_KEYS, ENCRYPTED_KEYS);
        if (!result.ok) throw stopFor(result);
        for (const saved of result.saved) {
          const entry = built.find(b => b.record.recordName === saved.recordName);
          if (entry) await this.repo.markPushed(entry.item, { changeTag: saved.changeTag, systemFields: saved.systemFields, syncedVersion: 1 });
        }
        for (const failed of result.failed) {
          const entry = built.find(b => b.record.recordName === failed.recordName);
          if (entry) { await this.repo.markPushFailed(entry.item, failed.error); note(failed.error); }
        }
      }

      // 3. Synced preferences (last writer wins).
      const simple = items.filter(i => i.entity === 'pref' && i.op === 'upsert');
      for (const group of chunk(simple, 100)) {
        const built: { item: OutboxItem; record: OutgoingRecord }[] = [];
        for (const item of group) {
          const value = (await this.repo.getPreference(item.id)) ?? '[]';
          built.push({ item, record: { recordType: TYPE.pref, recordName: prefName(item.id), fields: { schema: 1, key: item.id, value }, encrypted: {} } });
        }
        const result = await cloudSync.modifyRecords(built.map(b => b.record), [], true, PLAIN_KEYS, ENCRYPTED_KEYS);
        if (!result.ok) throw stopFor(result);
        for (const saved of result.saved) {
          const entry = built.find(b => b.record.recordName === saved.recordName);
          if (entry) await this.repo.markPushed(entry.item, { changeTag: saved.changeTag, systemFields: saved.systemFields, syncedVersion: 1 });
        }
        for (const failed of result.failed) {
          const entry = built.find(b => b.record.recordName === failed.recordName);
          if (entry) { await this.repo.markPushFailed(entry.item, failed.error); note(failed.error); }
        }
      }

      // 4. Deletions: a Tombstone record (so a stale or restored device cannot resurrect it) + the record itself.
      for (const group of chunk(items.filter(i => i.op === 'delete'), 100)) {
        const deletedAt = new Date().toISOString();
        const tombstones: OutgoingRecord[] = group.map(item => ({
          recordType: TYPE.tombstone, recordName: tombstoneName(item.entity, item.id),
          fields: { schema: 1, entity: item.entity, targetId: item.id, deletedAt }, encrypted: {},
        }));
        const result = await cloudSync.modifyRecords(tombstones, group.map(item => item.id), true, PLAIN_KEYS, ENCRYPTED_KEYS);
        if (!result.ok) throw stopFor(result);
        const failedNames = new Map(result.failed.map(f => [f.recordName, f.error] as const));
        for (const item of group) {
          const error = failedNames.get(item.id) ?? failedNames.get(tombstoneName(item.entity, item.id));
          if (error) { await this.repo.markPushFailed(item, error); note(error); }
          else await this.repo.markDeletePushed(item);
        }
      }

      if (!retry.size) return problem;
    }
    return problem;
  }

  // ---- Snapshot ---------------------------------------------------------------------------------

  private async publish(status?: SyncStatus): Promise<void> {
    const next: SyncSnapshot = { ...this.snapshot };
    if (status) next.status = status;
    if (next.supported) {
      try {
        next.enabled = await this.isEnabled();
        if (!next.enabled && next.status !== 'not-configured') next.status = 'off';
        next.pendingCount = await this.repo.outboxCount();
        next.lastSyncedAt = await this.repo.getSyncState('lastSyncedAt');
        next.notice = ((await this.repo.getSyncState('notice')) as SyncNotice) ?? null;
        const changedTo = await this.repo.getSyncState('accountChangedTo');
        next.accountNoticeDue = !!changedTo && (await this.repo.getSyncState('accountNoticeSeen')) !== changedTo;
        if (changedTo && next.enabled) next.status = 'account-changed';
        next.marks = await this.repo.syncMarks();
      } catch {
        // Storage hiccup: keep the previous snapshot values.
      }
    }
    this.snapshot = next;
    for (const listener of this.listeners) listener(next);
  }
}
