import { Platform } from 'react-native';
import {
  installSpeechModel, localAIStatus, speechAuthorization, summarizeTranscript, transcribeFile,
  type InstallOutcome, type SpeechAuthorization, type SpeechState, type SummaryState,
} from '../../modules/innerus-platform/localAI';

/**
 * Honest local speech/summary layer (spec 25–29).
 *
 * iOS: the InnerUsLocalAI adapter (SpeechTranscriber / on-device SFSpeechRecognizer, and the
 * on-device SystemLanguageModel). Android: no proven local route yet (spec 26), so everything here
 * reports unavailable and the person keeps the clip or writes the note. Nothing ever calls a network
 * or cloud service, and nothing ever invents text.
 */
export type LocalState = 'ready' | 'needs-download' | 'downloading' | 'unsupported';

export type LocalProcessing = {
  transcription: LocalState;
  summary: LocalState;
  /** True only when the adapter can transcribe this language on this device right now. */
  canTranscribe: boolean;
  /** True only when the on-device language model can draft in this language right now. */
  canSummarize: boolean;
  /** The precise transcription state, for honest copy. */
  transcriptionDetail: SpeechState | 'android';
  /** The precise summary state, for honest copy. */
  summaryDetail: SummaryState | 'android';
  /** An on-device speech model for this language can be downloaded by explicit action. */
  canDownloadModel: boolean;
  /** Speech permission as it stands, without asking. */
  authorization: SpeechAuthorization;
};

const android: LocalProcessing = {
  transcription: 'unsupported', summary: 'unsupported', canTranscribe: false, canSummarize: false,
  transcriptionDetail: 'android', summaryDetail: 'android', canDownloadModel: false, authorization: 'unavailable',
};

function speechToLocal(state: SpeechState): LocalState {
  if (state === 'ready') return 'ready';
  if (state === 'needs-download') return 'needs-download';
  if (state === 'downloading') return 'downloading';
  return 'unsupported';
}

function summaryToLocal(state: SummaryState): LocalState {
  if (state === 'ready') return 'ready';
  // The system model is still being prepared by iOS (Apple Intelligence download).
  if (state === 'not-ready') return 'downloading';
  return 'unsupported';
}

/** Checks what this device can do for one recording language. Never throws, never asks permission. */
export async function getLocalProcessing(languageTag: string): Promise<LocalProcessing> {
  if (Platform.OS !== 'ios') return android;
  try {
    const status = await localAIStatus(languageTag);
    const transcription = speechToLocal(status.transcription.state);
    const summary = summaryToLocal(status.summary.state);
    return {
      transcription,
      summary,
      canTranscribe: transcription === 'ready' && status.authorization !== 'denied' && status.authorization !== 'restricted' && status.authorization !== 'unavailable',
      canSummarize: summary === 'ready',
      transcriptionDetail: status.transcription.state,
      summaryDetail: status.summary.state,
      canDownloadModel: status.transcription.canDownload,
      authorization: status.authorization,
    };
  } catch {
    return { ...android, transcriptionDetail: 'unavailable', summaryDetail: 'unavailable' };
  }
}

/** Current speech permission without prompting (the prompt only follows a tap on Transcribe). */
export function currentSpeechAuthorization(): SpeechAuthorization {
  return Platform.OS === 'ios' ? speechAuthorization() : 'unavailable';
}

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'not-available' | 'no-speech' | 'cancelled' | 'denied' | 'failed' };

export type SummaryResult =
  | { ok: true; title: string; paragraph: string; quote: string | null; nextStep: string | null }
  | { ok: false; reason: 'not-available' | 'cancelled' | 'timeout' | 'failed' };

export type ProcessingOptions = { languageTag: string; onProgress?: (fraction: number) => void; signal?: AbortSignal };

/**
 * Local transcription of one recorded clip. Asks for speech permission the first time, so call it
 * only from a deliberate tap (or when permission was already granted). Returns editable text.
 */
export async function transcribe(uri: string, options: ProcessingOptions): Promise<TranscribeResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not-available' };
  const result = await transcribeFile(uri, options.languageTag, { onProgress: options.onProgress, signal: options.signal });
  if (options.signal?.aborted) return { ok: false, reason: 'cancelled' };
  if (result.ok) {
    const text = result.text.trim();
    return text ? { ok: true, text } : { ok: false, reason: 'no-speech' };
  }
  return result;
}

/**
 * Local short memory from one transcript, its question and the topic title only (spec 27).
 * Draft only: the person reviews it before anything is saved.
 */
export async function summarize(input: { transcript: string; question: string | null; topicTitle: string }, options: ProcessingOptions): Promise<SummaryResult> {
  if (Platform.OS !== 'ios') return { ok: false, reason: 'not-available' };
  const transcript = input.transcript.trim();
  if (!transcript) return { ok: false, reason: 'not-available' };
  const result = await summarizeTranscript({ ...input, transcript, languageTag: options.languageTag }, { signal: options.signal });
  if (options.signal?.aborted) return { ok: false, reason: 'cancelled' };
  if (!result.ok) return result;
  const title = result.title.trim();
  const paragraph = result.paragraph.trim();
  if (!title || !paragraph) return { ok: false, reason: 'failed' };
  return { ok: true, title, paragraph, quote: result.quote?.trim() || null, nextStep: result.nextStep?.trim() || null };
}

/** Explicit, person-initiated download of the on-device speech model (iOS 26+). Audio is never involved. */
export async function installModel(languageTag: string, options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {}): Promise<InstallOutcome> {
  if (Platform.OS !== 'ios') return 'unsupported';
  return installSpeechModel(languageTag, options);
}

/** The text a kept draft memory saves as the Moment body (paragraph, then the exact quote / agreed step). */
export function draftBody(draft: { paragraph: string; quote: string | null; nextStep: string | null }, labels: { nextStep: string }): string {
  const parts = [draft.paragraph.trim()];
  if (draft.quote?.trim()) parts.push(`“${draft.quote.trim()}”`);
  if (draft.nextStep?.trim()) parts.push(`${labels.nextStep}: ${draft.nextStep.trim()}`);
  return parts.join('\n\n');
}
