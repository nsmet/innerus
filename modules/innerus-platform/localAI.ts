import { requireOptionalNativeModule, type EventSubscription } from 'expo';

/**
 * JS binding for the iOS on-device speech + draft memory adapter (native module "InnerUsLocalAI").
 * Null-safe: in Jest, Expo Go, web and on Android the module is absent and every call reports
 * an honest unavailable state. Nothing here touches the network.
 */
export type SpeechState = 'ready' | 'needs-download' | 'downloading' | 'unsupported-language' | 'unsupported-device' | 'unavailable';
export type SummaryState = 'ready' | 'unsupported-device' | 'unsupported-language' | 'disabled-by-user' | 'not-ready' | 'unavailable';
export type SpeechAuthorization = 'authorized' | 'denied' | 'restricted' | 'not-determined' | 'unavailable';

export type LocalAIStatus = {
  transcription: { state: SpeechState; route?: 'analyzer' | 'legacy'; canDownload: boolean; detail: string };
  summary: { state: SummaryState; detail: string };
  authorization: SpeechAuthorization;
};

export type NativeTranscript = { ok: true; text: string } | { ok: false; reason: 'not-available' | 'no-speech' | 'cancelled' | 'denied' | 'failed' };
export type NativeDraft =
  | { ok: true; title: string; paragraph: string; quote?: string; nextStep?: string }
  | { ok: false; reason: 'not-available' | 'cancelled' | 'timeout' | 'failed' };
export type InstallOutcome = 'installed' | 'unsupported' | 'cancelled' | 'failed';

type ProgressEvent = { jobId: string; kind: 'install' | 'transcribe'; fraction: number };

type LocalAIModule = {
  addListener(eventName: 'onProgress', listener: (event: ProgressEvent) => void): EventSubscription;
  speechAuthorization(): SpeechAuthorization;
  requestSpeechAuthorization(): Promise<SpeechAuthorization>;
  status(languageTag: string): Promise<LocalAIStatus>;
  installSpeechModel(jobId: string, languageTag: string): Promise<InstallOutcome>;
  transcribe(jobId: string, fileUri: string, languageTag: string): Promise<NativeTranscript>;
  summarize(jobId: string, transcript: string, question: string | null, topicTitle: string, languageTag: string): Promise<NativeDraft>;
  cancel(jobId: string): void;
};

const native = requireOptionalNativeModule<LocalAIModule>('InnerUsLocalAI');

export const isLocalAIAvailable = native != null;

const absent: LocalAIStatus = {
  transcription: { state: 'unavailable', canDownload: false, detail: 'native adapter not present' },
  summary: { state: 'unavailable', detail: 'native adapter not present' },
  authorization: 'unavailable',
};

let counter = 0;
function newJobId(kind: string) {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

export async function localAIStatus(languageTag: string): Promise<LocalAIStatus> {
  if (!native) return absent;
  try { return await native.status(languageTag); } catch { return absent; }
}

export function speechAuthorization(): SpeechAuthorization {
  if (!native) return 'unavailable';
  try { return native.speechAuthorization(); } catch { return 'unavailable'; }
}

type JobOptions = { onProgress?: (fraction: number) => void; signal?: AbortSignal };

/** Runs one native job with progress events and AbortSignal cancellation. */
async function runJob<T>(kind: string, options: JobOptions, start: (jobId: string) => Promise<T>, cancelled: T): Promise<T> {
  if (!native) return cancelled;
  if (options.signal?.aborted) return cancelled;
  const jobId = newJobId(kind);
  const module = native;
  let subscription: EventSubscription | null = null;
  if (options.onProgress) {
    const report = options.onProgress;
    subscription = module.addListener('onProgress', event => { if (event.jobId === jobId) report(event.fraction); });
  }
  const abort = () => { try { module.cancel(jobId); } catch { /* already finished */ } };
  options.signal?.addEventListener('abort', abort);
  try {
    return await start(jobId);
  } finally {
    options.signal?.removeEventListener('abort', abort);
    subscription?.remove();
  }
}

export function installSpeechModel(languageTag: string, options: JobOptions = {}): Promise<InstallOutcome> {
  if (!native) return Promise.resolve('unsupported');
  const module = native;
  return runJob('install', options, id => module.installSpeechModel(id, languageTag), 'cancelled' as InstallOutcome)
    .catch(() => 'failed' as const);
}

export function transcribeFile(fileUri: string, languageTag: string, options: JobOptions = {}): Promise<NativeTranscript> {
  if (!native) return Promise.resolve({ ok: false, reason: 'not-available' });
  const module = native;
  return runJob<NativeTranscript>('transcribe', options, id => module.transcribe(id, fileUri, languageTag), { ok: false, reason: 'cancelled' })
    .catch(() => ({ ok: false, reason: 'failed' }) as const);
}

export function summarizeTranscript(
  input: { transcript: string; question: string | null; topicTitle: string; languageTag: string },
  options: JobOptions = {},
): Promise<NativeDraft> {
  if (!native) return Promise.resolve({ ok: false, reason: 'not-available' });
  const module = native;
  return runJob<NativeDraft>('summary', options, id => module.summarize(id, input.transcript, input.question, input.topicTitle, input.languageTag), { ok: false, reason: 'cancelled' })
    .catch(() => ({ ok: false, reason: 'failed' }) as const);
}
