import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import {
  AudioModule, AudioQuality, IOSOutputFormat, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { Icon } from '../design/Icon';
import { Button, Sheet, SheetBadge, StatusLine, TextBlock } from '../design/primitives';
import { formatClip } from '../design/patterns';
import { useDesign } from '../design/ThemeProvider';
import { spacing, typography } from '../design/tokens';
import type { MomentSource } from '../navigation/types';
import { useAppStore } from '../state/AppStore';
import { registerRecordingDraft, resolveRecordingDraft } from './recordingDrafts';

/**
 * CONTRACT (owned by the Moments & capture builder):
 * Explicit voice recording sheet (Rec-ready → Rec-on → Rec-paused → stopped; Rec-denied).
 * Never starts capture on its own. Calls `onRecorded` with a protected temporary file once the
 * person stops; the opener then navigates to `Review`. `onWriteNote` = "Write a note" from the
 * microphone-denied state.
 */
export type RecorderSheetProps = {
  visible: boolean;
  onClose: () => void;
  source: MomentSource;
  onRecorded: (uri: string, durationMs: number) => void;
  onWriteNote?: () => void;
};

/** Voice clip: AAC mono at ~64 kbps (about 4.8 MB for ten minutes, spec 24). */
const VOICE_CLIP: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.HIGH },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

const LIMIT_MS = 10 * 60 * 1000;
const NOTICE_MS = 9.5 * 60 * 1000;
/** Do not start when less than this is free (ten minutes of audio plus headroom). */
const MIN_FREE_BYTES = 20 * 1024 * 1024;
const BAR_COUNT = 21;
const STATIC_BARS = [0.3, 0.45, 0.6, 0.4, 0.75, 0.5, 0.9, 0.55, 0.7, 1, 0.65, 0.8, 0.5, 0.95, 0.6, 0.45, 0.7, 0.4, 0.55, 0.35, 0.3];

type Phase = 'ready' | 'starting' | 'recording' | 'paused' | 'stopping' | 'limit' | 'denied' | 'noSpace' | 'failed' | 'confirmDiscard';

function deleteQuietly(uri: string | null | undefined) {
  if (!uri) return;
  try { const f = new File(uri); if (f.exists) f.delete(); } catch { /* best effort */ }
}

export function RecorderSheet({ visible, onClose, onRecorded, onWriteNote, source }: RecorderSheetProps) {
  const { palette, t, reduceMotion } = useDesign();
  const { privateDirectory } = useAppStore();
  const recorder = useAudioRecorder(VOICE_CLIP);
  const state = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<Phase>('ready');
  const [levels, setLevels] = useState<number[]>(() => STATIC_BARS.map(() => 0.15));
  const [limitClip, setLimitClip] = useState<{ uri: string; durationMs: number } | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const resumedAt = useRef(0);
  const lastDuration = useRef(0);
  const discardReturn = useRef<Phase>('paused');

  const device = Platform.OS === 'ios' ? { en: 'this iPhone', nl: 'deze iPhone' } : { en: 'this device', nl: 'dit apparaat' };

  const go = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);

  // A fresh sheet always opens on Rec-ready (never records on mount or on open).
  useEffect(() => {
    if (visible && (phaseRef.current === 'denied' || phaseRef.current === 'failed' || phaseRef.current === 'noSpace')) go('ready');
  }, [visible, go]);

  useEffect(() => { if (state.durationMillis > 0) lastDuration.current = state.durationMillis; }, [state.durationMillis]);

  // Level bars follow the input meter while recording (static when Reduce Motion is on).
  useEffect(() => {
    if (phase !== 'recording' || reduceMotion || state.metering === undefined) return;
    const db = Math.max(-60, Math.min(0, state.metering));
    const level = 0.12 + ((db + 60) / 60) * 0.88;
    setLevels(previous => [...previous.slice(1), level]);
  }, [state.metering, state.durationMillis, phase, reduceMotion]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    try { recorder.pause(); } catch { /* already paused by the system */ }
    go('paused');
  }, [recorder, go]);

  const finish = useCallback(async (reason: 'stop' | 'limit') => {
    const durationMs = Math.min(LIMIT_MS, Math.max(lastDuration.current, recorder.getStatus().durationMillis || 0));
    go('stopping');
    try {
      await recorder.stop();
      try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch { /* playback mode only */ }
      const recorded = recorder.uri;
      if (!recorded) { go('failed'); return; }
      // Capture stopped: the clip becomes a protected local draft that can be recovered (spec 24).
      const uri = registerRecordingDraft(privateDirectory, recorded, durationMs, source);
      if (reason === 'limit') {
        setLimitClip({ uri, durationMs });
        go('limit');
        return;
      }
      go('ready');
      onRecorded(uri, durationMs);
    } catch {
      go('failed');
    }
  }, [recorder, go, onRecorded, privateDirectory, source]);

  // Ten-minute limit: gentle notice at 9:30, keep the clip at 10:00.
  useEffect(() => {
    if (phase === 'recording' && state.durationMillis >= LIMIT_MS) void finish('limit');
  }, [phase, state.durationMillis, finish]);

  // A system interruption (call, Siri, another app) stops capture: show Paused, never resume on our own.
  useEffect(() => {
    if (phase === 'recording' && !state.isRecording && Date.now() - resumedAt.current > 1200) pause();
  }, [phase, state.isRecording, pause]);

  // Leaving the app pauses; coming back stays paused until the person taps Resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next !== 'active') pause(); });
    return () => sub.remove();
  }, [pause]);

  const start = async () => {
    go('starting');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { go('denied'); return; }
      try {
        if (Paths.availableDiskSpace < MIN_FREE_BYTES) { go('noSpace'); return; }
      } catch { /* unknown free space: try anyway */ }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      lastDuration.current = 0;
      setLevels(STATIC_BARS.map(() => 0.15));
      resumedAt.current = Date.now();
      recorder.record();
      go('recording');
    } catch {
      go('failed');
    }
  };

  const resume = () => {
    try {
      resumedAt.current = Date.now();
      recorder.record();
      go('recording');
    } catch {
      go('failed');
    }
  };

  const askDiscard = () => {
    if (phaseRef.current === 'recording') pause();
    discardReturn.current = phaseRef.current === 'limit' ? 'limit' : 'paused';
    go('confirmDiscard');
  };

  const discard = async () => {
    const clip = limitClip?.uri;
    try { if (recorder.isRecording || phaseRef.current === 'confirmDiscard') await recorder.stop(); } catch { /* not started */ }
    deleteQuietly(clip ?? recorder.uri);
    if (clip) resolveRecordingDraft(privateDirectory, clip);
    try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); } catch { /* ignore */ }
    setLimitClip(null);
    go('ready');
    onClose();
  };

  /** Closing while a clip exists asks first; otherwise it simply closes. */
  const requestClose = () => {
    const current = phaseRef.current;
    if (current === 'recording' || current === 'paused' || current === 'limit') { askDiscard(); return; }
    if (current === 'confirmDiscard') { go(discardReturn.current); return; }
    if (current === 'starting' || current === 'stopping') return;
    go('ready');
    onClose();
  };

  const timer = formatClip(state.durationMillis || lastDuration.current);
  const timerStyle = [typography.display, { fontSize: 52, lineHeight: 62, color: palette.text, fontVariant: ['tabular-nums' as const] }];

  const title = <TextBlock variant="title" center>{t({ en: 'Record an answer', nl: 'Neem een antwoord op' })}</TextBlock>;
  const limitLine = <View style={{ alignSelf: 'center' }}>
    <StatusLine icon="clock" text={t({ en: 'Up to 10 minutes per recording.', nl: 'Tot 10 minuten per opname.' })} />
  </View>;

  let body: React.ReactNode;
  if (phase === 'ready' || phase === 'starting') {
    body = <>
      <View style={{ alignItems: 'center' }}><SheetBadge icon="mic" /></View>
      {title}
      <View style={{ gap: spacing.sm }}>
        <TextBlock variant="body" center>{t({ en: 'Record only when everyone is comfortable.', nl: 'Neem alleen op als iedereen zich daar goed bij voelt.' })}</TextBlock>
        <TextBlock variant="meta" secondary center>{t({
          en: `Transcription and summaries run on ${device.en} when supported.`,
          nl: `Omzetten naar tekst en samenvatten gebeurt op ${device.nl}, wanneer dat wordt ondersteund.`,
        })}</TextBlock>
      </View>
      {limitLine}
      <Button label={t({ en: 'Start recording', nl: 'Start de opname' })} icon="mic" onPress={() => void start()} loading={phase === 'starting'} />
      <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={requestClose} />
    </>;
  } else if (phase === 'recording' || phase === 'stopping') {
    const nearLimit = state.durationMillis >= NOTICE_MS;
    const bars = reduceMotion || state.metering === undefined ? STATIC_BARS : levels;
    body = <>
      {title}
      <View accessible accessibilityLabel={t({ en: 'Recording', nl: 'Opname loopt' })} accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent }} />
        <TextBlock variant="label" style={{ fontWeight: '600' }}>{t({ en: 'Recording', nl: 'Opname loopt' })}</TextBlock>
      </View>
      <TextBlock accessibilityLabel={t({ en: `Elapsed ${timer}`, nl: `Verstreken ${timer}` })} style={[timerStyle, { textAlign: 'center' }]}>{timer}</TextBlock>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32 }}>
        {bars.slice(-BAR_COUNT).map((level, i) => <View key={i} style={{ width: 3, height: Math.max(4, level * 30), borderRadius: 2, backgroundColor: palette.text, opacity: 0.75 }} />)}
      </View>
      {nearLimit
        ? <View style={{ alignSelf: 'center' }}><StatusLine icon="clock" tone="text" text={t({ en: 'Almost at the 10-minute limit', nl: 'Bijna aan de limiet van 10 minuten' })} /></View>
        : limitLine}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Button variant="secondary" icon="pause" label={t({ en: 'Pause', nl: 'Pauzeren' })} onPress={pause} disabled={phase === 'stopping'} /></View>
        <View style={{ flex: 1 }}><Button icon="stop" label={t({ en: 'Stop recording', nl: 'Stop de opname' })} onPress={() => void finish('stop')} loading={phase === 'stopping'} /></View>
      </View>
    </>;
  } else if (phase === 'paused') {
    body = <>
      {title}
      <View accessible accessibilityLabel={t({ en: 'Paused', nl: 'Gepauzeerd' })} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <Icon name="pause" color={palette.text} size={14} />
        <TextBlock variant="label" style={{ fontWeight: '600' }}>{t({ en: 'Paused', nl: 'Gepauzeerd' })}</TextBlock>
      </View>
      <TextBlock style={[timerStyle, { textAlign: 'center' }]}>{timer}</TextBlock>
      <TextBlock variant="body" secondary center>{t({ en: 'Recording paused. Tap Resume when you are ready.', nl: 'Opname gepauzeerd. Tik op Hervatten als je klaar bent.' })}</TextBlock>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Button icon="play" label={t({ en: 'Resume recording', nl: 'Hervat de opname' })} onPress={resume} /></View>
        <View style={{ flex: 1 }}><Button variant="secondary" icon="stop" label={t({ en: 'Stop recording', nl: 'Stop de opname' })} onPress={() => void finish('stop')} /></View>
      </View>
      <Button variant="quiet" icon="trash" underline label={t({ en: 'Discard', nl: 'Verwijderen' })} onPress={askDiscard} />
    </>;
  } else if (phase === 'limit') {
    body = <>
      <View style={{ alignItems: 'center' }}><SheetBadge icon="clock" /></View>
      {title}
      <TextBlock style={[timerStyle, { textAlign: 'center' }]}>{formatClip(limitClip?.durationMs ?? LIMIT_MS)}</TextBlock>
      <TextBlock variant="body" center>{t({
        en: 'Your recording reached the limit. The captured audio is ready to review.',
        nl: 'Je opname heeft de limiet bereikt. Je kunt de opgenomen audio nu bekijken.',
      })}</TextBlock>
      <Button label={t({ en: 'Review the recording', nl: 'Bekijk de opname' })} trailingArrow onPress={() => {
        const clip = limitClip;
        setLimitClip(null);
        go('ready');
        if (clip) onRecorded(clip.uri, clip.durationMs);
      }} />
      <Button variant="quiet" icon="trash" underline label={t({ en: 'Discard', nl: 'Verwijderen' })} onPress={askDiscard} />
    </>;
  } else if (phase === 'confirmDiscard') {
    body = <>
      <View style={{ alignItems: 'center' }}><SheetBadge icon="trash" /></View>
      <TextBlock variant="title" center>{t({ en: 'Discard this recording?', nl: 'Deze opname verwijderen?' })}</TextBlock>
      <TextBlock variant="body" secondary center>{t({
        en: `The audio you recorded is removed from ${device.en}. Nothing else changes.`,
        nl: `De opgenomen audio wordt van ${device.nl} verwijderd. Verder verandert er niets.`,
      })}</TextBlock>
      <Button variant="destructiveFilled" icon="trash" label={t({ en: 'Discard recording', nl: 'Verwijder de opname' })} onPress={() => void discard()} />
      <Button variant="secondary" label={t({ en: 'Keep recording', nl: 'Behoud de opname' })} onPress={() => go(discardReturn.current)} />
    </>;
  } else if (phase === 'denied') {
    body = <>
      <View style={{ alignItems: 'center' }}><SheetBadge icon="warning" /></View>
      <TextBlock variant="title" center>{t({ en: 'Microphone access is off', nl: 'Microfoontoegang staat uit' })}</TextBlock>
      <TextBlock variant="body" secondary center>{t({ en: 'You can still write a note.', nl: 'Je kunt nog steeds een notitie schrijven.' })}</TextBlock>
      {onWriteNote && <Button icon="pen" label={t({ en: 'Write a note', nl: 'Schrijf een notitie' })} onPress={() => { go('ready'); onWriteNote(); }} />}
      <Button variant="secondary" label={t({ en: 'Open Settings', nl: 'Open instellingen' })} onPress={() => void Linking.openSettings()} />
      <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={requestClose} />
    </>;
  } else {
    const noSpace = phase === 'noSpace';
    body = <>
      <View style={{ alignItems: 'center' }}><SheetBadge icon="warning" /></View>
      <TextBlock variant="heading" center>{noSpace
        ? t({ en: 'There is not enough space to save this recording.', nl: 'Er is niet genoeg ruimte om deze opname te bewaren.' })
        : t({ en: 'The recording could not start or finish.', nl: 'De opname kon niet starten of afronden.' })}</TextBlock>
      <TextBlock variant="body" secondary center>{t({ en: 'You can still write a note.', nl: 'Je kunt nog steeds een notitie schrijven.' })}</TextBlock>
      {onWriteNote && <Button icon="pen" label={t({ en: 'Write a note', nl: 'Schrijf een notitie' })} onPress={() => { go('ready'); onWriteNote(); }} />}
      {!noSpace && <Button variant="secondary" icon="refresh" label={t({ en: 'Try again', nl: 'Opnieuw proberen' })} onPress={() => go('ready')} />}
      <Button variant="quiet" label={t({ en: 'Close', nl: 'Sluiten' })} onPress={requestClose} />
    </>;
  }

  return <Sheet visible={visible} onClose={requestClose}>
    <View style={{ gap: spacing.group, paddingBottom: spacing.sm }}>{body}</View>
  </Sheet>;
}
