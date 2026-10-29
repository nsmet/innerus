import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getTopic } from '../content/catalogue';
import type { Language } from '../content/types';
import type { Attachment, Moment } from '../data/repository';
import { UniquePaths, ZipLimitError, ZipWriter, handleSink, handleSource, sanitizeFileName } from './zip';

/**
 * "Export all" (spec 37): one .zip with a complete readable collection of every Moment plus the original
 * retained recordings and kept transcripts.
 *
 *   InnerUs Moments.txt        newest first; topic, question, date, source and the files that belong to each Moment
 *   audio/<date> <title>.m4a   original recordings, byte for byte as kept in InnerUs
 *   transcripts/<date> <title>.txt
 *
 * The archive is assembled in the cache in 256 KB chunks (see zip.ts), so memory stays flat however long the
 * recordings are; the readable text itself is built in memory (text only, small). Limits: classic ZIP, so at most
 * 4 GB and 65,535 files; free storage is checked first. Attachments whose file is not on this device (for example a
 * recording not yet downloaded from iCloud) are listed as such instead of failing the export.
 * The temporary archive is deleted after the share sheet closes (and before every new export).
 */
export type ExportResult = 'shared' | 'empty' | 'unavailable' | 'no-space' | 'failed';

export type ExportAllOptions = {
  /** Resolves an attachment to its file URI (AppStore `attachmentUri`). Without it no attachment files are included. */
  attachmentUri?: (attachment: Attachment) => string;
  /** Include original recordings (default true). */
  includeRecordings?: boolean;
  /** Include kept transcripts (default true). */
  includeTranscripts?: boolean;
};

export const exportLabels = {
  en: {
    heading: 'InnerUs — your Moments',
    exported: 'Exported',
    count: (n: number) => (n === 1 ? '1 Moment' : `${n} Moments`),
    recordings: (n: number) => (n === 1 ? '1 recording' : `${n} recordings`),
    transcripts: (n: number) => (n === 1 ? '1 transcript' : `${n} transcripts`),
    contents: 'In this export',
    contentsText: 'InnerUs Moments.txt — this file, newest Moment first',
    contentsAudio: 'audio/ — original recordings, exactly as kept in InnerUs',
    contentsTranscripts: 'transcripts/ — full transcripts you chose to keep',
    copyNote: 'This is an independent copy outside InnerUs. Changes or deletions in the app do not reach it.',
    topic: 'Conversation',
    question: 'Question',
    date: 'Date',
    source: 'Source',
    typed: 'Written note',
    'reviewed-ai': 'AI draft, reviewed by you',
    audio: 'Voice note',
    recording: 'Recording',
    transcript: 'Transcript',
    notOnDevice: 'not on this device (for example not downloaded from iCloud yet), so it is not included',
    notSelected: 'kept in InnerUs, not included in this export',
    noText: '(No written text.)',
    unknownTopic: 'A conversation',
    fileWord: 'Moments',
  },
  nl: {
    heading: 'InnerUs — je momenten',
    exported: 'Geëxporteerd',
    count: (n: number) => (n === 1 ? '1 moment' : `${n} momenten`),
    recordings: (n: number) => (n === 1 ? '1 opname' : `${n} opnames`),
    transcripts: (n: number) => (n === 1 ? '1 transcript' : `${n} transcripten`),
    contents: 'In deze export',
    contentsText: 'InnerUs Momenten.txt — dit bestand, nieuwste moment eerst',
    contentsAudio: 'audio/ — originele opnames, precies zoals bewaard in InnerUs',
    contentsTranscripts: 'transcripten/ — volledige teksten die je wilde bewaren',
    copyNote: 'Dit is een losse kopie buiten InnerUs. Wijzigingen of verwijderingen in de app hebben er geen invloed op.',
    topic: 'Gesprek',
    question: 'Vraag',
    date: 'Datum',
    source: 'Bron',
    typed: 'Geschreven notitie',
    'reviewed-ai': 'AI-voorstel, door jou nagekeken',
    audio: 'Spraaknotitie',
    recording: 'Opname',
    transcript: 'Transcript',
    notOnDevice: 'niet op dit apparaat (bijvoorbeeld nog niet gedownload uit iCloud), dus niet meegenomen',
    notSelected: 'bewaard in InnerUs, niet in deze export',
    noText: '(Geen geschreven tekst.)',
    unknownTopic: 'Een gesprek',
    fileWord: 'Momenten',
  },
} as const;

/** Folder names inside the archive (localized so a Dutch export reads naturally). */
export function exportFolders(language: Language) {
  return { audio: 'audio', transcripts: language === 'nl' ? 'transcripten' : 'transcripts' };
}

export function longDate(iso: string, language: Language) {
  return new Date(iso).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Local calendar day as YYYY-MM-DD (sorts well in any file browser). */
export function isoDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function clipLength(ms: number | null) {
  if (!ms) return '';
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "2026-10-22 Our first coffee" — the human-readable base name for a Moment's files. */
export function momentFileBase(moment: Moment, language: Language) {
  return `${isoDay(moment.createdAt)} ${sanitizeFileName(moment.title, language === 'nl' ? 'Moment' : 'Moment', 60)}`;
}

export function extensionOf(path: string, fallback: string) {
  const match = /\.([a-z0-9]{1,5})(?:\?.*)?$/i.exec(path);
  return match ? match[1].toLowerCase() : fallback;
}

/** An attachment as it will appear in an export: its archive path, or why it is not included. */
export type AttachmentRef = Pick<Attachment, 'kind' | 'relativePath' | 'durationMs'>;
export type PlannedFile =
  | { attachment: AttachmentRef; status: 'included'; path: string; file: File }
  | { attachment: AttachmentRef; status: 'missing' | 'not-selected' };

/** The attachment's file when it is really on this device (an iCloud-only copy is not). */
export function localFileFor(attachment: Partial<Pick<Attachment, 'localFile'>>, uri: string): File | null {
  if (attachment.localFile === false) return null;
  try {
    const file = new File(uri);
    return file.exists ? file : null;
  } catch {
    return null;
  }
}

/** Decides each attachment's archive path, checking which files are actually on this device. */
export function planAttachments(
  moments: readonly Moment[], attachments: readonly Attachment[], language: Language, options: ExportAllOptions, paths = new UniquePaths(),
): Map<string, PlannedFile[]> {
  const folders = exportFolders(language);
  const plan = new Map<string, PlannedFile[]>();
  const byMoment = new Map(moments.map(m => [m.id, m]));
  for (const attachment of attachments) {
    const moment = byMoment.get(attachment.momentId);
    if (!moment) continue;
    const list = plan.get(moment.id) ?? [];
    plan.set(moment.id, list);
    const wanted = attachment.kind === 'audio' ? options.includeRecordings !== false : options.includeTranscripts !== false;
    if (!wanted) { list.push({ attachment, status: 'not-selected' }); continue; }
    const file = options.attachmentUri ? localFileFor(attachment, options.attachmentUri(attachment)) : null;
    if (!file) { list.push({ attachment, status: 'missing' }); continue; }
    const base = momentFileBase(moment, language);
    const path = attachment.kind === 'audio'
      ? paths.take(folders.audio, base, extensionOf(attachment.relativePath, 'm4a'))
      : paths.take(folders.transcripts, base, 'txt');
    list.push({ attachment, status: 'included', path, file });
  }
  return plan;
}

/** Lines describing a Moment's files, for the readable text. */
export function attachmentLines(files: readonly PlannedFile[], language: Language): string[] {
  const l = exportLabels[language];
  return files.map(entry => {
    const label = entry.attachment.kind === 'audio' ? l.recording : l.transcript;
    if (entry.status === 'included') {
      const length = entry.attachment.kind === 'audio' ? clipLength(entry.attachment.durationMs) : '';
      return `${label}: ${entry.path}${length ? ` (${length})` : ''}`;
    }
    return `${label}: ${entry.status === 'missing' ? l.notOnDevice : l.notSelected}`;
  });
}

/** One Moment as readable text: title, labels, file references, the words. */
export function momentBlock(moment: Moment, files: readonly PlannedFile[], language: Language) {
  const l = exportLabels[language];
  const topic = getTopic(moment.topicId);
  const lines = [
    moment.title,
    '',
    `${l.topic}: ${topic ? topic.title[language] : l.unknownTopic}`,
    moment.questionSnapshot ? `${l.question}: ${moment.questionSnapshot}` : null,
    `${l.date}: ${longDate(moment.createdAt, language)}`,
    `${l.source}: ${l[moment.source]}`,
    ...attachmentLines(files, language),
    '',
    moment.body.trim() || l.noText,
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}

/** The complete readable collection (also usable on its own). */
export function buildExportText(
  moments: readonly Moment[], attachments: readonly Attachment[], language: Language, plan?: Map<string, PlannedFile[]>,
): string {
  const l = exportLabels[language];
  const files = plan ?? planAttachments(moments, attachments, language, {});
  const sorted = [...moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const included = [...files.values()].flat().filter(f => f.status === 'included');
  const audioCount = included.filter(f => f.attachment.kind === 'audio').length;
  const transcriptCount = included.length - audioCount;

  const summary = [l.count(sorted.length), audioCount ? l.recordings(audioCount) : null, transcriptCount ? l.transcripts(transcriptCount) : null]
    .filter(Boolean).join(' · ');
  const contents = [
    `${l.contents}:`,
    `- ${l.contentsText}`,
    audioCount ? `- ${l.contentsAudio}` : null,
    transcriptCount ? `- ${l.contentsTranscripts}` : null,
  ].filter(Boolean).join('\n');
  const header = `${l.heading}\n${l.exported}: ${longDate(new Date().toISOString(), language)} · ${summary}\n\n${contents}\n\n${l.copyNote}`;
  const sections = sorted.map(moment => momentBlock(moment, files.get(moment.id) ?? [], language));
  return [header, ...sections].join('\n\n————————————\n\n') + '\n';
}

/** A short line for the confirmation sheet: what the archive will contain. */
export function describeExportAll(moments: readonly Moment[], attachments: readonly Attachment[], language: Language, options: ExportAllOptions = {}) {
  const l = exportLabels[language];
  const plan = planAttachments(moments, attachments, language, options);
  const all = [...plan.values()].flat();
  const audio = all.filter(f => f.status === 'included' && f.attachment.kind === 'audio').length;
  const transcripts = all.filter(f => f.status === 'included' && f.attachment.kind === 'transcript').length;
  const missing = all.filter(f => f.status === 'missing').length;
  const parts = [l.count(moments.length), audio ? l.recordings(audio) : null, transcripts ? l.transcripts(transcripts) : null].filter(Boolean).join(', ');
  const base = language === 'nl'
    ? `Eén .zip-bestand met een leesbaar tekstbestand (${parts}), nieuwste eerst, met gesprek, vraag, datum en bron.`
    : `One .zip file with a readable text file (${parts}), newest first, with conversation, question, date and source.`;
  if (!missing) return base;
  return language === 'nl'
    ? `${base} ${missing === 1 ? '1 bijlage staat' : `${missing} bijlagen staan`} niet op dit apparaat en ${missing === 1 ? 'wordt' : 'worden'} alleen vermeld.`
    : `${base} ${missing === 1 ? '1 attachment is' : `${missing} attachments are`} not on this device and will only be listed.`;
}

// ---------------------------------------------------------------------------------------------
// Temporary files
// ---------------------------------------------------------------------------------------------
export function exportFolder() {
  return new Directory(Paths.cache, 'innerus-export');
}

/** Removes leftovers from earlier exports (e.g. when the app closed during sharing). */
export function clearExportFolder() {
  try {
    const folder = exportFolder();
    if (folder.exists) folder.delete();
  } catch { /* best effort; the system clears the cache */ }
}

/** Free space check with a 20 MB margin. Unknown free space never blocks the export. */
export function hasRoomFor(bytes: number) {
  try {
    const free = Paths.availableDiskSpace;
    return !(typeof free === 'number' && free > 0 && free < bytes + 20_000_000);
  } catch {
    return true;
  }
}

export type ZipEntry = { path: string; text: string } | { path: string; file: File; modified?: Date };

/** Writes entries into a new archive in the export folder, chunk by chunk. */
export async function writeZipFile(fileName: string, entries: readonly ZipEntry[]): Promise<File> {
  const folder = exportFolder();
  folder.create({ intermediates: true, idempotent: true });
  const target = new File(folder, fileName);
  if (target.exists) target.delete();
  target.create();
  const out = target.open(FileMode.ReadWrite);
  try {
    const zip = new ZipWriter(handleSink(out));
    for (const entry of entries) {
      if ('text' in entry) {
        await zip.addText(entry.path, entry.text);
        continue;
      }
      const input = entry.file.open(FileMode.ReadOnly);
      try {
        await zip.addStream(entry.path, handleSource(input), entry.modified ?? modifiedDate(entry.file));
      } finally {
        input.close();
      }
    }
    await zip.finish();
  } finally {
    out.close();
  }
  return target;
}

function modifiedDate(file: File) {
  try {
    const ms = file.modificationTime;
    return typeof ms === 'number' && ms > 0 ? new Date(ms) : new Date();
  } catch {
    return new Date();
  }
}

function fileSize(file: File) {
  try { return file.size ?? 0; } catch { return 0; }
}

/**
 * Builds the archive, opens the share sheet, and deletes the temporary archive afterwards.
 * The caller explains first that the destination receives a copy outside InnerUs (spec 37).
 * Signature stays compatible with `shareAllMoments(moments, attachments, language)`.
 */
export async function shareAllMoments(
  moments: readonly Moment[], attachments: readonly Attachment[], language: Language, options: ExportAllOptions = {},
): Promise<ExportResult> {
  if (moments.length === 0) return 'empty';
  clearExportFolder();
  let archive: File | null = null;
  try {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    const plan = planAttachments(moments, attachments, language, options);
    const text = buildExportText(moments, attachments, language, plan);
    const sorted = [...moments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const files = sorted.flatMap(m => plan.get(m.id) ?? []).flatMap(f => (f.status === 'included' ? [f] : []));

    const estimate = text.length * 3 + files.reduce((sum, f) => sum + fileSize(f.file) + 200, 0);
    if (!hasRoomFor(estimate)) return 'no-space';

    const l = exportLabels[language];
    const day = isoDay(new Date().toISOString());
    archive = await writeZipFile(`InnerUs ${l.fileWord} ${day}.zip`, [
      { path: `InnerUs ${l.fileWord}.txt`, text },
      ...files.map(f => ({ path: f.path, file: f.file })),
    ]);
    await Sharing.shareAsync(archive.uri, {
      mimeType: 'application/zip',
      UTI: 'public.zip-archive',
      dialogTitle: language === 'nl' ? 'Momenten exporteren' : 'Export Moments',
    });
    return 'shared';
  } catch (error) {
    return error instanceof ZipLimitError ? 'no-space' : 'failed';
  } finally {
    try { if (archive?.exists) archive.delete(); } catch { /* removed with the next export */ }
    clearExportFolder();
  }
}
