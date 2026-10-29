import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrivateRepository, type NewMoment } from '../repository';
import { migrate, SCHEMA_VERSION } from '../schema';
import { openNodeDatabase } from './nodeSqlite';

// Fictional fixtures only (handoff §30/§73). Never use real recordings or notes in tests.
const fixture = (overrides: Partial<NewMoment> = {}): NewMoment => ({
  id: 'moment-fixture-1', topicId: 'A01', topicVersion: '1.0', promptId: 'A01-03',
  questionSnapshot: 'What tiny detail from that day has stayed with you?', contentLanguage: 'en',
  title: 'The café receipt', body: 'Fictional: we both remember the receipt differently.', source: 'typed', participantLabel: null,
  ...overrides,
});

async function freshRepository(path?: string) {
  const db = openNodeDatabase(path);
  await migrate(db);
  let tick = 0;
  return { db, repository: new PrivateRepository(db, () => new Date(Date.UTC(2026, 9, 22, 12, 0, tick++)).toISOString()) };
}

describe('private store schema', () => {
  it('migrates an empty store to the current version and is idempotent', async () => {
    const db = openNodeDatabase();
    expect(await migrate(db)).toBe(SCHEMA_VERSION);
    expect(await migrate(db)).toBe(SCHEMA_VERSION);
    expect((await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(SCHEMA_VERSION);
  });

  it('refuses to open a store written by a newer app version', async () => {
    const db = openNodeDatabase();
    await db.execAsync('PRAGMA user_version = 999');
    await expect(migrate(db)).rejects.toThrow(/newer than this app/);
  });
});

describe('Moments', () => {
  it('saves exactly as written and survives closing and reopening the store (relaunch)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'innerus-'));
    const path = join(dir, 'innerus-private.db');
    try {
      const first = await freshRepository(path);
      const body = 'Fictional note — "maybe next spring", niet zeker. Café ☕\nSecond line.';
      await first.repository.saveMoment(fixture({ body }));
      first.db.close();
      const second = await freshRepository(path);
      const reopened = await second.repository.getMoment('moment-fixture-1');
      expect(reopened?.body).toBe(body);
      expect(reopened?.questionSnapshot).toBe('What tiny detail from that day has stayed with you?');
      second.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is idempotent for repeated saves of the same identity (double tap / retry)', async () => {
    const { repository } = await freshRepository();
    await repository.saveMoment(fixture());
    await repository.saveMoment(fixture({ body: 'a retried payload must not duplicate or overwrite' }));
    const all = await repository.listMoments();
    expect(all).toHaveLength(1);
    expect(all[0].body).toBe(fixture().body);
  });

  it('lists newest first and filters by topic', async () => {
    const { repository } = await freshRepository();
    await repository.saveMoment(fixture({ id: 'm1' }));
    await repository.saveMoment(fixture({ id: 'm2', topicId: 'B01', promptId: null, questionSnapshot: null }));
    expect((await repository.listMoments()).map(m => m.id)).toEqual(['m2', 'm1']);
    expect((await repository.listMoments('A01')).map(m => m.id)).toEqual(['m1']);
  });

  it('keeps a recoverable prior version on edit and rejects stale edits', async () => {
    const { db, repository } = await freshRepository();
    const saved = await repository.saveMoment(fixture());
    const edited = await repository.updateMoment(saved.id, 1, { body: 'Edited fictional text' });
    expect(edited.version).toBe(2);
    expect(edited.body).toBe('Edited fictional text');
    const prior = await db.getFirstAsync<{ body: string }>('SELECT body FROM moment_versions WHERE moment_id = ? AND version = 1', [saved.id]);
    expect(prior?.body).toBe(fixture().body);
    await expect(repository.updateMoment(saved.id, 1, { body: 'stale' })).rejects.toThrow(/changed elsewhere/);
  });

  it('searches private text locally, accent-insensitively, and updates the index on edit/delete', async () => {
    const { repository } = await freshRepository();
    await repository.saveMoment(fixture({ id: 'm1', title: 'Het café', body: 'Fictief: een regenachtige dinsdag.', contentLanguage: 'nl' }));
    await repository.saveMoment(fixture({ id: 'm2', title: 'Garden', body: 'Fictional picnic plan.' }));
    expect((await repository.searchMoments('cafe')).map(m => m.id)).toEqual(['m1']);
    expect((await repository.searchMoments('regen')).map(m => m.id)).toEqual(['m1']);
    await repository.updateMoment('m2', 1, { body: 'Fictional rainy plan.' });
    expect((await repository.searchMoments('picnic'))).toEqual([]);
    await repository.deleteMoment('m1');
    expect(await repository.searchMoments('cafe')).toEqual([]);
    expect((await repository.searchMoments('"; DROP TABLE moments; --')).length).toBe(0);
  });

  it('deletes with a tombstone so the same identity cannot be resurrected', async () => {
    const { repository } = await freshRepository();
    await repository.saveMoment(fixture());
    await repository.deleteMoment('moment-fixture-1');
    expect(await repository.getMoment('moment-fixture-1')).toBeNull();
    await expect(repository.saveMoment(fixture())).rejects.toThrow(/deleted/);
  });
});

describe('session, drafts and completion', () => {
  it('keeps one resumable position per device and resumes it after reopening', async () => {
    const { repository } = await freshRepository();
    await repository.saveActiveSession({ sessionId: 's1', topicId: 'A01', topicVersion: '1.0', position: 2, nudgeShown: true, language: 'en', startedAt: '2026-10-22T12:00:00.000Z' });
    await repository.saveActiveSession({ sessionId: 's2', topicId: 'B01', topicVersion: '1.0', position: 5, nudgeShown: false, language: 'nl', startedAt: '2026-10-22T12:00:00.000Z' });
    const session = await repository.getActiveSession();
    expect(session).toMatchObject({ sessionId: 's2', topicId: 'B01', position: 5, nudgeShown: false, language: 'nl' });
    await expect(repository.saveActiveSession({ ...session!, position: 6 })).rejects.toThrow(/Invalid/);
  });

  it('records one completion per session even with repeated Finish taps, and clears the position', async () => {
    const { repository } = await freshRepository();
    await repository.saveActiveSession({ sessionId: 's1', topicId: 'A01', topicVersion: '1.0', position: 5, nudgeShown: false, language: 'en', startedAt: '2026-10-22T12:00:00.000Z' });
    const results = await Promise.all([repository.recordCompletion('s1', 'A01'), repository.recordCompletion('s1', 'A01')]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.completionCount('A01')).toBe(1);
    expect(await repository.getActiveSession()).toBeNull();
    // A replay is a new session identity and counts again.
    expect(await repository.recordCompletion('s2', 'A01')).toBe(true);
    expect(await repository.completionCount()).toBe(2);
  });

  it('keeps typed drafts until explicitly discarded', async () => {
    const { repository } = await freshRepository();
    await repository.saveDraft({ sessionId: 's1', promptId: 'A01-01', title: '', body: 'Fictional half-written note' });
    expect((await repository.getDraft('s1'))?.body).toBe('Fictional half-written note');
    await repository.discardDraft('s1');
    expect(await repository.getDraft('s1')).toBeNull();
  });
});
