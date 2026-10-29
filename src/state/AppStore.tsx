import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getLocales } from 'expo-localization';
import { uuid } from 'expo';
import { Directory, File } from 'expo-file-system';
import { openPrivateStore } from '../data/openPrivateStore';
import type { ActiveSession, Attachment, Moment, MomentConflict, NewMoment, PrivateRepository } from '../data/repository';
import type { Language } from '../content/types';
import { topics } from '../content/catalogue';
import {
  initialSyncSnapshot, SyncEngine, type DeleteCloudOutcome, type DownloadOutcome, type RemoveDownloadOutcome, type SyncSnapshot,
} from '../platform/sync';
import { stripFileScheme } from '../../modules/innerus-platform';
import { cancelReminders } from '../features/reminders';

/**
 * App state for InnerUs. Everything personal lives in the protected private store (src/data).
 * Components never import this for storage side effects; screens do (handoff §53).
 */
export type AppearancePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | Language;
export type Prefs = {
  language: LanguagePref;
  appearance: AppearancePref;
  recordingLanguage: 'en-US' | 'nl-NL' | 'nl-BE';
  appLock: boolean;
  reminders: { enabled: boolean; weekday: number; hour: number; minute: number };
  /** Set once the "Same time next week?" invitation after the first finished conversation has been shown. */
  reminderInviteShown: boolean;
  privacyNoteDismissed: boolean;
  quickHistory: string[];
  resumeDismissedSession: string | null;
  hiddenThemes: string[];
  /** After a recording, draft a short memory automatically when the device supports it (spec 27). Saving still needs review. */
  autoDraftMemory: boolean;
  /** Set once the first-use explanation of the local AI step has been shown (spec 27). */
  localAIExplained: boolean;
};

const defaultPrefs: Prefs = {
  language: 'system',
  appearance: 'system',
  recordingLanguage: 'nl-BE',
  appLock: false,
  reminders: { enabled: false, weekday: 5, hour: 20, minute: 30 },
  reminderInviteShown: false,
  privacyNoteDismissed: false,
  quickHistory: [],
  resumeDismissedSession: null,
  hiddenThemes: [],
  autoDraftMemory: false,
  localAIExplained: false,
};

/** Quiet per-moment sync line (spec 32): only 'synced' after iCloud confirmed the moment and its files. */
export type MomentSyncState = 'local' | 'pending' | 'failed' | 'synced';

type Store = {
  ready: boolean;
  storageError: string | null;
  repository: PrivateRepository | null;
  privateDirectory: string | null;
  prefs: Prefs;
  language: Language;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => Promise<void>;
  moments: Moment[];
  attachments: Attachment[];
  completions: Record<string, number>;
  activeSession: ActiveSession | null;
  refresh: () => Promise<void>;
  // Conversation
  startSession: (topicId: string, topicVersion: string) => Promise<ActiveSession>;
  saveSession: (session: ActiveSession) => Promise<void>;
  finishSession: (sessionId: string, topicId: string) => Promise<void>;
  dismissResume: () => Promise<void>;
  // Moments
  saveMoment: (input: Omit<NewMoment, 'id'> & { id?: string }) => Promise<Moment>;
  updateMoment: (id: string, expectedVersion: number, changes: { title?: string; body?: string }) => Promise<Moment>;
  deleteMoment: (id: string) => Promise<void>;
  attachAudio: (momentId: string, sourceUri: string, durationMs: number) => Promise<void>;
  /** Saves a reviewed transcript as a private text attachment (spec 24/27: only when explicitly selected). */
  attachTranscript: (momentId: string, text: string) => Promise<void>;
  removeAttachment: (attachment: Attachment) => Promise<void>;
  attachmentUri: (attachment: Attachment) => string;
  deleteAllPrivateContent: () => Promise<void>;
  // Private iCloud sync (iOS only; Android is always 'local-only')
  sync: SyncSnapshot;
  setSyncEnabled: (on: boolean) => Promise<void>;
  retrySync: () => Promise<void>;
  deleteCloudCopies: () => Promise<DeleteCloudOutcome>;
  /** Deliberate choice after an Apple Account change; never automatic. */
  adoptCurrentAccountForSync: () => Promise<void>;
  acknowledgeAccountChange: () => Promise<void>;
  dismissSyncNotice: () => Promise<void>;
  momentSyncState: (momentId: string) => MomentSyncState;
  downloadAttachment: (attachment: Attachment, onProgress: (fraction: number) => void) => { promise: Promise<DownloadOutcome>; cancel: () => void };
  removeDownload: (attachment: Attachment) => Promise<RemoveDownloadOutcome>;
  /** Open "two versions" choices, newest first (spec 34). */
  conflicts: MomentConflict[];
  keepThisVersion: (momentId: string) => Promise<void>;
  useOtherVersion: (conflict: MomentConflict) => Promise<Moment>;
};

const Context = createContext<Store | null>(null);

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'nl' ? 'nl' : 'en';
}

function parsePrefs(raw: Record<string, string>): Prefs {
  const prefs = { ...defaultPrefs };
  for (const key of Object.keys(defaultPrefs) as (keyof Prefs)[]) {
    if (raw[key] === undefined) continue;
    try { (prefs as Record<string, unknown>)[key] = JSON.parse(raw[key]); } catch { /* keep default */ }
  }
  return prefs;
}

export function AppStoreProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [repository, setRepository] = useState<PrivateRepository | null>(null);
  const [privateDirectory, setPrivateDirectory] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [completions, setCompletions] = useState<Record<string, number>>({});
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sync, setSync] = useState<SyncSnapshot>(initialSyncSnapshot);
  const [conflicts, setConflicts] = useState<MomentConflict[]>([]);
  const repoRef = useRef<PrivateRepository | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);

  const load = useCallback(async (repo: PrivateRepository) => {
    const [m, a, s, p, c] = await Promise.all([repo.listMoments(), repo.listAttachments(), repo.getActiveSession(), repo.getPreferences(), repo.listOpenConflicts()]);
    const counts: Record<string, number> = {};
    for (const id of topics.map(topic => topic.id)) {
      const n = await repo.completionCount(id);
      if (n) counts[id] = n;
    }
    const parsed = parsePrefs(p);
    setMoments(m); setAttachments(a); setActiveSession(s); setPrefs(parsed); setCompletions(counts); setConflicts(c);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const { repository: repo, directory } = await openPrivateStore();
        if (cancelled) return;
        repoRef.current = repo;
        setRepository(repo); setPrivateDirectory(directory);
        await load(repo);
        // Private iCloud sync (iOS). Starts after the local store is usable; never blocks the app.
        const engine = new SyncEngine(repo, stripFileScheme(directory), () => { if (!cancelled) void load(repo).catch(() => undefined); });
        if (engine.supported && !cancelled) {
          engineRef.current = engine;
          unsubscribe = engine.subscribe(snapshot => { if (!cancelled) setSync(snapshot); });
          await engine.start();
        }
      } catch {
        // The app still opens: conversations are bundled and never depend on storage (spec 20/65).
        setStorageError('Private storage is unavailable on this device right now.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; unsubscribe?.(); engineRef.current?.stop(); engineRef.current = null; };
  }, [load]);

  // v1 scheduled its own daily reminders, and iOS keeps them across an app update. InnerUs v2 schedules only the
  // optional weekly reminder, so when that is off nothing should stay scheduled: clear leftovers once per launch.
  const leftoverRemindersCleared = useRef(false);
  useEffect(() => {
    if (!ready || leftoverRemindersCleared.current) return;
    leftoverRemindersCleared.current = true;
    if (!prefs.reminders.enabled && !storageError) void cancelReminders(); // prefs unknown when storage failed
  }, [ready, prefs.reminders.enabled, storageError]);

  /** After every committed local change to a synced item. Debounced inside the engine. */
  const nudge = () => engineRef.current?.nudge();

  const repo = () => {
    if (!repoRef.current) throw new Error('This could not be saved yet. Private storage is unavailable.');
    return repoRef.current;
  };
  const refresh = useCallback(async () => { if (repoRef.current) await load(repoRef.current); }, [load]);

  const setPref = useCallback(async <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs(previous => ({ ...previous, [key]: value }));
    if (repoRef.current) await repoRef.current.setPreference(key, JSON.stringify(value));
    if (key === 'hiddenThemes') engineRef.current?.nudge();
  }, []);

  const language: Language = prefs.language === 'system' ? deviceLanguage() : prefs.language;

  const value = useMemo<Store>(() => ({
    ready, storageError, repository, privateDirectory, prefs, language, setPref, moments, attachments, completions, activeSession,
    refresh,

    async startSession(topicId, topicVersion) {
      const session: ActiveSession = { sessionId: uuid.v4(), topicId, topicVersion, position: 0, nudgeShown: false, language, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (repoRef.current) await repoRef.current.saveActiveSession(session);
      setActiveSession(session);
      return session;
    },
    async saveSession(session) {
      setActiveSession(session);
      if (repoRef.current) await repoRef.current.saveActiveSession(session);
    },
    async finishSession(sessionId, topicId) {
      if (repoRef.current) {
        const counted = await repoRef.current.recordCompletion(sessionId, topicId);
        if (counted) setCompletions(c => ({ ...c, [topicId]: (c[topicId] ?? 0) + 1 }));
      }
      setActiveSession(s => (s?.sessionId === sessionId ? null : s));
    },
    async dismissResume() {
      if (repoRef.current) await repoRef.current.clearActiveSession();
      setActiveSession(null);
    },

    async saveMoment(input) {
      const saved = await repo().saveMoment({ ...input, id: input.id ?? uuid.v4() });
      setMoments(await repo().listMoments());
      nudge();
      return saved;
    },
    async updateMoment(id, expectedVersion, changes) {
      const updated = await repo().updateMoment(id, expectedVersion, changes);
      setMoments(await repo().listMoments());
      nudge();
      return updated;
    },
    async deleteMoment(id) {
      const files = (await repo().listAttachments(id));
      await repo().deleteMoment(id);
      for (const a of files) deleteFileQuietly(fileUri(privateDirectory, a.relativePath));
      setMoments(await repo().listMoments());
      setAttachments(await repo().listAttachments());
      setConflicts(await repo().listOpenConflicts());
      nudge();
    },
    async attachAudio(momentId, sourceUri, durationMs) {
      if (!privateDirectory) throw new Error('This could not be saved yet.');
      const id = uuid.v4();
      const extension = sourceUri.split('.').pop()?.split('?')[0] || 'm4a';
      const relativePath = `audio/${id}.${extension}`;
      const folder = new Directory(`file://${privateDirectory}/audio`);
      if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
      const source = new File(sourceUri);
      const target = new File(fileUri(privateDirectory, relativePath));
      source.copySync(target);
      await repo().addAttachment({ id, momentId, kind: 'audio', relativePath, bytes: target.size ?? 0, durationMs });
      deleteFileQuietly(sourceUri);
      setAttachments(await repo().listAttachments());
      nudge();
    },
    async attachTranscript(momentId, text) {
      if (!privateDirectory) throw new Error('This could not be saved yet.');
      const id = uuid.v4();
      const relativePath = `transcripts/${id}.txt`;
      const folder = new Directory(`file://${privateDirectory}/transcripts`);
      if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
      const target = new File(fileUri(privateDirectory, relativePath));
      target.create({ overwrite: true });
      target.writeSync(text);
      await repo().addAttachment({ id, momentId, kind: 'transcript', relativePath, bytes: target.size ?? 0, durationMs: null });
      setAttachments(await repo().listAttachments());
      nudge();
    },
    async removeAttachment(attachment) {
      await repo().deleteAttachment(attachment.id);
      deleteFileQuietly(fileUri(privateDirectory, attachment.relativePath));
      setAttachments(await repo().listAttachments());
      nudge();
    },
    attachmentUri: attachment => fileUri(privateDirectory, attachment.relativePath),
    async deleteAllPrivateContent() {
      await repo().deleteAllPrivateContent();
      if (privateDirectory) {
        for (const name of ['audio', 'transcripts', 'recording-drafts']) {
          const folder = new Directory(`file://${privateDirectory}/${name}`);
          try { if (folder.exists) folder.delete(); } catch { /* removed at next cleanup */ }
        }
      }
      await load(repo());
      nudge();
    },

    sync,
    async setSyncEnabled(on) { await engineRef.current?.setEnabled(on); },
    async retrySync() { await engineRef.current?.retry(); },
    async deleteCloudCopies() {
      if (!engineRef.current) return 'unavailable';
      const outcome = await engineRef.current.deleteCloudCopies();
      if (repoRef.current) await load(repoRef.current);
      return outcome;
    },
    async adoptCurrentAccountForSync() { await engineRef.current?.useCurrentAccount(); },
    async acknowledgeAccountChange() { await engineRef.current?.acknowledgeAccountChange(); },
    async dismissSyncNotice() { await engineRef.current?.dismissNotice(); },
    momentSyncState(momentId) {
      const keys = [`moment:${momentId}`, ...attachments.filter(a => a.momentId === momentId).map(a => `attachment:${a.id}`)];
      if (keys.some(k => sync.marks.failed.has(k))) return 'failed';
      if (keys.some(k => sync.marks.pending.has(k))) return 'pending';
      return sync.marks.confirmed.has(keys[0]) ? 'synced' : 'local';
    },
    downloadAttachment(attachment, onProgress) {
      if (!engineRef.current) return { promise: Promise.resolve<DownloadOutcome>('unavailable'), cancel: () => undefined };
      return engineRef.current.download(attachment, onProgress);
    },
    async removeDownload(attachment) {
      if (!engineRef.current) return 'not-confirmed';
      return engineRef.current.removeDownload(attachment);
    },
    conflicts,
    async keepThisVersion(momentId) {
      await repo().resolveConflicts(momentId);
      setConflicts(await repo().listOpenConflicts());
    },
    async useOtherVersion(conflict) {
      const current = await repo().getMoment(conflict.momentId);
      if (!current) throw new Error('This moment no longer exists.');
      // The current text is archived as a prior version by updateMoment; nothing is lost.
      const updated = await repo().updateMoment(current.id, current.version, { title: conflict.title, body: conflict.body, participantLabel: conflict.participantLabel });
      await repo().resolveConflicts(conflict.momentId);
      setMoments(await repo().listMoments());
      setConflicts(await repo().listOpenConflicts());
      nudge();
      return updated;
    },
  }), [ready, storageError, repository, privateDirectory, prefs, language, setPref, moments, attachments, completions, activeSession, refresh, load, sync, conflicts]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function fileUri(directory: string | null, relativePath: string) {
  return `file://${directory ?? ''}/${relativePath}`;
}
function deleteFileQuietly(uri: string) {
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* best effort; never logs content */ }
}

export function useAppStore() {
  const value = useContext(Context);
  if (!value) throw new Error('useAppStore requires AppStoreProvider');
  return value;
}
