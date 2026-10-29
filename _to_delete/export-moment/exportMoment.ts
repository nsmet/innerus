import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { getTopic } from '../content/catalogue';
import type { Language } from '../content/types';
import type { Attachment, Moment } from '../data/repository';
import {
  clearExportFolder, exportFolder, extensionOf, hasRoomFor, isoDay, localFileFor, momentBlock, writeZipFile,
  type AttachmentRef, type PlannedFile,
} from './exportAll';
import { UniquePaths, ZipLimitError, sanitizeFileName } from './zip';

/**
 * Deliberate export of one Moment (spec 21/37). The person chooses:
 *   - the words as plain text (system share of a message, nothing written to disk), or
 *   - files: a readable document (.txt) and/or the original recording and/or the kept transcript.
 * One file is shared as itself; several are shared as one .zip. Temporary copies live in the cache and are
 * removed after the share sheet closes. Nothing is uploaded by InnerUs; the destination receives a copy.
 */
export type ExportAttachment = { uri: string; kind: 'audio' | 'transcript' };
export type ExportWhat = 'text' | 'recording';
export type ExportResult = 'shared' | 'dismissed' | 'unavailable' | 'no-space' | 'failed';

const labels = {
  topic: { en: 'Conversation', nl: 'Gesprek' },
  question: { en: 'Question', nl: 'Vraag' },
  date: { en: 'Date', nl: 'Datum' },
  source: { en: 'Source', nl: 'Bron' },
  typed: { en: 'Written by you', nl: 'Door jou geschreven' },
  'reviewed-ai': { en: 'AI draft, reviewed by you', nl: 'AI-voorstel, door jou nagekeken' },
  audio: { en: 'Voice note', nl: 'Spraaknotitie' },
  footer: { en: 'Exported from InnerUs.', nl: 'Geëxporteerd uit InnerUs.' },
  transcript: { en: 'transcript', nl: 'transcript' },
} as const;

function safeName(title: string) {
  return sanitizeFileName(title, 'InnerUs moment');
}

/** The readable text: title, conversation, question, date, source, body. */
export function momentText(moment: Moment, language: Language) {
  const topic = getTopic(moment.topicId);
  const date = new Date(moment.createdAt).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [moment.title, ''];
  if (topic) lines.push(`${labels.topic[language]}: ${topic.title[language]}`);
  if (moment.questionSnapshot) lines.push(`${labels.question[language]}: ${moment.questionSnapshot}`);
  lines.push(`${labels.date[language]}: ${date}`);
  lines.push(`${labels.source[language]}: ${labels[moment.source][language]}`);
  if (moment.body.trim()) lines.push('', moment.body);
  lines.push('', '—', labels.footer[language], '');
  return lines.join('\n');
}

function shareTypeFor(name: string): { mimeType: string; UTI: string } {
  const extension = extensionOf(name, '');
  switch (extension) {
    case 'zip': return { mimeType: 'application/zip', UTI: 'public.zip-archive' };
    case 'txt': return { mimeType: 'text/plain', UTI: 'public.plain-text' };
    case 'm4a':
    case 'mp4':
    case 'aac': return { mimeType: 'audio/mp4', UTI: 'public.mpeg-4-audio' };
    case 'caf': return { mimeType: 'audio/x-caf', UTI: 'com.apple.coreaudio-format' };
    case 'wav': return { mimeType: 'audio/wav', UTI: 'com.microsoft.waveform-audio' };
    case '3gp': return { mimeType: 'audio/3gpp', UTI: 'public.3gpp' };
    default: return { mimeType: 'application/octet-stream', UTI: 'public.data' };
  }
}

// ---------------------------------------------------------------------------------------------
// Choosing and previewing
// ---------------------------------------------------------------------------------------------
export type MomentSelection =
  | { mode: 'text' }
  | { mode: 'files'; document: boolean; recording: boolean; transcript: boolean };

/** What each choice refers to on this device. `available: false` = kept, but its file is not on this device. */
export type MomentExportSources = {
  recording: { attachment: AttachmentRef; file: File | null } | null;
  transcript: { attachment: AttachmentRef; file: File | null } | null;
};

export function momentExportSources(moment: Moment, attachments: readonly Attachment[], attachmentUri: (a: Attachment) => string): MomentExportSources {
  const audio = attachments.find(a => a.momentId === moment.id && a.kind === 'audio');
  const transcript = attachments.find(a => a.momentId === moment.id && a.kind === 'transcript');
  return {
    recording: audio ? { attachment: audio, file: localFileFor(audio, attachmentUri(audio)) } : null,
    transcript: transcript ? { attachment: transcript, file: localFileFor(transcript, attachmentUri(transcript)) } : null,
  };
}

export type PreviewItem = { kind: 'document' | 'recording' | 'transcript'; name: string; bytes: number | null };
export type MomentExportPlan =
  | { mode: 'text'; text: string }
  | { mode: 'files'; items: PreviewItem[]; archiveName: string | null; build: PlannedBuild }
  | { mode: 'nothing' };

type PlannedBuild = { document: { name: string; text: string } | null; files: { name: string; file: File }[] };

function sizeOf(file: File) {
  try { return file.size ?? null; } catch { return null; }
}

/** Turns a selection into exactly what will be shared, for the preview and for `shareMomentExport`. */
export function planMomentExport(moment: Moment, sources: MomentExportSources, selection: MomentSelection, language: Language): MomentExportPlan {
  if (selection.mode === 'text') return { mode: 'text', text: momentText(moment, language) };

  const base = `${isoDay(moment.createdAt)} ${safeName(moment.title)}`;
  const names = new UniquePaths();
  const files: PlannedBuild['files'] = [];
  const items: PreviewItem[] = [];
  const references: PlannedFile[] = [];

  const recording = selection.recording && sources.recording?.file ? sources.recording : null;
  const transcript = selection.transcript && sources.transcript?.file ? sources.transcript : null;

  // Reserve the document name first so it keeps the plain "<date> <title>.txt".
  const documentName = selection.document ? names.take('', base, 'txt') : null;
  if (recording?.file) {
    const name = names.take('', base, extensionOf(recording.attachment.relativePath, 'm4a'));
    files.push({ name, file: recording.file });
    items.push({ kind: 'recording', name, bytes: sizeOf(recording.file) });
    references.push({ attachment: recording.attachment, status: 'included', path: name, file: recording.file });
  }
  if (transcript?.file) {
    const name = names.take('', `${base} — ${labels.transcript[language]}`, 'txt');
    files.push({ name, file: transcript.file });
    items.push({ kind: 'transcript', name, bytes: sizeOf(transcript.file) });
    references.push({ attachment: transcript.attachment, status: 'included', path: name, file: transcript.file });
  }

  let document: PlannedBuild['document'] = null;
  if (documentName) {
    // With files alongside, the document names them; on its own it is the plain readable text.
    const text = references.length
      ? `${momentBlock(moment, references, language)}\n\n—\n${labels.footer[language]}\n`
      : momentText(moment, language);
    document = { name: documentName, text };
    items.unshift({ kind: 'document', name: documentName, bytes: text.length });
  }

  if (!items.length) return { mode: 'nothing' };
  const archiveName = items.length > 1 ? `${base}.zip` : null;
  return { mode: 'files', items, archiveName, build: { document, files } };
}

// ---------------------------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------------------------

/** Shares a planned export. The caller has already explained that the destination receives a copy. */
export async function shareMomentExport(plan: MomentExportPlan, title: string, language: Language): Promise<ExportResult> {
  if (plan.mode === 'nothing') return 'failed';
  if (plan.mode === 'text') {
    try {
      const result = await Share.share({ message: plan.text, title }, { dialogTitle: title, subject: title });
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch {
      return 'failed';
    }
  }

  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  clearExportFolder();
  let shared: File | null = null;
  try {
    const { document, files } = plan.build;
    const needed = (document?.text.length ?? 0) * 3 + files.reduce((sum, f) => sum + (sizeOf(f.file) ?? 0), 0);
    if (!hasRoomFor(needed)) return 'no-space';

    if (plan.archiveName) {
      shared = await writeZipFile(plan.archiveName, [
        ...(document ? [{ path: document.name, text: document.text }] : []),
        ...files.map(f => ({ path: f.name, file: f.file })),
      ]);
    } else {
      const folder = exportFolder();
      folder.create({ intermediates: true, idempotent: true });
      if (document) {
        shared = new File(folder, document.name);
        shared.create({ overwrite: true });
        await shared.write(document.text);
      } else {
        const only = files[0];
        shared = new File(folder, only.name);
        await only.file.copy(shared);
      }
    }
    await Sharing.shareAsync(shared.uri, { ...shareTypeFor(shared.name), dialogTitle: title || (language === 'nl' ? 'Moment exporteren' : 'Export Moment') });
    return 'shared';
  } catch (error) {
    return error instanceof ZipLimitError ? 'no-space' : 'failed';
  } finally {
    try { if (shared?.exists) shared.delete(); } catch { /* removed with the next export */ }
    clearExportFolder();
  }
}

/**
 * Earlier entry point, kept for existing callers: 'text' shares the readable document (.txt),
 * 'recording' shares the original recording.
 */
export async function exportMoment(moment: Moment, attachments: ExportAttachment[], language: Language, what: ExportWhat = 'text'): Promise<ExportResult> {
  const audio = attachments.find(a => a.kind === 'audio');
  const recordingFile = audio ? localFileFor({}, audio.uri) : null;
  if (what === 'recording' && !recordingFile) return 'failed';
  const sources: MomentExportSources = {
    recording: audio ? { attachment: { kind: 'audio', relativePath: audio.uri, durationMs: null }, file: recordingFile } : null,
    transcript: null,
  };
  const selection: MomentSelection = what === 'text'
    ? { mode: 'files', document: true, recording: false, transcript: false }
    : { mode: 'files', document: false, recording: true, transcript: false };
  return shareMomentExport(planMomentExport(moment, sources, selection, language), moment.title, language);
}
