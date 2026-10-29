import type { Language } from '../content/types';
import type { SqlDatabase } from './sql';

/**
 * Private local repository. Every write commits before the caller may show "Saved on this device"
 * (spec 20/32). Errors carry no personal content. No method talks to a network.
 */
export type MomentSource = 'typed' | 'reviewed-ai' | 'audio';
export type Moment = {
  id: string;
  topicId: string;
  topicVersion: string;
  promptId: string | null;
  questionSnapshot: string | null;
  contentLanguage: Language;
  title: string;
  body: string;
  source: MomentSource;
  participantLabel: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type NewMoment = Omit<Moment, 'version' | 'createdAt' | 'updatedAt'>;

export type ActiveSession = {
  sessionId: string;
  topicId: string;
  topicVersion: string;
  /** 0..4 = authored prompt index, 5 = closing invitation. */
  position: number;
  nudgeShown: boolean;
  language: Language;
  startedAt: string;
  updatedAt: string;
};
export const CLOSING_POSITION = 5;

/** `localFile` is false when only a confirmed iCloud copy exists (restored on a new iPhone, or download removed). */
export type Attachment = { id: string; momentId: string; kind: 'audio' | 'transcript'; relativePath: string; bytes: number; durationMs: number | null; createdAt: string; localFile: boolean };
export type NewAttachment = Omit<Attachment, 'createdAt' | 'localFile'>;

// ---- Sync bookkeeping types (iOS private iCloud; spec 32-34) -------------------------------------
export type SyncEntity = 'moment' | 'attachment' | 'pref';
export type OutboxItem = { entity: SyncEntity; id: string; op: 'upsert' | 'delete'; seq: number; attempts: number; lastError: string | null };
export type SyncRecordMeta = { changeTag: string | null; systemFields: string | null; syncedVersion: number | null };
export type MomentConflict = { id: number; momentId: string; title: string; body: string; participantLabel: string | null; remoteVersion: number; remoteUpdatedAt: string; detectedAt: string };
/** Sync state of every tracked item, keyed `${entity}:${id}`. Used for the quiet per-moment status lines. */
export type SyncMarks = { pending: Set<string>; failed: Set<string>; confirmed: Set<string> };
export type RemoteApplyResult = 'inserted' | 'updated' | 'conflict' | 'echo' | 'ignored';
/** Prefs that sync (spec 33: explicitly hidden themes). Everything else in `preferences` stays on the device. */
export const SYNCED_PREFS = ['hiddenThemes'] as const;

type AttachmentRow = { id: string; moment_id: string; kind: 'audio' | 'transcript'; relative_path: string; bytes: number; duration_ms: number | null; created_at: string; local_file: number };
const toAttachment = (r: AttachmentRow): Attachment => ({
  id: r.id, momentId: r.moment_id, kind: r.kind, relativePath: r.relative_path, bytes: r.bytes, durationMs: r.duration_ms, createdAt: r.created_at, localFile: r.local_file !== 0,
});

export type Draft = { sessionId: string; promptId: string | null; title: string; body: string; updatedAt: string };

type MomentRow = {
  id: string; topic_id: string; topic_version: string; prompt_id: string | null; question_snapshot: string | null;
  content_language: Language; title: string; body: string; source: MomentSource; participant_label: string | null;
  version: number; created_at: string; updated_at: string;
};
const toMoment = (r: MomentRow): Moment => ({
  id: r.id, topicId: r.topic_id, topicVersion: r.topic_version, promptId: r.prompt_id, questionSnapshot: r.question_snapshot,
  contentLanguage: r.content_language, title: r.title, body: r.body, source: r.source, participantLabel: r.participant_label,
  version: r.version, createdAt: r.created_at, updatedAt: r.updated_at,
});

export class PrivateRepository {
  constructor(private readonly db: SqlDatabase, private readonly now: () => string = () => new Date().toISOString()) {}

  /**
   * When on (iOS), every committed change to a synced item also writes an outbox row in the same
   * transaction (spec 33/34). Android never syncs, so it stays off there.
   */
  private trackSync = false;
  setSyncTracking(on: boolean) { this.trackSync = on; }
  get syncTracking() { return this.trackSync; }

  /** Must run inside the caller's transaction/serial task. */
  private async enqueue(entity: SyncEntity, id: string, op: 'upsert' | 'delete'): Promise<void> {
    if (!this.trackSync) return;
    const next = await this.db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM sync_outbox');
    await this.db.runAsync(
      `INSERT INTO sync_outbox (entity, id, op, seq, queued_at, attempts, last_error) VALUES (?, ?, ?, ?, ?, 0, NULL)
       ON CONFLICT (entity, id) DO UPDATE SET op = excluded.op, seq = excluded.seq, queued_at = excluded.queued_at, attempts = 0, last_error = NULL`,
      [entity, id, op, next?.n ?? 1, this.now()],
    );
  }

  /**
   * All writes run one at a time on the single connection. expo-sqlite transactions are not
   * exclusive, so overlapping writes (e.g. two quick Finish taps) would otherwise interleave.
   */
  private queue: Promise<unknown> = Promise.resolve();
  private serial<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  // ---- Moments ------------------------------------------------------------------------------

  /**
   * Idempotent: saving the same Moment id twice (double tap, retry after a crash) keeps one row
   * and returns the stored version. A tombstoned id is never recreated.
   */
  saveMoment(input: NewMoment): Promise<Moment> {
    return this.serial(async () => {
      if (await this.isTombstoned('moment', input.id)) throw new Error('This moment was deleted.');
      const at = this.now();
      await this.db.withTransactionAsync(async () => {
        const result = await this.db.runAsync(
          `INSERT OR IGNORE INTO moments (id, topic_id, topic_version, prompt_id, question_snapshot, content_language, title, body, source, participant_label, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [input.id, input.topicId, input.topicVersion, input.promptId, input.questionSnapshot, input.contentLanguage,
            input.title, input.body, input.source, input.participantLabel, at, at],
        );
        if (result.changes === 1) await this.enqueue('moment', input.id, 'upsert');
      });
      const saved = await this.getMoment(input.id);
      if (!saved) throw new Error('The moment could not be saved.');
      return saved;
    });
  }

  async getMoment(id: string): Promise<Moment | null> {
    const row = await this.db.getFirstAsync<MomentRow>('SELECT * FROM moments WHERE id = ?', [id]);
    return row ? toMoment(row) : null;
  }

  /** Newest first, optional topic filter (spec 21). */
  async listMoments(topicId?: string): Promise<Moment[]> {
    const rows = topicId
      ? await this.db.getAllAsync<MomentRow>('SELECT * FROM moments WHERE topic_id = ? ORDER BY created_at DESC, rowid DESC', [topicId])
      : await this.db.getAllAsync<MomentRow>('SELECT * FROM moments ORDER BY created_at DESC, rowid DESC');
    return rows.map(toMoment);
  }

  /**
   * Edits keep the previous text as a recoverable version (spec 21/34). `expectedVersion` rejects
   * stale edits instead of silently overwriting someone's words.
   */
  updateMoment(id: string, expectedVersion: number, changes: { title?: string; body?: string; participantLabel?: string | null }): Promise<Moment> {
    return this.serial(async () => {
      let updated: Moment | null = null;
      await this.db.withTransactionAsync(async () => {
        const current = await this.getMoment(id);
        if (!current) throw new Error('This moment no longer exists.');
        if (current.version !== expectedVersion) throw new Error('This moment changed elsewhere. Review the other version.');
        await this.db.runAsync('INSERT OR IGNORE INTO moment_versions (moment_id, version, title, body, saved_at) VALUES (?, ?, ?, ?, ?)',
          [id, current.version, current.title, current.body, current.updatedAt]);
        await this.db.runAsync(
          'UPDATE moments SET title = ?, body = ?, participant_label = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?',
          [changes.title ?? current.title, changes.body ?? current.body,
            changes.participantLabel === undefined ? current.participantLabel : changes.participantLabel, this.now(), id, expectedVersion],
        );
        await this.enqueue('moment', id, 'upsert');
        updated = await this.getMoment(id);
      });
      if (!updated) throw new Error('This moment could not be updated.');
      return updated;
    });
  }

  /** Deletes the Moment, its versions and attachment rows, and records a non-content tombstone. */
  deleteMoment(id: string): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        const attachmentIds = await this.db.getAllAsync<{ id: string }>('SELECT id FROM attachments WHERE moment_id = ?', [id]);
        await this.db.runAsync('DELETE FROM moment_versions WHERE moment_id = ?', [id]);
        await this.db.runAsync('DELETE FROM moment_conflicts WHERE moment_id = ?', [id]);
        await this.db.runAsync('DELETE FROM moments WHERE id = ?', [id]);
        await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['moment', id, this.now()]);
        await this.enqueue('moment', id, 'delete');
        for (const a of attachmentIds) {
          await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['attachment', a.id, this.now()]);
          await this.enqueue('attachment', a.id, 'delete');
        }
      });
    });
  }

  async isTombstoned(entity: string, id: string): Promise<boolean> {
    return (await this.db.getFirstAsync('SELECT 1 AS hit FROM tombstones WHERE entity = ? AND id = ?', [entity, id])) != null;
  }

  /** Entirely local full-text search; diacritics-insensitive (café = cafe). Query text is never stored. */
  async searchMoments(query: string): Promise<Moment[]> {
    const terms = query.normalize('NFC').split(/\s+/).map(t => t.replace(/["*^():]/g, '')).filter(Boolean);
    if (!terms.length) return this.listMoments();
    const match = terms.map(t => `"${t}"*`).join(' ');
    const rows = await this.db.getAllAsync<MomentRow>(
      `SELECT m.* FROM moments_search s JOIN moments m ON m.rowid = s.rowid WHERE moments_search MATCH ? ORDER BY m.created_at DESC`,
      [match],
    );
    return rows.map(toMoment);
  }

  // ---- Session, drafts, completion -----------------------------------------------------------

  async getActiveSession(): Promise<ActiveSession | null> {
    const r = await this.db.getFirstAsync<{ session_id: string; topic_id: string; topic_version: string; position: number; nudge_shown: number; language: Language; started_at: string; updated_at: string }>(
      'SELECT * FROM active_session WHERE slot = 1');
    return r ? { sessionId: r.session_id, topicId: r.topic_id, topicVersion: r.topic_version, position: r.position, nudgeShown: r.nudge_shown === 1, language: r.language, startedAt: r.started_at, updatedAt: r.updated_at } : null;
  }

  /** Saves the one resumable position (spec 20). Replaces any previous session. */
  saveActiveSession(session: Omit<ActiveSession, 'updatedAt'>): Promise<void> {
    return this.serial(async () => {
      if (session.position < 0 || session.position > CLOSING_POSITION) throw new Error('Invalid conversation position.');
      await this.db.runAsync(
        `INSERT OR REPLACE INTO active_session (slot, session_id, topic_id, topic_version, position, nudge_shown, language, started_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.sessionId, session.topicId, session.topicVersion, session.position, session.nudgeShown ? 1 : 0, session.language, session.startedAt, this.now()],
      );
    });
  }

  clearActiveSession(): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('DELETE FROM active_session WHERE slot = 1');
    });
  }

  saveDraft(draft: Omit<Draft, 'updatedAt'>): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('INSERT OR REPLACE INTO drafts (session_id, prompt_id, title, body, updated_at) VALUES (?, ?, ?, ?, ?)',
        [draft.sessionId, draft.promptId, draft.title, draft.body, this.now()]);
    });
  }

  async getDraft(sessionId: string): Promise<Draft | null> {
    const r = await this.db.getFirstAsync<{ session_id: string; prompt_id: string | null; title: string; body: string; updated_at: string }>(
      'SELECT * FROM drafts WHERE session_id = ?', [sessionId]);
    return r ? { sessionId: r.session_id, promptId: r.prompt_id, title: r.title, body: r.body, updatedAt: r.updated_at } : null;
  }

  discardDraft(sessionId: string): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('DELETE FROM drafts WHERE session_id = ?', [sessionId]);
    });
  }

  /**
   * Explicit Finish. Records at most one completion per session identity (AC43) and clears the
   * resumable position in the same transaction. Returns false when already recorded.
   */
  recordCompletion(sessionId: string, topicId: string): Promise<boolean> {
    return this.serial(async () => {
      let inserted = false;
      await this.db.withTransactionAsync(async () => {
        const result = await this.db.runAsync('INSERT OR IGNORE INTO completions (session_id, topic_id, completed_at) VALUES (?, ?, ?)', [sessionId, topicId, this.now()]);
        inserted = result.changes === 1;
        await this.db.runAsync('DELETE FROM active_session WHERE slot = 1 AND session_id = ?', [sessionId]);
      });
      return inserted;
    });
  }

  async completionCount(topicId?: string): Promise<number> {
    const r = topicId
      ? await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM completions WHERE topic_id = ?', [topicId])
      : await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM completions');
    return r?.n ?? 0;
  }

  // ---- Attachments (retained voice clips / transcripts) -----------------------------------------

  async addAttachment(attachment: NewAttachment): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        const result = await this.db.runAsync('INSERT OR IGNORE INTO attachments (id, moment_id, kind, relative_path, bytes, duration_ms, created_at, local_file) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [attachment.id, attachment.momentId, attachment.kind, attachment.relativePath, attachment.bytes, attachment.durationMs, this.now()]);
        if (result.changes === 1) await this.enqueue('attachment', attachment.id, 'upsert');
      });
    });
  }

  async listAttachments(momentId?: string): Promise<Attachment[]> {
    const rows = momentId
      ? await this.db.getAllAsync<AttachmentRow>('SELECT * FROM attachments WHERE moment_id = ? ORDER BY created_at', [momentId])
      : await this.db.getAllAsync<AttachmentRow>('SELECT * FROM attachments ORDER BY created_at');
    return rows.map(toAttachment);
  }

  async getAttachment(id: string): Promise<Attachment | null> {
    const row = await this.db.getFirstAsync<AttachmentRow>('SELECT * FROM attachments WHERE id = ?', [id]);
    return row ? toAttachment(row) : null;
  }

  /** Removes the attachment row; the caller deletes the file. The written note stays (spec 33/37). */
  async deleteAttachment(id: string): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
        await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['attachment', id, this.now()]);
        await this.enqueue('attachment', id, 'delete');
      });
    });
  }

  /** Records whether the attachment's file is on this device (download finished / download removed). */
  setAttachmentLocalFile(id: string, present: boolean, bytes?: number): Promise<void> {
    return this.serial(async () => {
      if (bytes != null) await this.db.runAsync('UPDATE attachments SET local_file = ?, bytes = ? WHERE id = ?', [present ? 1 : 0, bytes, id]);
      else await this.db.runAsync('UPDATE attachments SET local_file = ? WHERE id = ?', [present ? 1 : 0, id]);
    });
  }

  // ---- Preferences (device-specific) ----------------------------------------------------------

  async getPreferences(): Promise<Record<string, string>> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM preferences');
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async setPreference(key: string, value: string | null): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        if (value === null) await this.db.runAsync('DELETE FROM preferences WHERE key = ?', [key]);
        else await this.db.runAsync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value]);
        if ((SYNCED_PREFS as readonly string[]).includes(key)) await this.enqueue('pref', key, 'upsert');
      });
    });
  }

  async getPreference(key: string): Promise<string | null> {
    return (await this.db.getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE key = ?', [key]))?.value ?? null;
  }

  /**
   * "Delete all private app content" (spec 37): Moments, versions, attachments rows,
   * preferences, drafts and the active session. Keeps non-content tombstones and completion counts
   * are removed too. Purchase entitlement is store-derived and unaffected. The caller removes files.
   * With sync tracking on, cloud removal is queued in the same transaction and stays pending offline.
   * Sync bookkeeping (outbox, confirmations, the sync switch) is kept so those deletions can complete.
   */
  async deleteAllPrivateContent(): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        const ids = await this.db.getAllAsync<{ id: string }>('SELECT id FROM moments');
        for (const { id } of ids) {
          await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['moment', id, this.now()]);
          await this.enqueue('moment', id, 'delete');
        }
        const attachmentIds = await this.db.getAllAsync<{ id: string }>('SELECT id FROM attachments');
        for (const { id } of attachmentIds) {
          await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['attachment', id, this.now()]);
          await this.enqueue('attachment', id, 'delete');
        }
        for (const key of SYNCED_PREFS) await this.enqueue('pref', key, 'upsert');
        for (const table of ['attachments', 'moment_versions', 'moment_conflicts', 'moments', 'drafts', 'active_session', 'completions']) {
          await this.db.runAsync(`DELETE FROM ${table}`);
        }
        // Preferences go too, except the device-local access keys (free-week clock, verified purchase cache):
        // they are not content, and spec 37 preserves the purchase entitlement.
        await this.db.runAsync("DELETE FROM preferences WHERE key NOT LIKE 'access.%'");
      });
    });
  }

  // ---- Sync bookkeeping (iOS private iCloud; driven by src/platform/sync.ts) --------------------

  async getSyncState(key: string): Promise<string | null> {
    return (await this.db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key]))?.value ?? null;
  }

  setSyncState(key: string, value: string | null): Promise<void> {
    return this.serial(async () => {
      if (value === null) await this.db.runAsync('DELETE FROM sync_state WHERE key = ?', [key]);
      else await this.db.runAsync('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)', [key, value]);
    });
  }

  async listOutbox(limit = 500): Promise<OutboxItem[]> {
    const rows = await this.db.getAllAsync<{ entity: SyncEntity; id: string; op: 'upsert' | 'delete'; seq: number; attempts: number; last_error: string | null }>(
      'SELECT entity, id, op, seq, attempts, last_error FROM sync_outbox ORDER BY seq LIMIT ?', [limit]);
    return rows.map(r => ({ entity: r.entity, id: r.id, op: r.op, seq: r.seq, attempts: r.attempts, lastError: r.last_error }));
  }

  async outboxCount(): Promise<number> {
    return (await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_outbox'))?.n ?? 0;
  }

  async getSyncRecord(entity: SyncEntity, id: string): Promise<SyncRecordMeta | null> {
    const r = await this.db.getFirstAsync<{ change_tag: string | null; system_fields: string | null; synced_version: number | null }>(
      'SELECT change_tag, system_fields, synced_version FROM sync_records WHERE entity = ? AND id = ?', [entity, id]);
    return r ? { changeTag: r.change_tag, systemFields: r.system_fields, syncedVersion: r.synced_version } : null;
  }

  private async writeSyncRecord(entity: SyncEntity, id: string, meta: SyncRecordMeta): Promise<void> {
    await this.db.runAsync('INSERT OR REPLACE INTO sync_records (entity, id, change_tag, system_fields, synced_version, synced_at) VALUES (?, ?, ?, ?, ?, ?)',
      [entity, id, meta.changeTag, meta.systemFields, meta.syncedVersion, this.now()]);
  }

  /** The cloud confirmed an upsert. Clears the outbox row only if nothing changed since that push (seq). */
  markPushed(item: OutboxItem, meta: SyncRecordMeta): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        await this.writeSyncRecord(item.entity, item.id, meta);
        await this.db.runAsync('DELETE FROM sync_outbox WHERE entity = ? AND id = ? AND seq = ?', [item.entity, item.id, item.seq]);
      });
    });
  }

  /** The cloud confirmed a deletion (or the item never reached it). */
  markDeletePushed(item: OutboxItem): Promise<void> {
    return this.serial(async () => {
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync('DELETE FROM sync_records WHERE entity = ? AND id = ?', [item.entity, item.id]);
        await this.db.runAsync('DELETE FROM sync_outbox WHERE entity = ? AND id = ? AND seq = ?', [item.entity, item.id, item.seq]);
      });
    });
  }

  /** Keeps the item queued with a non-content error code; it is retried later. */
  markPushFailed(item: OutboxItem, code: string): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE entity = ? AND id = ? AND seq = ?', [code.slice(0, 60), item.entity, item.id, item.seq]);
    });
  }

  /** Drops a queued item that can never be pushed (e.g. its local file vanished). The local row is untouched. */
  dropOutboxItem(item: OutboxItem): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('DELETE FROM sync_outbox WHERE entity = ? AND id = ? AND seq = ?', [item.entity, item.id, item.seq]);
    });
  }

  /** Keeps the newest server system fields (so the next push is not rejected) without confirming content. */
  updateSystemFields(entity: SyncEntity, id: string, changeTag: string, systemFields: string): Promise<void> {
    return this.serial(async () => {
      const existing = await this.getSyncRecord(entity, id);
      await this.writeSyncRecord(entity, id, { changeTag, systemFields, syncedVersion: existing?.syncedVersion ?? null });
    });
  }

  /**
   * A Moment record from iCloud. Never creates a duplicate (stable id), never resurrects a tombstoned
   * id, and never silently drops words: with an unsynced local edit the remote text is kept as the
   * "other version" (spec 34); otherwise the previous local text is archived in moment_versions.
   */
  applyRemoteMoment(remote: Moment, changeTag: string, systemFields: string): Promise<RemoteApplyResult> {
    return this.serial(async () => {
      let outcome: RemoteApplyResult = 'ignored';
      await this.db.withTransactionAsync(async () => {
        if (await this.isTombstoned('moment', remote.id)) {
          await this.enqueue('moment', remote.id, 'delete');
          outcome = 'ignored';
          return;
        }
        const record = await this.getSyncRecord('moment', remote.id);
        if (record?.changeTag && record.changeTag === changeTag) { outcome = 'echo'; return; }
        const local = await this.getMoment(remote.id);
        if (!local) {
          await this.db.runAsync(
            `INSERT INTO moments (id, topic_id, topic_version, prompt_id, question_snapshot, content_language, title, body, source, participant_label, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [remote.id, remote.topicId, remote.topicVersion, remote.promptId, remote.questionSnapshot, remote.contentLanguage, remote.title, remote.body,
              remote.source, remote.participantLabel, Math.max(1, remote.version), remote.createdAt, remote.updatedAt],
          );
          await this.writeSyncRecord('moment', remote.id, { changeTag, systemFields, syncedVersion: Math.max(1, remote.version) });
          outcome = 'inserted';
          return;
        }
        const sameText = local.title === remote.title && local.body === remote.body && local.participantLabel === remote.participantLabel;
        const pending = await this.db.getFirstAsync<{ op: string }>("SELECT op FROM sync_outbox WHERE entity = 'moment' AND id = ?", [remote.id]);
        if (pending) {
          // Local edit not yet in iCloud. Keep it; remember the other side if it differs.
          if (!sameText) {
            await this.db.runAsync(
              'INSERT INTO moment_conflicts (moment_id, title, body, participant_label, remote_version, remote_updated_at, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [remote.id, remote.title, remote.body, remote.participantLabel, remote.version, remote.updatedAt, this.now()]);
          }
          await this.writeSyncRecord('moment', remote.id, { changeTag, systemFields, syncedVersion: record?.syncedVersion ?? null });
          outcome = sameText ? 'echo' : 'conflict';
          return;
        }
        let version = local.version;
        if (!sameText) {
          await this.db.runAsync('INSERT OR IGNORE INTO moment_versions (moment_id, version, title, body, saved_at) VALUES (?, ?, ?, ?, ?)',
            [local.id, local.version, local.title, local.body, local.updatedAt]);
          version = Math.max(local.version + 1, remote.version);
          await this.db.runAsync('UPDATE moments SET title = ?, body = ?, participant_label = ?, version = ?, updated_at = ? WHERE id = ?',
            [remote.title, remote.body, remote.participantLabel, version, remote.updatedAt, local.id]);
        }
        await this.writeSyncRecord('moment', remote.id, { changeTag, systemFields, syncedVersion: version });
        outcome = sameText ? 'echo' : 'updated';
      });
      return outcome;
    });
  }

  /** An Attachment record from iCloud: text-first restore, the file is downloaded later (localFile = false). */
  applyRemoteAttachment(remote: NewAttachment & { createdAt: string }, changeTag: string, systemFields: string): Promise<RemoteApplyResult> {
    return this.serial(async () => {
      let outcome: RemoteApplyResult = 'ignored';
      await this.db.withTransactionAsync(async () => {
        if (await this.isTombstoned('attachment', remote.id)) { await this.enqueue('attachment', remote.id, 'delete'); return; }
        if (!(await this.getMoment(remote.momentId))) return; // parent deleted or not restored; nothing to attach to
        const result = await this.db.runAsync(
          'INSERT OR IGNORE INTO attachments (id, moment_id, kind, relative_path, bytes, duration_ms, created_at, local_file) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          [remote.id, remote.momentId, remote.kind, remote.relativePath, remote.bytes, remote.durationMs, remote.createdAt]);
        await this.writeSyncRecord('attachment', remote.id, { changeTag, systemFields, syncedVersion: 1 });
        outcome = result.changes === 1 ? 'inserted' : 'echo';
      });
      return outcome;
    });
  }

  /** A synced preference (hidden themes) from iCloud. A pending local change wins. */
  applyRemotePref(key: string, value: string, changeTag: string, systemFields: string): Promise<RemoteApplyResult> {
    return this.serial(async () => {
      let outcome: RemoteApplyResult = 'ignored';
      if (!(SYNCED_PREFS as readonly string[]).includes(key)) return outcome;
      await this.db.withTransactionAsync(async () => {
        const pending = await this.db.getFirstAsync("SELECT 1 AS hit FROM sync_outbox WHERE entity = 'pref' AND id = ?", [key]);
        await this.writeSyncRecord('pref', key, { changeTag, systemFields, syncedVersion: 1 });
        if (pending) return;
        await this.db.runAsync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value]);
        outcome = 'updated';
      });
      return outcome;
    });
  }

  /**
   * A deletion from iCloud (record deleted or tombstone record). Removes the item locally without
   * queueing anything, keeps a local tombstone, and returns relative paths of files to remove.
   */
  applyRemoteDeletion(entity: 'moment' | 'attachment', id: string): Promise<string[]> {
    return this.serial(async () => {
      const files: string[] = [];
      await this.db.withTransactionAsync(async () => {
        const at = this.now();
        const attachments = entity === 'moment'
          ? await this.db.getAllAsync<AttachmentRow>('SELECT * FROM attachments WHERE moment_id = ?', [id])
          : await this.db.getAllAsync<AttachmentRow>('SELECT * FROM attachments WHERE id = ?', [id]);
        for (const a of attachments) {
          if (a.local_file) files.push(a.relative_path);
          await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', ['attachment', a.id, at]);
          await this.db.runAsync("DELETE FROM sync_outbox WHERE entity = 'attachment' AND id = ?", [a.id]);
          await this.db.runAsync("DELETE FROM sync_records WHERE entity = 'attachment' AND id = ?", [a.id]);
        }
        if (entity === 'moment') {
          await this.db.runAsync('DELETE FROM moment_versions WHERE moment_id = ?', [id]);
          await this.db.runAsync('DELETE FROM moment_conflicts WHERE moment_id = ?', [id]);
          await this.db.runAsync('DELETE FROM moments WHERE id = ?', [id]);
        } else {
          await this.db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
        }
        await this.db.runAsync('INSERT OR REPLACE INTO tombstones (entity, id, deleted_at) VALUES (?, ?, ?)', [entity, id, at]);
        await this.db.runAsync('DELETE FROM sync_outbox WHERE entity = ? AND id = ?', [entity, id]);
        await this.db.runAsync('DELETE FROM sync_records WHERE entity = ? AND id = ?', [entity, id]);
      });
      return files;
    });
  }

  /**
   * Queues everything not yet confirmed by iCloud (first sync, sync switched back on, or a deliberate
   * fresh start with a new Apple Account). Idempotent. Cloud-only attachments are never queued.
   */
  enqueueAllUnsynced(): Promise<number> {
    return this.serial(async () => {
      if (!this.trackSync) return 0;
      let queued = 0;
      await this.db.withTransactionAsync(async () => {
        const moments = await this.db.getAllAsync<{ id: string }>(
          `SELECT m.id FROM moments m LEFT JOIN sync_records r ON r.entity = 'moment' AND r.id = m.id
           LEFT JOIN sync_outbox o ON o.entity = 'moment' AND o.id = m.id
           WHERE o.id IS NULL AND (r.id IS NULL OR r.synced_version IS NULL OR r.synced_version != m.version)`);
        for (const m of moments) { await this.enqueue('moment', m.id, 'upsert'); queued++; }
        const attachments = await this.db.getAllAsync<{ id: string }>(
          `SELECT a.id FROM attachments a LEFT JOIN sync_records r ON r.entity = 'attachment' AND r.id = a.id
           LEFT JOIN sync_outbox o ON o.entity = 'attachment' AND o.id = a.id
           WHERE o.id IS NULL AND r.id IS NULL AND a.local_file = 1`);
        for (const a of attachments) { await this.enqueue('attachment', a.id, 'upsert'); queued++; }
        for (const key of SYNCED_PREFS) {
          const set = await this.db.getFirstAsync('SELECT 1 AS hit FROM preferences WHERE key = ?', [key]);
          const confirmed = await this.getSyncRecord('pref', key);
          if (set && !confirmed) { await this.enqueue('pref', key, 'upsert'); queued++; }
        }
      });
      return queued;
    });
  }

  /**
   * Forgets everything this device knew about the cloud (change token, confirmations, queued items).
   * Used after "Delete iCloud copies", when iCloud copies disappeared, or for a deliberate start with a
   * new Apple Account. Attachment rows that only existed in that cloud are removed (no file, no copy).
   * Returns the number of such cloud-only attachments.
   */
  resetSyncMetadata(): Promise<number> {
    return this.serial(async () => {
      let removed = 0;
      await this.db.withTransactionAsync(async () => {
        removed = (await this.db.runAsync('DELETE FROM attachments WHERE local_file = 0')).changes;
        await this.db.runAsync('DELETE FROM sync_outbox');
        await this.db.runAsync('DELETE FROM sync_records');
        await this.db.runAsync("DELETE FROM sync_state WHERE key IN ('changeToken', 'zoneReady')");
      });
      return removed;
    });
  }

  /** Per-item sync marks for status lines. Keys are `${entity}:${id}`. */
  async syncMarks(): Promise<SyncMarks> {
    const outbox = await this.db.getAllAsync<{ entity: string; id: string; last_error: string | null }>('SELECT entity, id, last_error FROM sync_outbox');
    const records = await this.db.getAllAsync<{ entity: string; id: string }>('SELECT entity, id FROM sync_records');
    const pending = new Set(outbox.map(r => `${r.entity}:${r.id}`));
    const failed = new Set(outbox.filter(r => r.last_error).map(r => `${r.entity}:${r.id}`));
    const confirmed = new Set(records.map(r => `${r.entity}:${r.id}`).filter(key => !pending.has(key)));
    return { pending, failed, confirmed };
  }

  async listOpenConflicts(momentId?: string): Promise<MomentConflict[]> {
    type Row = { id: number; moment_id: string; title: string; body: string; participant_label: string | null; remote_version: number; remote_updated_at: string; detected_at: string };
    const rows = momentId
      ? await this.db.getAllAsync<Row>('SELECT * FROM moment_conflicts WHERE resolved_at IS NULL AND moment_id = ? ORDER BY id DESC', [momentId])
      : await this.db.getAllAsync<Row>('SELECT * FROM moment_conflicts WHERE resolved_at IS NULL ORDER BY id DESC');
    return rows.map(r => ({ id: r.id, momentId: r.moment_id, title: r.title, body: r.body, participantLabel: r.participant_label, remoteVersion: r.remote_version, remoteUpdatedAt: r.remote_updated_at, detectedAt: r.detected_at }));
  }

  /**
   * "Keep this version": closes the open conflicts of this Moment. The other text stays stored
   * (resolved, not deleted) so nothing is lost. "Use the other version" goes through updateMoment.
   */
  resolveConflicts(momentId: string): Promise<void> {
    return this.serial(async () => {
      await this.db.runAsync('UPDATE moment_conflicts SET resolved_at = ? WHERE moment_id = ? AND resolved_at IS NULL', [this.now(), momentId]);
    });
  }
}
