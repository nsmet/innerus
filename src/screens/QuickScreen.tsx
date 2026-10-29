import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { nextQuickId, quickPool } from '../content/quick';
import { StoryChapter } from '../design/StoryChapter';
import { Typewriter } from '../design/Typewriter';
import { EmptyState } from '../design/patterns';
import { Button, CloseHeader, Screen, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { motion } from '../design/tokens';
import { KeepMomentSheet, savedOnDeviceText } from '../features/KeepMomentSheet';
import type { StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

const HISTORY = 10;
const SAVED_NOTICE_MS = 3500;

/** UI05 one standalone question. Never starts a session or counts a completion (spec 19). */
export function QuickScreen({ navigation }: StackProps<'Quick'>) {
  const { t, language, reduceMotion } = useDesign();
  const { prefs, setPref } = useAppStore();
  const [promptId, setPromptId] = useState<string | null>(null);
  const [keepVisible, setKeepVisible] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const history = useRef<string[]>(prefs.quickHistory);
  const fade = useRef(new Animated.Value(1)).current;
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draw = () => {
    if (quickPool.length === 0) return;
    const id = nextQuickId(history.current);
    history.current = [...history.current, id].slice(-HISTORY);
    void setPref('quickHistory', history.current);
    setPromptId(id);
    setSavedNotice(false);
    if (!reduceMotion) {
      fade.setValue(0.15);
      Animated.timing(fade, { toValue: 1, duration: motion.prompt, useNativeDriver: true }).start();
    }
  };

  // One question immediately on open.
  useEffect(() => { draw(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Tonight' }));
  const header = <CloseHeader closeLabel={t({ en: 'Close', nl: 'Sluiten' })} title={t({ en: 'A question for us', nl: 'Een vraag voor ons' })} onClose={close} />;
  const entry = quickPool.find(e => e.prompt.id === promptId);

  if (quickPool.length === 0) {
    return <Screen header={header}>
      <EmptyState title={t({ en: 'No questions here yet', nl: 'Nog geen vragen' })}
        detail={t({ en: 'Pick a conversation in Explore instead.', nl: 'Kies in plaats daarvan een gesprek bij Ontdekken.' })}
        action={{ label: t({ en: 'Explore', nl: 'Ontdekken' }), onPress: () => navigation.navigate('Main', { screen: 'Explore' }) }} />
    </Screen>;
  }
  if (!entry) return <Screen header={header}>{null}</Screen>;
  const { topic, prompt } = entry;

  const footer = <>
    {savedNotice ? <View style={{ alignItems: 'center' }}><StatusLine icon="device" text={savedOnDeviceText(t)} /></View> : null}
    <Button icon="refresh" label={t({ en: 'Another question', nl: 'Nog een vraag' })} onPress={draw} />
    <Button variant="secondary" label={t({ en: 'Explore this conversation', nl: 'Ontdek dit gesprek' })}
      onPress={() => navigation.navigate('Topic', { topicId: topic.id })} />
    <Button variant="quiet" icon="pen" underline={false} label={t({ en: 'Keep a moment', nl: 'Bewaar een moment' })} onPress={() => setKeepVisible(true)} />
  </>;

  return <Screen header={header} footer={footer}>
    <StoryChapter topic={topic} position={topic.prompts.indexOf(prompt)} artHeight={176} opacity={fade}
      eyebrow={t({ en: 'A question for us', nl: 'Een vraag voor ons' })}>
      <Typewriter key={prompt.id} text={prompt.text[language]} center style={{ fontSize: 34, lineHeight: 42 }} />
      <TextBlock variant="meta" secondary center>
        {t({ en: 'From ', nl: 'Uit ' })}
        <TextBlock variant="voice" secondary style={{ fontSize: 14, lineHeight: 20 }}>{topic.title[language]}</TextBlock>
      </TextBlock>
    </StoryChapter>
    <KeepMomentSheet visible={keepVisible} onClose={() => setKeepVisible(false)}
      source={{ topicId: topic.id, topicVersion: topic.version, promptId: prompt.id }} questionText={prompt.text[language]}
      onSaved={() => {
        setKeepVisible(false);
        setSavedNotice(true);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setSavedNotice(false), SAVED_NOTICE_MS);
      }} />
  </Screen>;
}
