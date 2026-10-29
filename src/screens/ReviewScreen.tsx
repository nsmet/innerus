import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, TextInput, View } from 'react-native';
import { File } from 'expo-file-system';
import { getTopic } from '../content/catalogue';
import { SceneArt } from '../design/Art';
import { Icon } from '../design/Icon';
import {
  Button, Divider, Eyebrow, IconButton, ListGroup, ListRow, NoteField, Screen, Sheet, SheetBadge, StatusLine, TextBlock, ToggleRow, WarmCard,
} from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, radius, spacing, typography } from '../design/tokens';
import { AudioPlayer } from '../features/AudioPlayer';
import { ChoiceSheet, type Choice } from '../features/ChoiceSheet';
import {
  draftBody, getLocalProcessing, installModel, summarize, transcribe, type LocalProcessing,
} from '../features/localProcessing';
import { resolveRecordingDraft, setReviewOpen } from '../features/recordingDrafts';
import type { StackProps } from '../navigation/types';
import { useAppStore, type Prefs } from '../state/AppStore';

/**
 * UI08 review of one recorded clip (spec 23–29, design Ai-proc / Ai-draft / Ai-unavail).
 *
 * start        → the clip, what this device can do, and the person's choice (nothing runs on its own,
 *                except a draft chain the person switched on in Settings once permission exists)
 * installing   → explicit language-model download (network for the model only, never the audio)
 * transcribing → on-device speech to text with progress and Cancel
 * transcript   → edit the words; then "Create a short memory on this device" or write it yourself
 * summarizing  → on-device draft memory from this transcript, its question and the topic title only
 * draft        → "Draft memory": Edit, Try again once, separate retention choices, Save or Discard
 * writing      → manual note (always available)
 * saved        → confirmation only after every selected item committed
 */
type Phase = 'checking' | 'start' | 'installing' | 'transcribing' | 'transcript' | 'summarizing' | 'draft' | 'writing' | 'saved';
type TranscriptProblem = 'no-speech' | 'failed' | 'denied' | null;
type SummaryProblem = 'failed' | 'timeout' | 'not-available' | null;
type Draft = { title: string; paragraph: string; quote: string | null; nextStep: string | null };

const LANGUAGE_NAMES: Record<Prefs['recordingLanguage'], { en: string; nl: string }> = {
  'en-US': { en: 'English', nl: 'Engels' },
  'nl-NL': { en: 'Dutch (Netherlands)', nl: 'Nederlands (Nederland)' },
  'nl-BE': { en: 'Dutch (Belgium)', nl: 'Nederlands (België)' },
};

function deleteQuietly(uri: string) {
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* best effort */ }
}

function ProgressBar({ fraction }: { fraction: number }) {
  const { palette } = useDesign();
  const percent = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }}
    style={{ height: 4, borderRadius: 2, backgroundColor: palette.divider, overflow: 'hidden' }}>
    <View style={{ width: `${Math.max(4, percent)}%`, height: 4, backgroundColor: palette.text }} />
  </View>;
}

function DraftLabel({ text }: { text: string }) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.warm, borderWidth: 1, borderColor: palette.divider, borderRadius: radius.control, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Icon name="document" color={palette.text} size={14} />
      <TextBlock variant="supporting" style={{ fontWeight: '600' }}>{text}</TextBlock>
    </View>
  </View>;
}

export function ReviewScreen({ route, navigation }: StackProps<'Review'>) {
  const { palette, t, language } = useDesign();
  const { prefs, setPref, saveMoment, attachAudio, attachTranscript, deleteMoment, privateDirectory } = useAppStore();
  const { uri, durationMs, source } = route.params;
  const topic = getTopic(source.topicId, source.topicVersion);
  const prompt = topic?.prompts.find(p => p.id === source.promptId);
  const question = prompt ? prompt.text[language] : null;
  const topicTitle = topic?.title[language] ?? '';
  const ios = Platform.OS === 'ios';
  const device = ios ? { en: 'this iPhone', nl: 'deze iPhone' } : { en: 'this device', nl: 'dit apparaat' };
  const deviceCaps = ios ? { en: 'On this iPhone', nl: 'Op deze iPhone' } : { en: 'On this device', nl: 'Op dit apparaat' };

  const languageTag = prefs.recordingLanguage;
  const contentLanguage = languageTag.startsWith('nl') ? 'nl' as const : 'en' as const;
  const languageName = LANGUAGE_NAMES[languageTag];

  const [phase, setPhase] = useState<Phase>('checking');
  const [caps, setCaps] = useState<LocalProcessing | null>(null);
  const [progress, setProgress] = useState(0);
  const [transcriptProblem, setTranscriptProblem] = useState<TranscriptProblem>(null);
  const [summaryProblem, setSummaryProblem] = useState<SummaryProblem>(null);
  const [installProblem, setInstallProblem] = useState(false);
  const [languagePicker, setLanguagePicker] = useState(false);
  // Text being reviewed
  const [transcript, setTranscript] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [regenerated, setRegenerated] = useState(false);
  const [editDraft, setEditDraft] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // What to keep: summary on, raw audio and full transcript off by default (spec 27)
  const [keepSummary, setKeepSummary] = useState(true);
  const [keepTranscript, setKeepTranscript] = useState(false);
  const [keepAudio, setKeepAudio] = useState(false);
  // Saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaving = useRef(false);
  const job = useRef<AbortController | null>(null);
  const autoStarted = useRef(false);
  /** Steps already committed, so a retry after a partial failure never duplicates a Moment. */
  const committed = useRef<{ momentId: string | null; audio: boolean; transcript: boolean }>({ momentId: null, audio: false, transcript: false });

  // While this review is open, draft cleanup never touches the clip (spec 24).
  useEffect(() => {
    setReviewOpen(uri, true);
    return () => setReviewOpen(uri, false);
  }, [uri]);

  // Stop any running local job when the screen goes away.
  useEffect(() => () => job.current?.abort(), []);

  const check = useCallback(async () => {
    setPhase('checking');
    const result = await getLocalProcessing(languageTag);
    setCaps(result);
    setPhase(current => (current === 'checking' ? 'start' : current));
    return result;
  }, [languageTag]);

  useEffect(() => { void check(); }, [check]);

  // ---- Local processing ---------------------------------------------------------------------

  const newJob = () => {
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    return controller;
  };

  const runSummary = useCallback(async (text: string, isRegeneration: boolean) => {
    const source = text.trim();
    if (!source) return;
    const controller = newJob();
    setSummaryProblem(null);
    setPhase('summarizing');
    const result = await summarize({ transcript: source, question, topicTitle }, { languageTag, signal: controller.signal });
    if (controller.signal.aborted) return;
    if (!result.ok) {
      setSummaryProblem(result.reason === 'cancelled' ? null : result.reason);
      setPhase(draft ? 'draft' : 'transcript');
      return;
    }
    setDraft({ title: result.title, paragraph: result.paragraph, quote: result.quote, nextStep: result.nextStep });
    setDraftSource(source);
    setEditDraft(false);
    if (isRegeneration) setRegenerated(true);
    else { setKeepSummary(true); setKeepTranscript(false); setKeepAudio(false); }
    setPhase('draft');
  }, [question, topicTitle, languageTag, draft]);

  const runTranscription = useCallback(async (autoDraft: boolean) => {
    if (!prefs.localAIExplained) void setPref('localAIExplained', true);
    const controller = newJob();
    setTranscriptProblem(null);
    setSummaryProblem(null);
    setProgress(0);
    setPhase('transcribing');
    const heard = await transcribe(uri, { languageTag, onProgress: setProgress, signal: controller.signal });
    if (controller.signal.aborted) return;
    if (!heard.ok) {
      if (heard.reason === 'cancelled') { setPhase('start'); return; }
      if (heard.reason === 'not-available') { await check(); setPhase('start'); return; }
      setTranscriptProblem(heard.reason);
      setPhase('start');
      return;
    }
    setTranscript(heard.text);
    setPhase('transcript');
    if (autoDraft) void runSummary(heard.text, false);
  }, [uri, languageTag, prefs.localAIExplained, setPref, check, runSummary]);

  // Draft memory after recording (Settings): runs only when both steps are ready here and speech
  // permission was already given, so no system prompt ever appears without a tap. Saving still needs review.
  useEffect(() => {
    if (autoStarted.current || phase !== 'start' || !caps) return;
    autoStarted.current = true;
    if (prefs.autoDraftMemory && prefs.localAIExplained && caps.canTranscribe && caps.canSummarize && caps.authorization === 'authorized') {
      void runTranscription(true);
    }
  }, [phase, caps, prefs.autoDraftMemory, prefs.localAIExplained, runTranscription]);

  const startInstall = async () => {
    const controller = newJob();
    setInstallProblem(false);
    setProgress(0);
    setPhase('installing');
    const outcome = await installModel(languageTag, { onProgress: setProgress, signal: controller.signal });
    if (controller.signal.aborted && outcome !== 'installed') { setPhase('start'); return; }
    if (outcome !== 'installed' && outcome !== 'cancelled') setInstallProblem(true);
    await check();
    setPhase('start');
  };

  const cancelJob = (next: Phase) => {
    job.current?.abort();
    job.current = null;
    setPhase(next);
  };

  // ---- Leaving ------------------------------------------------------------------------------

  // Leaving with an unresolved clip always asks first (close button, Android back, gestures).
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (leaving.current || savedId) return;
    event.preventDefault();
    setConfirmLeave(true);
  }), [navigation, savedId]);

  const leave = () => { leaving.current = true; job.current?.abort(); navigation.goBack(); };

  /** Keep draft: leave the clip on this device as a recording draft (expires 24 h after capture stopped). */
  const keepAsDraft = () => { setConfirmLeave(false); leave(); };

  const discard = () => {
    job.current?.abort();
    deleteQuietly(uri);
    resolveRecordingDraft(privateDirectory, uri);
    setConfirmLeave(false);
    leave();
  };

  // ---- Saving -------------------------------------------------------------------------------

  const base = () => ({
    topicId: source.topicId,
    topicVersion: topic?.version ?? '1',
    promptId: source.promptId,
    questionSnapshot: question,
    contentLanguage,
    participantLabel: null,
  });

  /**
   * Saves the Moment, then the clip and the transcript when selected. "Saved" appears only after every
   * selected item committed. Unselected temporary audio is removed afterwards (spec 24).
   */
  const commit = async (input: { title: string; body: string; source: 'typed' | 'reviewed-ai' | 'audio' }, withAudio: boolean, transcriptText: string | null) => {
    setSaving(true);
    setSaveError(false);
    const done = committed.current;
    try {
      if (!done.momentId) done.momentId = (await saveMoment({ ...base(), ...input })).id;
      if (withAudio && !done.audio) { await attachAudio(done.momentId, uri, durationMs); done.audio = true; }
      if (transcriptText && !done.transcript) { await attachTranscript(done.momentId, transcriptText); done.transcript = true; }
      if (!withAudio) deleteQuietly(uri);
      resolveRecordingDraft(privateDirectory, uri);
      setSavedId(done.momentId);
      setPhase('saved');
    } catch {
      // A voice-only Moment without its audio would be empty: roll it back so nothing half-saved remains.
      if (done.momentId && input.source === 'audio' && !done.audio) {
        try { await deleteMoment(done.momentId); done.momentId = null; } catch { /* stays visible to the person */ }
      }
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const voiceTitle = [t({ en: 'Voice note', nl: 'Spraaknotitie' }), topicTitle].filter(Boolean).join(' · ');
  const nextStepLabel = t({ en: 'Agreed next step', nl: 'Afgesproken volgende stap' });

  const keepOriginalAudio = () => void commit({ title: voiceTitle, body: '', source: 'audio' }, true, null);

  const saveWritten = () => {
    const text = body.trim();
    const name = title.trim() || topicTitle || t({ en: 'A moment', nl: 'Een moment' });
    const fullTranscript = keepTranscript && transcript.trim() ? transcript.trim() : null;
    if (!text && !fullTranscript) { void commit({ title: name, body: '', source: 'audio' }, true, null); return; }
    // With no note written, a kept transcript becomes the note itself rather than a duplicate attachment.
    if (!text && fullTranscript) { void commit({ title: name, body: fullTranscript, source: 'typed' }, keepAudio, null); return; }
    void commit({ title: name, body: text, source: 'typed' }, keepAudio, fullTranscript);
  };

  const saveDraft = () => {
    if (!draft) return;
    const name = draft.title.trim() || topicTitle || t({ en: 'A moment', nl: 'Een moment' });
    const fullTranscript = keepTranscript && transcript.trim() ? transcript.trim() : null;
    if (keepSummary) {
      void commit({ title: name, body: draftBody(draft, { nextStep: nextStepLabel }), source: 'reviewed-ai' }, keepAudio, fullTranscript);
    } else if (fullTranscript) {
      void commit({ title: topicTitle || name, body: fullTranscript, source: 'typed' }, keepAudio, null);
    } else if (keepAudio) {
      void commit({ title: voiceTitle, body: '', source: 'audio' }, true, null);
    }
  };

  const openWriting = (prefill: string) => {
    job.current?.abort();
    setTitle(current => current || topicTitle);
    setBody(prefill);
    setSaveError(false);
    setPhase('writing');
  };

  // ---- Shared pieces --------------------------------------------------------------------------

  const onOff = { onLabel: t({ en: 'On', nl: 'Aan' }), offLabel: t({ en: 'Off', nl: 'Uit' }) };

  const closeButton = <View style={{ marginTop: spacing.sm, marginLeft: -10, alignSelf: 'flex-start' }}>
    <IconButton name="close" label={t({ en: 'Close', nl: 'Sluiten' })} onPress={() => (phase === 'saved' ? leave() : setConfirmLeave(true))} />
  </View>;

  const errorLine = saveError
    ? <StatusLine icon="warning" tone="destructive" text={t({ en: 'This could not be saved yet. Your draft is still here.', nl: 'Dit kon nog niet worden bewaard. Je concept staat er nog.' })} />
    : null;

  const inputStyle = [typography.heading, { color: palette.text, borderWidth: 1, borderColor: palette.outline, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: 10, minHeight: geometry.button }];
  const privateInput = { autoCorrect: false, spellCheck: false, autoComplete: 'off' as const, importantForAutofill: 'no' as const, placeholderTextColor: palette.secondary };

  const player = <View style={{ backgroundColor: palette.warm, borderRadius: radius.group, padding: spacing.group }}>
    <AudioPlayer uri={uri} durationMs={durationMs} title={t({ en: 'Your recording', nl: 'Je opname' })} />
  </View>;

  const explanation = <WarmCard style={{ gap: spacing.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon name="device" color={palette.text} size={18} />
      <TextBlock variant="label" style={{ fontWeight: '600', flex: 1 }}>{t({ en: `How this works on ${device.en}`, nl: `Zo werkt dit op ${device.nl}` })}</TextBlock>
    </View>
    <TextBlock variant="meta">{t({
      en: `Your recording is turned into text on ${device.en}. When ${device.en} supports it, it can then suggest a short memory from that text, its question and the conversation title. Nothing is sent anywhere, and nothing is saved until you have checked it.`,
      nl: `Je opname wordt op ${device.nl} omgezet naar tekst. Als ${device.nl} het ondersteunt, kan daaruit een korte herinnering worden voorgesteld, op basis van die tekst, de vraag en de titel van het gesprek. Er wordt niets verstuurd, en niets wordt bewaard voor je het hebt nagekeken.`,
    })}</TextBlock>
  </WarmCard>;

  const languageChoices: Choice<Prefs['recordingLanguage']>[] = (Object.keys(LANGUAGE_NAMES) as Prefs['recordingLanguage'][])
    .map(value => ({ value, label: t(LANGUAGE_NAMES[value]) }));

  /** Honest title and detail for a device that cannot turn this clip into text right now (spec 28). */
  const unavailableCopy = (): { title: string; detail: string } => {
    const fallback = t({ en: 'You can still keep a note or recording.', nl: 'Je kunt wel een notitie of opname bewaren.' });
    const summaryTitle = t({ en: `A local summary is not available on ${device.en} right now.`, nl: `Een lokale samenvatting is nu niet beschikbaar op ${device.nl}.` });
    if (caps?.authorization === 'denied' || caps?.authorization === 'restricted') {
      return {
        title: t({ en: 'Speech recognition is off for InnerUs.', nl: 'Spraakherkenning staat uit voor InnerUs.' }),
        detail: t({ en: 'You can allow it in Settings, or keep a note or recording.', nl: 'Je kunt ze toestaan in Instellingen, of een notitie of opname bewaren.' }),
      };
    }
    switch (caps?.transcriptionDetail) {
      case 'needs-download':
        return {
          title: t({ en: `${languageName.en} speech needs language support on ${device.en}.`, nl: `Voor spraak in het ${languageName.nl} is taalondersteuning nodig op ${device.nl}.` }),
          detail: caps.canDownloadModel
            ? t({ en: 'Download it once to turn recordings into text here. You can still keep a note or recording.', nl: 'Download ze één keer om opnames hier naar tekst om te zetten. Je kunt wel een notitie of opname bewaren.' })
            : fallback,
        };
      case 'downloading':
        return {
          title: t({ en: `Language support is still downloading on ${device.en}.`, nl: `Taalondersteuning wordt nog gedownload op ${device.nl}.` }),
          detail: t({ en: 'Keep this recording or write a note now, or come back to it later.', nl: 'Bewaar deze opname of schrijf nu een notitie, of kom er later op terug.' }),
        };
      case 'unsupported-language':
        return {
          title: t({ en: `Turning ${languageName.en} speech into text is not available on ${device.en}.`, nl: `Spraak in het ${languageName.nl} omzetten naar tekst is niet beschikbaar op ${device.nl}.` }),
          detail: t({ en: 'Choose another recording language, or keep a note or recording.', nl: 'Kies een andere opnametaal, of bewaar een notitie of opname.' }),
        };
      default:
        return { title: summaryTitle, detail: fallback };
    }
  };

  const summaryLimit = (): string | null => {
    if (!caps || caps.canSummarize) return null;
    switch (caps.summaryDetail) {
      case 'disabled-by-user': return t({ en: 'Apple Intelligence is turned off in Settings.', nl: 'Apple Intelligence staat uit in Instellingen.' });
      case 'not-ready': return t({ en: `The on-device model is still being prepared by ${device.en}. Try again later.`, nl: `Het model wordt nog voorbereid op ${device.nl}. Probeer het later opnieuw.` });
      case 'unsupported-language': return t({ en: `A short memory in ${languageName.en} is not available on ${device.en}.`, nl: `Een korte herinnering in het ${languageName.nl} is niet beschikbaar op ${device.nl}.` });
      default: return null;
    }
  };

  const summaryProblemText = summaryProblem === 'timeout'
    ? t({ en: 'This took too long on this device. Try again or write it yourself.', nl: 'Dit duurde te lang op dit apparaat. Probeer het opnieuw of schrijf het zelf.' })
    : summaryProblem
      ? t({ en: 'The short memory could not be made this time. Try again or write it yourself.', nl: 'De korte herinnering kon deze keer niet worden gemaakt. Probeer het opnieuw of schrijf het zelf.' })
      : null;

  // ---- Phases ---------------------------------------------------------------------------------

  let content: React.ReactNode;
  let footer: React.ReactNode = null;

  if (phase === 'checking') {
    content = <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.group }}>
      <ActivityIndicator color={palette.text} />
      <TextBlock variant="body" secondary center accessibilityLiveRegion="polite">{t({
        en: `Checking what ${device.en} can do…`, nl: `Even nakijken wat ${device.nl} kan…`,
      })}</TextBlock>
    </View>;
  } else if (phase === 'start' && caps?.canTranscribe) {
    content = <>
      {topicTitle ? <Eyebrow>{topicTitle}</Eyebrow> : null}
      <TextBlock variant="title">{t({ en: 'Your recording', nl: 'Je opname' })}</TextBlock>
      {question ? <TextBlock variant="voice" secondary>{question}</TextBlock> : null}
      {player}
      {!prefs.localAIExplained ? explanation : null}
      {transcriptProblem === 'no-speech' ? <StatusLine icon="warning" tone="text" text={t({
        en: 'No useful speech was recognized. Replay, retry or write a note.',
        nl: 'Er is geen bruikbare spraak herkend. Luister opnieuw, probeer nog eens of schrijf een notitie.',
      })} /> : null}
      {transcriptProblem === 'failed' ? <StatusLine icon="warning" tone="text" text={t({
        en: `The text could not be made on ${device.en}. Try again or write a note.`,
        nl: `De tekst kon niet worden gemaakt op ${device.nl}. Probeer het opnieuw of schrijf een notitie.`,
      })} /> : null}
      {transcriptProblem === 'denied' ? <StatusLine icon="warning" tone="text" text={t({
        en: 'Speech recognition is off for InnerUs. You can allow it in Settings, or write a note.',
        nl: 'Spraakherkenning staat uit voor InnerUs. Je kunt ze toestaan in Instellingen, of een notitie schrijven.',
      })} /> : null}
      <StatusLine icon="device" text={t({ en: `Your recording stays on ${device.en}`, nl: `Je opname blijft op ${device.nl}` })} />
      {errorLine}
    </>;
    footer = <>
      {transcriptProblem === 'denied'
        ? <Button icon="sliders" label={t({ en: 'Open Settings', nl: 'Open instellingen' })} onPress={() => void Linking.openSettings()} />
        : <Button icon={transcriptProblem ? 'refresh' : 'document'}
          label={transcriptProblem ? t({ en: 'Try again', nl: 'Opnieuw proberen' }) : t({ en: `Transcribe on ${device.en}`, nl: `Omzetten naar tekst op ${device.nl}` })}
          onPress={() => void runTranscription(prefs.autoDraftMemory && !!caps?.canSummarize)} disabled={saving} />}
      <Button variant="secondary" icon="pen" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting('')} disabled={saving} />
      <Button variant="quiet" label={t({ en: 'Keep the original audio', nl: 'Bewaar de originele audio' })} onPress={keepOriginalAudio} loading={saving} />
    </>;
  } else if (phase === 'start') {
    const copy = unavailableCopy();
    const denied = caps?.authorization === 'denied' || caps?.authorization === 'restricted';
    content = <>
      <View style={{ marginTop: spacing.lg }}><SceneArt family="notebook" height={200} /></View>
      <TextBlock variant="title">{copy.title}</TextBlock>
      <TextBlock variant="body" secondary>{copy.detail}</TextBlock>
      <StatusLine icon="device" text={t({ en: `Your recording stays on ${device.en}`, nl: `Je opname blijft op ${device.nl}` })} />
      {installProblem ? <StatusLine icon="warning" tone="text" text={t({
        en: 'The download did not finish. You can try again later.', nl: 'De download is niet afgerond. Je kunt het later opnieuw proberen.',
      })} /> : null}
      {errorLine}
    </>;
    footer = <>
      <Button icon="pen" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting('')} disabled={saving} />
      <Button variant="secondary" label={t({ en: 'Keep the original audio', nl: 'Bewaar de originele audio' })} onPress={keepOriginalAudio} loading={saving} />
      {denied ? <Button variant="quiet" icon="sliders" label={t({ en: 'Open Settings', nl: 'Open instellingen' })} onPress={() => void Linking.openSettings()} /> : null}
      {!denied && caps?.transcriptionDetail === 'needs-download' && caps.canDownloadModel
        ? <Button variant="quiet" icon="download" label={t({ en: 'Download language support', nl: 'Download taalondersteuning' })} onPress={() => void startInstall()} />
        : null}
      {!denied && caps?.transcriptionDetail === 'unsupported-language'
        ? <Button variant="quiet" icon="globe" label={t({ en: 'Choose another recording language', nl: 'Kies een andere opnametaal' })} onPress={() => setLanguagePicker(true)} />
        : null}
    </>;
  } else if (phase === 'installing') {
    content = <View style={{ flex: 1, justifyContent: 'center', gap: spacing.group }}>
      <Eyebrow>{t(deviceCaps)}</Eyebrow>
      <TextBlock variant="display">{t({ en: 'Downloading language support', nl: 'Taalondersteuning downloaden' })}</TextBlock>
      <TextBlock variant="voice" secondary>{t({ en: `${languageName.en}, for turning speech into text on ${device.en}.`, nl: `${languageName.nl}, om spraak om te zetten naar tekst op ${device.nl}.` })}</TextBlock>
      <ProgressBar fraction={progress} />
      <TextBlock variant="supporting" secondary>{t({
        en: 'Model setup can use the internet. Your recording never does.',
        nl: 'Het installeren van een model kan internet gebruiken. Je opname nooit.',
      })}</TextBlock>
    </View>;
    footer = <>
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => cancelJob('start')} />
      <Button variant="quiet" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting('')} />
    </>;
  } else if (phase === 'transcribing') {
    content = <View style={{ flex: 1, justifyContent: 'center', gap: spacing.group }}>
      <Eyebrow>{t(deviceCaps)}</Eyebrow>
      <TextBlock variant="display" accessibilityLiveRegion="polite">{t({ en: `Transcribing on ${device.en}`, nl: `Omzetten naar tekst op ${device.nl}` })}</TextBlock>
      <TextBlock variant="voice" secondary>{t({ en: 'Your audio stays here while it is turned into text.', nl: 'Je audio blijft hier terwijl die naar tekst wordt omgezet.' })}</TextBlock>
      <ProgressBar fraction={progress} />
      <TextBlock variant="supporting" secondary>{t({
        en: 'Model setup can use the internet. Your recording never does.',
        nl: 'Het installeren van een model kan internet gebruiken. Je opname nooit.',
      })}</TextBlock>
    </View>;
    footer = <>
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => cancelJob('start')} />
      <Button variant="quiet" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting('')} />
    </>;
  } else if (phase === 'transcript') {
    const limit = summaryLimit();
    content = <>
      <Eyebrow>{t(deviceCaps)}</Eyebrow>
      <TextBlock variant="title">{t({ en: 'Edit the transcript', nl: 'Bewerk de tekst' })}</TextBlock>
      <TextBlock variant="supporting" secondary>{t({
        en: 'Correct any words before you go on. Nothing is saved yet.',
        nl: 'Verbeter waar nodig woorden voordat je verdergaat. Er is nog niets bewaard.',
      })}</TextBlock>
      {player}
      <NoteField value={transcript} onChangeText={setTranscript} label={t({ en: 'Transcript', nl: 'Tekst' })} placeholder="" minHeight={180} />
      {caps?.canSummarize ? <ListGroup>
        <ToggleRow title={t({ en: 'Draft memory after recording', nl: 'Herinnering voorstellen na een opname' })}
          detail={t({ en: 'Next time, start right after recording. You still review before saving.', nl: 'Voortaan meteen na de opname beginnen. Je kijkt alles nog na voor het bewaren.' })}
          value={prefs.autoDraftMemory} onChange={value => void setPref('autoDraftMemory', value)} {...onOff} />
      </ListGroup> : <View style={{ gap: spacing.xs }}>
        <StatusLine icon="device" text={t({
          en: `A local summary is not available on ${device.en} right now. You can still keep a note or recording.`,
          nl: `Een lokale samenvatting is nu niet beschikbaar op ${device.nl}. Je kunt wel een notitie of opname bewaren.`,
        })} />
        {limit ? <TextBlock variant="supporting" secondary>{limit}</TextBlock> : null}
      </View>}
      {summaryProblemText ? <StatusLine icon="warning" tone="text" text={summaryProblemText} /> : null}
    </>;
    footer = caps?.canSummarize ? <>
      <Button icon={summaryProblem ? 'refresh' : undefined}
        label={summaryProblem ? t({ en: 'Try again', nl: 'Opnieuw proberen' }) : t({ en: 'Create a short memory on this device', nl: 'Maak een korte herinnering op dit apparaat' })}
        onPress={() => void runSummary(transcript, false)} disabled={!transcript.trim()}
        reason={t({ en: 'The transcript is empty.', nl: 'De tekst is leeg.' })} />
      <Button variant="quiet" icon="pen" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting(transcript.trim())} />
    </> : <>
      <Button icon="pen" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting(transcript.trim())} />
      <Button variant="quiet" label={t({ en: 'Keep the original audio', nl: 'Bewaar de originele audio' })} onPress={keepOriginalAudio} loading={saving} />
    </>;
  } else if (phase === 'summarizing') {
    content = <View style={{ flex: 1, justifyContent: 'center', gap: spacing.group }}>
      <Eyebrow>{t(deviceCaps)}</Eyebrow>
      <TextBlock variant="display" accessibilityLiveRegion="polite">{t({ en: 'Creating a short memory', nl: 'Een korte herinnering maken' })}</TextBlock>
      <TextBlock variant="voice" secondary>{t({
        en: 'Only this recording’s text, its question and the conversation title are used.',
        nl: 'Alleen de tekst van deze opname, de vraag en de titel van het gesprek worden gebruikt.',
      })}</TextBlock>
      <ActivityIndicator color={palette.text} style={{ alignSelf: 'flex-start' }} />
    </View>;
    footer = <>
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => cancelJob(draft ? 'draft' : 'transcript')} />
      <Button variant="quiet" label={t({ en: 'Write it myself', nl: 'Zelf schrijven' })} onPress={() => openWriting(transcript.trim())} />
    </>;
  } else if (phase === 'draft' && draft) {
    const transcriptChanged = transcript.trim() !== draftSource;
    const update = (change: Partial<Draft>) => setDraft(current => (current ? { ...current, ...change } : current));
    content = <>
      <DraftLabel text={t({ en: 'Draft memory', nl: 'Voorstel voor een herinnering' })} />
      {editDraft ? <>
        <TextInput value={draft.title} onChangeText={value => update({ title: value })} accessibilityLabel={t({ en: 'Title', nl: 'Titel' })}
          placeholder={t({ en: 'Title', nl: 'Titel' })} {...privateInput} style={inputStyle} />
        <NoteField value={draft.paragraph} onChangeText={value => update({ paragraph: value })} label={t({ en: 'Draft memory', nl: 'Voorstel voor een herinnering' })} placeholder="" minHeight={160} />
        {draft.nextStep !== null ? <NoteField value={draft.nextStep} onChangeText={value => update({ nextStep: value })} label={nextStepLabel} placeholder={nextStepLabel} minHeight={60} /> : null}
      </> : <>
        <TextBlock variant="title">{draft.title}</TextBlock>
        <TextBlock variant="rowTitle" style={{ fontSize: 17, lineHeight: 26 }}>{draft.paragraph}</TextBlock>
        {draft.nextStep ? <TextBlock variant="body">{`${nextStepLabel}: ${draft.nextStep}`}</TextBlock> : null}
      </>}
      {draft.quote ? <View style={{ gap: spacing.xs }}>
        <TextBlock variant="voice">{`“${draft.quote}”`}</TextBlock>
        <View style={{ alignSelf: 'flex-start' }}>
          <Button variant="quiet" underline label={t({ en: 'Remove the quote', nl: 'Verwijder het citaat' })} onPress={() => update({ quote: null })} />
        </View>
      </View> : null}
      {editDraft
        ? <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" icon="check" label={t({ en: 'Done', nl: 'Klaar' })} onPress={() => setEditDraft(false)} /></View>
        : <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" icon="pen" label={t({ en: 'Edit', nl: 'Bewerken' })} onPress={() => setEditDraft(true)} /></View>}
      <TextBlock variant="supporting" secondary>{t({ en: 'Check that this says what you meant before saving.', nl: 'Controleer voor het bewaren of dit weergeeft wat je bedoelde.' })}</TextBlock>
      <Divider />
      <ListRow title={t({ en: 'Edit the transcript', nl: 'Bewerk de tekst' })} detail={t({ en: 'The source of this draft', nl: 'De bron van dit voorstel' })}
        onPress={() => setShowTranscript(v => !v)} chevron />
      {showTranscript ? <NoteField value={transcript} onChangeText={setTranscript} label={t({ en: 'Transcript', nl: 'Tekst' })} placeholder="" minHeight={160} /> : null}
      {transcriptChanged ? <StatusLine icon="refresh" tone="text" text={t({
        en: 'You changed the transcript. The draft still follows the earlier text until you try again.',
        nl: 'Je hebt de tekst aangepast. Het voorstel volgt nog de vorige tekst tot je het opnieuw probeert.',
      })} /> : null}
      <ListGroup title={t({ en: 'What to keep', nl: 'Wat je wilt bewaren' })}>
        <ToggleRow title={t({ en: 'Short memory', nl: 'Korte herinnering' })} detail={t({ en: 'Title and paragraph', nl: 'Titel en alinea' })} value={keepSummary} onChange={setKeepSummary} {...onOff} />
        <ToggleRow title={t({ en: 'Keep the full transcript', nl: 'Bewaar de volledige tekst' })} value={keepTranscript} onChange={setKeepTranscript} {...onOff} />
        <ToggleRow title={t({ en: 'Keep the original audio', nl: 'Bewaar de originele audio' })} value={keepAudio} onChange={setKeepAudio} {...onOff} />
      </ListGroup>
      {keepSummary ? <StatusLine icon="check" text={t({ en: 'AI draft, reviewed by you', nl: 'AI-voorstel, door jou nagekeken' })} /> : null}
      {summaryProblemText ? <StatusLine icon="warning" tone="text" text={summaryProblemText} /> : null}
      {errorLine}
    </>;
    footer = <>
      <Button label={t({ en: 'Save selected items', nl: 'Bewaar de gekozen onderdelen' })} onPress={saveDraft} loading={saving}
        disabled={(!keepSummary && !keepTranscript && !keepAudio) || (keepSummary && !draft.paragraph.trim())}
        reason={t({ en: 'Choose at least one item to keep.', nl: 'Kies minstens één onderdeel om te bewaren.' })} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.lg }}>
        {!regenerated ? <Button variant="quiet" icon="refresh" label={t({ en: 'Try again', nl: 'Opnieuw proberen' })}
          onPress={() => void runSummary(transcript, true)} disabled={saving || !transcript.trim()} /> : null}
        <Button variant="quiet" icon="trash" label={t({ en: 'Discard', nl: 'Verwijderen' })} onPress={() => setConfirmLeave(true)} disabled={saving} />
      </View>
    </>;
  } else if (phase === 'writing' || phase === 'draft') {
    content = <>
      {topicTitle ? <Eyebrow>{topicTitle}</Eyebrow> : null}
      <TextBlock variant="title">{t({ en: 'In your own words', nl: 'In je eigen woorden' })}</TextBlock>
      {question ? <TextBlock variant="voice" secondary>{question}</TextBlock> : null}
      {player}
      <TextInput value={title} onChangeText={setTitle} accessibilityLabel={t({ en: 'Title', nl: 'Titel' })}
        placeholder={t({ en: 'Title', nl: 'Titel' })} {...privateInput} style={inputStyle} />
      <NoteField value={body} onChangeText={setBody} label={t({ en: 'Your note', nl: 'Je notitie' })} autoFocus={!body}
        placeholder={t({ en: 'A detail, a thought, a small idea...', nl: 'Een detail, een gedachte, een klein idee...' })} minHeight={160} />
      <ListGroup>
        <ToggleRow icon="mic" title={t({ en: 'Keep the original audio', nl: 'Bewaar de originele audio' })} value={keepAudio} onChange={setKeepAudio} {...onOff} />
        {transcript.trim() ? <ToggleRow icon="document" title={t({ en: 'Keep the full transcript', nl: 'Bewaar de volledige tekst' })} value={keepTranscript} onChange={setKeepTranscript} {...onOff} /> : null}
      </ListGroup>
      {errorLine}
    </>;
    footer = <>
      <Button label={t({ en: 'Save this moment', nl: 'Bewaar dit moment' })} onPress={saveWritten} loading={saving}
        disabled={!body.trim() && !keepAudio && !(keepTranscript && transcript.trim())}
        reason={t({ en: 'Write a few words, or keep the original audio.', nl: 'Schrijf een paar woorden, of bewaar de originele audio.' })} />
      <Button variant="quiet" icon="trash" label={t({ en: 'Discard', nl: 'Verwijderen' })} onPress={() => setConfirmLeave(true)} disabled={saving} />
    </>;
  } else {
    content = <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.group }}>
      <SheetBadge icon="check" />
      <TextBlock variant="title" center>{t({ en: 'A little piece of us.', nl: 'Een klein stukje van ons.' })}</TextBlock>
      <StatusLine icon="device" text={t({ en: `Saved on ${device.en}`, nl: `Bewaard op ${device.nl}` })} />
    </View>;
    footer = <>
      <Button label={source.sessionId ? t({ en: 'Back to the conversation', nl: 'Terug naar het gesprek' }) : t({ en: 'Done', nl: 'Klaar' })} onPress={leave} />
      {savedId && <Button variant="quiet" label={t({ en: 'Open this moment', nl: 'Open dit moment' })}
        onPress={() => { leaving.current = true; navigation.replace('MomentDetail', { momentId: savedId }); }} />}
    </>;
  }

  return <Screen header={closeButton} footer={footer} edges={['top', 'bottom']}>
    {content}
    <Sheet visible={confirmLeave} onClose={() => setConfirmLeave(false)}>
      <SheetBadge icon="mic" />
      <View style={{ gap: spacing.sm }}>
        <TextBlock variant="title">{t({ en: 'Keep this recording as a draft?', nl: 'Deze opname als concept bewaren?' })}</TextBlock>
        <TextBlock variant="meta" secondary>{t({
          en: 'Recording drafts expire after 24 hours and are removed at the next app cleanup. Save what you want to keep.',
          nl: 'Opnameconcepten vervallen na 24 uur en worden bij de volgende opruiming in de app verwijderd. Bewaar wat je wilt houden.',
        })}</TextBlock>
      </View>
      <View style={{ gap: spacing.md }}>
        <Button label={t({ en: 'Keep draft', nl: 'Bewaar concept' })} onPress={keepAsDraft} />
        <Button variant="secondary" label={t({ en: 'Discard draft', nl: 'Verwijder concept' })} onPress={discard} />
        <Button variant="quiet" underline label={t({ en: 'Stay here', nl: 'Blijf hier' })} onPress={() => setConfirmLeave(false)} />
      </View>
    </Sheet>
    <ChoiceSheet visible={languagePicker} title={t({ en: 'Recording language', nl: 'Opnametaal' })} options={languageChoices} selected={languageTag}
      onClose={() => setLanguagePicker(false)}
      onSelect={value => { setLanguagePicker(false); autoStarted.current = true; void setPref('recordingLanguage', value); }} />
  </Screen>;
}
