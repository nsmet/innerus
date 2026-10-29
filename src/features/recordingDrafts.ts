import { Directory, File } from 'expo-file-system';
import { protectFile } from '../../modules/innerus-platform';
import type { MomentSource } from '../navigation/types';

/**
 * Recording draft recovery (spec 24).
 *
 * When capture stops, the clip moves into `<privateDirectory>/recording-drafts/` (protected, excluded
 * from backup) and is listed in a small JSON index there. The index holds no personal text: only file
 * names, duration, topic/prompt ids and the time capture stopped.
 *
 * - A draft that was not resolved (saved or discarded) is offered again on the next launch.
 * - Drafts expire 24 hours after capture stopped; "Keep draft" or reopening never extends that.
 * - Expired drafts are removed at the next cleanup opportunity, never while their review is open.
 */
export type RecordingDraft = {
  id: string;
  /** File name inside the drafts folder. */
  fileName: string;
  durationMs: number;
  source: MomentSource;
  /** ISO time capture last stopped. */
  stoppedAt: string;
};

export const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;
const FOLDER = 'recording-drafts';
const INDEX = 'index.json';

/** Clips whose review screen is open right now: never deleted by cleanup. */
const openReviews = new Set<string>();
/** Drafts created during this app session: they are in their normal flow, not interrupted. */
const createdThisSession = new Set<string>();

function folderUri(privateDirectory: string) {
  return `file://${privateDirectory}/${FOLDER}`;
}

export function draftUri(privateDirectory: string, draft: RecordingDraft) {
  return `${folderUri(privateDirectory)}/${draft.fileName}`;
}

function sameFile(a: string, b: string) {
  const strip = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));
  return strip(a) === strip(b);
}

function readIndex(privateDirectory: string): RecordingDraft[] {
  try {
    const file = new File(`${folderUri(privateDirectory)}/${INDEX}`);
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? (parsed as RecordingDraft[]).filter(d => d && typeof d.fileName === 'string' && d.source)
      .map(d => ({ ...d, source: { ...d.source, topicVersion: d.source.topicVersion ?? '1.0' } })) : [];
  } catch {
    return [];
  }
}

function writeIndex(privateDirectory: string, drafts: RecordingDraft[]) {
  const folder = new Directory(folderUri(privateDirectory));
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  const file = new File(`${folderUri(privateDirectory)}/${INDEX}`);
  if (!file.exists) file.create({ overwrite: true });
  file.writeSync(JSON.stringify(drafts));
  try { protectFile(file.uri); } catch { /* the folder itself is already protected */ }
}

function deleteQuietly(uri: string) {
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* best effort */ }
}

/**
 * Moves a just-stopped clip into the protected drafts folder and registers it. Returns the URI the
 * review should use. If the private store is not ready, the original clip is returned untouched.
 */
export function registerRecordingDraft(privateDirectory: string | null, uri: string, durationMs: number, source: MomentSource): string {
  if (!privateDirectory) return uri;
  try {
    const folder = new Directory(folderUri(privateDirectory));
    if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const extension = uri.split('.').pop()?.split('?')[0] || 'm4a';
    const fileName = `${id}.${extension}`;
    const target = new File(`${folderUri(privateDirectory)}/${fileName}`);
    new File(uri).copySync(target);
    try { protectFile(target.uri); } catch { /* adapter absent in development hosts */ }
    deleteQuietly(uri);
    const draft: RecordingDraft = { id, fileName, durationMs, source, stoppedAt: new Date().toISOString() };
    writeIndex(privateDirectory, [...readIndex(privateDirectory), draft]);
    createdThisSession.add(fileName);
    return target.uri;
  } catch {
    return uri;
  }
}

/** Marks a clip's review as open (cleanup leaves it alone) or closed. */
export function setReviewOpen(uri: string, open: boolean) {
  if (open) openReviews.add(uri);
  else openReviews.delete(uri);
}

function isOpen(privateDirectory: string, draft: RecordingDraft) {
  const uri = draftUri(privateDirectory, draft);
  for (const open of openReviews) if (sameFile(open, uri)) return true;
  return false;
}

/**
 * The clip was saved into a Moment or discarded: forget it. The caller has already moved or
 * deleted the file (attachAudio moves it; discarding deletes it); a leftover file is removed here.
 */
export function resolveRecordingDraft(privateDirectory: string | null, uri: string) {
  if (!privateDirectory) return;
  const drafts = readIndex(privateDirectory);
  const remaining = drafts.filter(d => !sameFile(draftUri(privateDirectory, d), uri));
  if (remaining.length === drafts.length) return;
  deleteQuietly(uri);
  try { writeIndex(privateDirectory, remaining); } catch { /* retried at the next cleanup */ }
}

/** Removes a draft and its clip (Discard draft). */
export function discardRecordingDraft(privateDirectory: string | null, draft: RecordingDraft) {
  if (!privateDirectory) return;
  resolveRecordingDraft(privateDirectory, draftUri(privateDirectory, draft));
}

/**
 * Cleanup: removes expired drafts, index entries without a file and stray files, but never a clip
 * whose review is open. Returns the drafts still waiting from earlier app sessions, newest first.
 */
export function cleanUpRecordingDrafts(privateDirectory: string | null, now = Date.now()): RecordingDraft[] {
  if (!privateDirectory) return [];
  try {
    const folder = new Directory(folderUri(privateDirectory));
    if (!folder.exists) return [];
    const drafts = readIndex(privateDirectory);
    const kept: RecordingDraft[] = [];
    for (const draft of drafts) {
      const uri = draftUri(privateDirectory, draft);
      const exists = new File(uri).exists;
      const stopped = Date.parse(draft.stoppedAt);
      const expired = !Number.isFinite(stopped) || now - stopped >= DRAFT_LIFETIME_MS;
      if (isOpen(privateDirectory, draft)) { kept.push(draft); continue; }
      if (!exists) continue;
      if (expired) { deleteQuietly(uri); continue; }
      kept.push(draft);
    }
    // Stray clips (for example after a crash between copy and index write) are not kept silently.
    const known = new Set([INDEX, ...kept.map(d => d.fileName)]);
    for (const entry of folder.list()) {
      if (entry instanceof File && !known.has(entry.name) && ![...openReviews].some(open => sameFile(open, entry.uri))) {
        deleteQuietly(entry.uri);
      }
    }
    if (kept.length !== drafts.length) writeIndex(privateDirectory, kept);
    return kept
      .filter(d => !createdThisSession.has(d.fileName) && !isOpen(privateDirectory, d))
      .sort((a, b) => b.stoppedAt.localeCompare(a.stoppedAt));
  } catch {
    return [];
  }
}

/** Time left before a draft expires, in milliseconds (never negative). */
export function draftTimeLeft(draft: RecordingDraft, now = Date.now()) {
  const stopped = Date.parse(draft.stoppedAt);
  return Number.isFinite(stopped) ? Math.max(0, stopped + DRAFT_LIFETIME_MS - now) : 0;
}
