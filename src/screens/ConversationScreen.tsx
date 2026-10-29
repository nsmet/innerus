import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, LayoutAnimation, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTopic } from '../content/catalogue';
import { canOpenTopic, useAccess } from '../platform/access';
import { CLOSING_POSITION, type ActiveSession, type Draft } from '../data/repository';
import { StoryChapter } from '../design/StoryChapter';
import { Typewriter } from '../design/Typewriter';
import { EmptyState } from '../design/patterns';
import { Button, CloseHeader, Eyebrow, PromptPager, Screen, StatusLine, TextBlock, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { motion, spacing } from '../design/tokens';
import { DraftSheet } from '../features/DraftSheet';
import { keepDraftAsMoment, KeepMomentSheet, savedOnDeviceText } from '../features/KeepMomentSheet';
import { RecorderSheet } from '../features/RecorderSheet';
import type { StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

const LAST_PROMPT = CLOSING_POSITION - 1;
const SAVED_NOTICE_MS = 3500;
const SHEET_HANDOFF_MS = 350;

/** UI04 active conversation: five authored prompts, then the closing invitation (spec 15–18, 20). */
export function ConversationScreen({ navigation, route }: StackProps<'Conversation'>) {
  const { t, language, reduceMotion } = useDesign();
  const store = useAppStore();
  const { ready, activeSession, startSession, saveSession, finishSession, repository } = store;
  const { access } = useAccess();
  const { topicId } = route.params;
  const savedVersion = activeSession?.topicId === topicId ? activeSession.topicVersion : undefined;
  const topic = getTopic(topicId, savedVersion);
  // A conversation already under way when the free week ends may be finished (canOpenTopic).
  const accessible = topic ? canOpenTopic(topic, access, activeSession) : false;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const initialised = useRef(false);
  const finishing = useRef(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [keepVisible, setKeepVisible] = useState(false);
  const [recorderVisible, setRecorderVisible] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [draftFlow, setDraftFlow] = useState<{ mode: 'leave' | 'finish'; draft: Draft } | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const session: ActiveSession | null = activeSession && activeSession.sessionId === sessionId ? activeSession : null;
  const position = session?.position ?? 0;
  const closing = position >= CLOSING_POSITION;
  const prompt = topic && !closing ? topic.prompts[position] : undefined;

  // A locked topic never opens; the honest collection preview does.
  useEffect(() => {
    if (topic && !accessible) navigation.replace('Paywall', { topicId: topic.id });
  }, [topic, accessible, navigation]);

  // Use the saved session for this topic (resume or freshly started on the detail), otherwise start one.
  useEffect(() => {
    if (!ready || !topic || !accessible || initialised.current) return;
    initialised.current = true;
    if (activeSession?.topicId === topic.id) setSessionId(activeSession.sessionId);
    else void startSession(topic.id, topic.version).then(s => setSessionId(s.sessionId));
  }, [ready, topic, accessible, activeSession, startSession]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Prompt text changes immediately; the content block takes a short fade (none with Reduced Motion).
  useEffect(() => {
    if (reduceMotion) { fade.setValue(1); return; }
    fade.setValue(0.15);
    const animation = Animated.timing(fade, { toValue: 1, duration: motion.prompt, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [position, reduceMotion, fade]);

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  const goTo = (next: number) => {
    if (!session) return;
    setSavedNotice(false);
    void saveSession({ ...session, position: Math.max(0, Math.min(CLOSING_POSITION, next)), nudgeShown: false, updatedAt: new Date().toISOString() });
  };

  const toggleNudge = () => {
    if (!session) return;
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.create(motion.nudge, 'easeInEaseOut', 'opacity'));
    void saveSession({ ...session, nudgeShown: !session.nudgeShown, updatedAt: new Date().toISOString() });
  };

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main', { screen: 'Tonight' });
  }, [navigation]);

  const unsavedDraft = useCallback(async () => {
    if (!sessionId || !repository) return null;
    const draft = await repository.getDraft(sessionId).catch(() => null);
    return draft?.body.trim() ? draft : null;
  }, [sessionId, repository]);

  /** Close before Finish keeps the position (Tonight offers to continue); an unsaved note is resolved first. */
  const onClose = useCallback(async () => {
    const draft = await unsavedDraft();
    if (draft) setDraftFlow({ mode: 'leave', draft });
    else leave();
  }, [unsavedDraft, leave]);

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { void onClose(); return true; });
    return () => sub.remove();
  }, [onClose]));

  const completeFinish = async () => {
    if (!session || !topic) return;
    await finishSession(session.sessionId, topic.id);
    navigation.popTo('Main', { screen: 'Tonight' });
  };

  const onFinish = async () => {
    if (finishing.current || !session) return;
    finishing.current = true;
    setFinishBusy(true);
    try {
      const draft = await unsavedDraft();
      if (draft) { setDraftFlow({ mode: 'finish', draft }); return; }
      await completeFinish();
    } finally {
      finishing.current = false;
      setFinishBusy(false);
    }
  };

  const resolveDraft = async (keep: boolean) => {
    if (!draftFlow || draftBusy || !topic) return;
    setDraftBusy(true);
    try {
      if (draftFlow.mode === 'leave') {
        if (!keep) await repository?.discardDraft(draftFlow.draft.sessionId);
        setDraftFlow(null);
        leave();
        return;
      }
      if (keep) await keepDraftAsMoment(store, draftFlow.draft, topic.id, language);
      else await repository?.discardDraft(draftFlow.draft.sessionId);
      setDraftFlow(null);
      finishing.current = true;
      await completeFinish();
    } catch {
      // The sheet stays; nothing is reported as saved.
    } finally {
      finishing.current = false;
      setDraftBusy(false);
    }
  };

  if (!topic) {
    return <Screen header={<CloseHeader closeLabel={t({ en: 'Close', nl: 'Sluiten' })} onClose={leave} />}>
      <EmptyState title={t({ en: 'This conversation is not here', nl: 'Dit gesprek is hier niet te vinden' })}
        detail={t({ en: 'It may belong to a newer version of InnerUs. Your saved moments are not affected.', nl: 'Het hoort misschien bij een nieuwere versie van InnerUs. Je bewaarde momenten blijven staan.' })}
        action={{ label: t({ en: 'Explore', nl: 'Ontdekken' }), onPress: () => navigation.navigate('Main', { screen: 'Explore' }) }} />
    </Screen>;
  }

  const source = { topicId: topic.id, topicVersion: topic.version, promptId: prompt?.id ?? null, sessionId: sessionId ?? undefined };
  const questionText = prompt ? prompt.text[language] : topic.closing[language];
  const keepLabel = t({ en: 'Keep a moment', nl: 'Bewaar een moment' });

  const onSaved = (momentId: string) => {
    setKeepVisible(false);
    if (closing) {
      navigation.navigate('MomentSaved', { momentId, sessionId: sessionId ?? undefined });
      return;
    }
    setSavedNotice(true);
    later(() => setSavedNotice(false), SAVED_NOTICE_MS);
  };


  const notice = savedNotice
    ? <View style={{ alignItems: 'center' }}><StatusLine icon="device" text={savedOnDeviceText(t)} /></View>
    : null;

  const footer = !session ? null : closing
    ? <>
      <Button label={t({ en: 'Finish', nl: 'Afronden' })} loading={finishBusy} onPress={() => { void onFinish(); }} />
      <Button variant="secondary" icon="pen" label={keepLabel} onPress={() => setKeepVisible(true)} />
      <Button variant="quiet" icon="back" underline={false} label={t({ en: 'Previous', nl: 'Vorige' })} onPress={() => goTo(LAST_PROMPT)} />
    </>
    : <>
      {notice}
      <PromptPager position={position} total={LAST_PROMPT + 1}
        onPrevious={position > 0 ? () => goTo(position - 1) : undefined} onSkip={() => goTo(position + 1)}
        previousLabel={t({ en: 'Previous', nl: 'Vorige' })} skipLabel={t({ en: 'Skip', nl: 'Overslaan' })}
        skipAccessibilityLabel={t({ en: 'Skip this question', nl: 'Sla deze vraag over' })}
        progressLabel={t({ en: `Question ${position + 1} of ${LAST_PROMPT + 1}`, nl: `Vraag ${position + 1} van ${LAST_PROMPT + 1}` })} />
      <Button trailingArrow onPress={() => goTo(position + 1)}
        label={position === LAST_PROMPT ? t({ en: 'Take this with us', nl: 'Neem iets mee' }) : t({ en: 'A little further', nl: 'Een stukje verder' })} />
      <Button variant="quiet" icon="pen" label={keepLabel} onPress={() => setKeepVisible(true)} />
    </>;

  return <Screen header={<CloseHeader closeLabel={t({ en: 'Close', nl: 'Sluiten' })} title={topic.title[language]} onClose={() => { void onClose(); }} />} footer={footer}>
    {session ? <StoryChapter topic={topic} position={position} opacity={fade}
      eyebrow={prompt ? prompt.chapter[language] : t({ en: 'Take this with us', nl: 'Neem iets mee' })}>
      {prompt ? <>
        <Typewriter key={prompt.id} text={prompt.text[language]} center />
        {session.nudgeShown
          ? <WarmCard style={{ alignItems: 'center', gap: spacing.md }}>
            <TextBlock variant="invitation" center>{prompt.nudge[language]}</TextBlock>
            <Button variant="quiet" icon="chevronUp" underline label={t({ en: 'Hide the nudge', nl: 'Verberg het zetje' })} onPress={toggleNudge} />
          </WarmCard>
          : <Button variant="quiet" icon="chevronDown" underline={false} label={t({ en: 'A little nudge?', nl: 'Een klein zetje?' })} onPress={toggleNudge} />}
      </> : <>
        <Typewriter key="closing" variant="title" text={topic.closing[language]} center />
        <TextBlock variant="meta" secondary center>{t({
          en: 'Finish whenever you’re ready. Keeping a moment is optional.',
          nl: 'Rond af wanneer je er klaar voor bent. Een moment bewaren is niet verplicht.',
        })}</TextBlock>
      </>}
    </StoryChapter> : null}

    <KeepMomentSheet visible={keepVisible} onClose={() => setKeepVisible(false)} source={source} questionText={questionText}
      onSaved={onSaved}
      onRecord={() => { setKeepVisible(false); later(() => setRecorderVisible(true), SHEET_HANDOFF_MS); }} />
    <RecorderSheet visible={recorderVisible} onClose={() => setRecorderVisible(false)} source={source}
      onRecorded={(uri, durationMs) => { setRecorderVisible(false); navigation.navigate('Review', { uri, durationMs, source }); }}
      onWriteNote={() => { setRecorderVisible(false); later(() => setKeepVisible(true), SHEET_HANDOFF_MS); }} />
    <DraftSheet visible={draftFlow !== null} mode={draftFlow?.mode === 'finish' ? 'resolve' : 'leave'} busy={draftBusy}
      onKeep={() => { void resolveDraft(true); }} onDiscard={() => { void resolveDraft(false); }} onStay={() => setDraftFlow(null)} />
  </Screen>;
}
