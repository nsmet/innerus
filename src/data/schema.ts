import type { SqlDatabase } from './sql';

/**
 * Private local store, schema-versioned with forward-only migrations.
 * Never add a migration that rewrites a saved Moment's text or question snapshot (spec 21/63/64).
 * Document every new stored item in docs/DECISIONS.md before adding it (spec 35).
 */
export const migrations: readonly { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE moments (
        id TEXT PRIMARY KEY NOT NULL,             -- stable identity; retries reuse it (spec 34)
        topic_id TEXT NOT NULL,
        topic_version TEXT NOT NULL,
        prompt_id TEXT,                           -- null = about the whole conversation
        question_snapshot TEXT,                   -- readable copy of the original question (spec 63)
        content_language TEXT NOT NULL,           -- 'en' | 'nl'
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('typed', 'reviewed-ai', 'audio')),
        participant_label TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX moments_created ON moments (created_at DESC);
      CREATE INDEX moments_topic ON moments (topic_id);

      -- Prior text kept on edit so a later sync conflict can offer "Review another version".
      CREATE TABLE moment_versions (
        moment_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        PRIMARY KEY (moment_id, version)
      );

      CREATE TABLE attachments (
        id TEXT PRIMARY KEY NOT NULL,
        moment_id TEXT NOT NULL REFERENCES moments (id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('audio', 'transcript')),
        relative_path TEXT NOT NULL,              -- relative to the private directory, never absolute
        bytes INTEGER NOT NULL,
        duration_ms INTEGER,
        created_at TEXT NOT NULL
      );

      -- Minimum non-content record that prevents a stale device resurrecting a deletion (spec 34/37).
      CREATE TABLE tombstones (
        entity TEXT NOT NULL,
        id TEXT NOT NULL,
        deleted_at TEXT NOT NULL,
        PRIMARY KEY (entity, id)
      );

      -- One resumable conversation per device; device-local, never synced (spec 20/33).
      CREATE TABLE active_session (
        slot INTEGER PRIMARY KEY CHECK (slot = 1),
        session_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        topic_version TEXT NOT NULL,
        position INTEGER NOT NULL,                -- 0..4 = prompt index, 5 = closing invitation
        nudge_shown INTEGER NOT NULL DEFAULT 0,
        language TEXT NOT NULL,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Typed draft for the open Moment editor; resolved explicitly (spec 20/24).
      CREATE TABLE drafts (
        session_id TEXT PRIMARY KEY NOT NULL,
        prompt_id TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- One explicit Finish per session identity (spec 18, AC43).
      CREATE TABLE completions (
        session_id TEXT PRIMARY KEY NOT NULL,
        topic_id TEXT NOT NULL,
        completed_at TEXT NOT NULL
      );

      CREATE TABLE bookmarks (
        topic_id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL
      );

      -- Local full-text index of private Moment text; lives in the protected store (spec 31, AC46).
      CREATE VIRTUAL TABLE moments_search USING fts5(
        title, body, question_snapshot,
        content='moments', content_rowid='rowid',
        tokenize='unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER moments_ai AFTER INSERT ON moments BEGIN
        INSERT INTO moments_search (rowid, title, body, question_snapshot) VALUES (new.rowid, new.title, new.body, new.question_snapshot);
      END;
      CREATE TRIGGER moments_ad AFTER DELETE ON moments BEGIN
        INSERT INTO moments_search (moments_search, rowid, title, body, question_snapshot) VALUES ('delete', old.rowid, old.title, old.body, old.question_snapshot);
      END;
      CREATE TRIGGER moments_au AFTER UPDATE ON moments BEGIN
        INSERT INTO moments_search (moments_search, rowid, title, body, question_snapshot) VALUES ('delete', old.rowid, old.title, old.body, old.question_snapshot);
        INSERT INTO moments_search (rowid, title, body, question_snapshot) VALUES (new.rowid, new.title, new.body, new.question_snapshot);
      END;
    `,
  },
  {
    version: 2,
    sql: `
      -- Device-specific preferences (language, appearance, reminders, lock, quick history). Never synced (spec 33).
      CREATE TABLE preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 3,
    sql: `
      -- Private iCloud sync (iOS only, spec 32-34). Adds bookkeeping only; never touches saved text.
      -- 1 = the attachment file is on this device; 0 = only a confirmed iCloud copy exists (Download state).
      ALTER TABLE attachments ADD COLUMN local_file INTEGER NOT NULL DEFAULT 1;

      -- Outbox: one row per changed synced item, written in the same transaction as the change itself.
      -- seq grows on every change, so a confirmation for an older push never clears a newer change.
      CREATE TABLE sync_outbox (
        entity TEXT NOT NULL CHECK (entity IN ('moment', 'attachment', 'bookmark', 'pref')),
        id TEXT NOT NULL,
        op TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
        seq INTEGER NOT NULL,
        queued_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,                          -- non-content error code only
        PRIMARY KEY (entity, id)
      );

      -- Last state the cloud confirmed per item (CloudKit system fields; no content).
      CREATE TABLE sync_records (
        entity TEXT NOT NULL,
        id TEXT NOT NULL,
        change_tag TEXT,
        system_fields TEXT,                       -- base64 archived CKRecord system fields
        synced_version INTEGER,                   -- Moment version the cloud holds
        synced_at TEXT NOT NULL,
        PRIMARY KEY (entity, id)
      );

      -- Sync switches and cursors: enabled flag, change token, hashed account marker. Device-local.
      CREATE TABLE sync_state (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      -- The other side of a concurrent edit, kept so nothing is lost (spec 34). Never merged automatically.
      CREATE TABLE moment_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        moment_id TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        participant_label TEXT,
        remote_version INTEGER NOT NULL,
        remote_updated_at TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved_at TEXT
      );
      CREATE INDEX moment_conflicts_moment ON moment_conflicts (moment_id);
    `,
  },
  {
    // Bookmarks were removed from the product. Drop the table and any pending or confirmed bookmark sync rows.
    version: 4,
    sql: `
      DROP TABLE IF EXISTS bookmarks;
      DELETE FROM sync_outbox WHERE entity = 'bookmark';
      DELETE FROM sync_records WHERE entity = 'bookmark';
    `,
  },
];

export const SCHEMA_VERSION = migrations[migrations.length - 1].version;

/** Applies pending migrations atomically. Refuses to open a store from a newer app version. */
export async function migrate(db: SqlDatabase): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) {
    throw new Error(`Private store schema ${current} is newer than this app (${SCHEMA_VERSION}).`);
  }
  for (const migration of migrations.filter(m => m.version > current)) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return SCHEMA_VERSION;
}
