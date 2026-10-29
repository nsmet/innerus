import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { getTopic, themes } from '../content/catalogue';
import type { Draft } from '../data/repository';
import { SceneArt } from '../design/Art';
import { Icon, type IconName } from '../design/Icon';
import { durationShort, EmptyState, intensityLabel } from '../design/patterns';
import { BackHeader, Button, Divider, Screen, TextBlock, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import { accessIcon, accessText } from '../design/access';
import { canOpenTopic, useAccess } from '../platform/access';
import { DraftSheet } from '../features/DraftSheet';
import { keepDraftAsMoment } from '../features/KeepMomentSheet';
import type { Routes, StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

type Nav = StackProps<'Topic'>['navigation'];

/** Name of the screen we came from, for the back label (design: "Explore"). */
function backLabel(navigation: Nav, t: (v: { en: string; nl: string }) => string) {
  const routes = navigation.getState().routes;
  const previous = routes[routes.length - 2];
  if (previous?.name === 'Main') {
    const tabState = previous.state;
    const tab = tabState && typeof tabState.index === 'number' ? tabState.routes[tabState.index]?.name : 'Tonight';
    if (tab === 'Explore') return t({ en: 'Explore', nl: 'Ontdekken' });
    if (tab === 'Moments') return t({ en: 'Moments', nl: 'Momenten' });
    return t({ en: 'Tonight', nl: 'Vanavond' });
  }
  if (previous?.name === 'Quick') return t({ en: 'A question for us', nl: 'Een vraag voor ons' });
  return t({ en: 'Back', nl: 'Terug' });
}

/** UI03 conversation detail: free / in your collection / locked / resume (spec 14). */
export function TopicScreen({ navigation, route }: StackProps<'Topic'>) {
  const { t, language, palette } = useDesign();
  const store = useAppStore();
  const { activeSession, startSession, repository } = store;
  const { access, unlocked } = useAccess();
  const topic = getTopic(route.params.topicId);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resolving, setResolving] = useState(false);
  const busy = useRef(false);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Explore' }));

  if (!topic) {
    return <Screen header={<BackHeader label={t({ en: 'Back', nl: 'Terug' })} onBack={goBack} />}>
      <EmptyState title={t({ en: 'This conversation is not here', nl: 'Dit gesprek is hier niet te vinden' })}
        detail={t({ en: 'It may belong to a newer version of InnerUs. Your saved moments are not affected.', nl: 'Het hoort misschien bij een nieuwere versie van InnerUs. Je bewaarde momenten blijven staan.' })}
        action={{ label: t({ en: 'Explore', nl: 'Ontdekken' }), onPress: () => navigation.navigate('Main', { screen: 'Explore' }) }} />
    </Screen>;
  }

  const accessible = canOpenTopic(topic, access, activeSession);
  const resumable = accessible && activeSession?.topicId === topic.id;
  const theme = themes.find(th => th.id === topic.theme);
  const title = topic.title[language];

  const open = (params: Routes['Conversation']) => navigation.navigate('Conversation', params);

  const startNew = async () => {
    await startSession(topic.id, topic.version);
    open({ topicId: topic.id });
  };

  /** Starting (again) explicitly resolves an unsaved typed draft of the current session first (spec 20). */
  const onStart = async () => {
    if (busy.current) return;
    busy.current = true;
    setStarting(true);
    try {
      const existing = activeSession && repository ? await repository.getDraft(activeSession.sessionId).catch(() => null) : null;
      if (existing?.body.trim()) { setDraft(existing); return; }
      await startNew();
    } finally {
      busy.current = false;
      setStarting(false);
    }
  };

  const resolveDraft = async (keep: boolean) => {
    if (!draft || resolving) return;
    setResolving(true);
    try {
      if (keep) await keepDraftAsMoment(store, draft, activeSession?.topicId ?? topic.id, language);
      else await repository?.discardDraft(draft.sessionId);
      setDraft(null);
      await startNew();
    } catch {
      // Keep the sheet open: nothing was lost and nothing claims it was saved.
    } finally {
      setResolving(false);
    }
  };

  const footer = !accessible
    ? <>
      {access.state === 'new' || access.state === 'checking'
        ? <Button label={t({ en: 'Open it with your free week', nl: 'Open het met je gratis week' })} trailingArrow onPress={() => navigation.navigate('Paywall', { topicId: topic.id })} />
        : <Button icon="lock" label={t({ en: 'See the full collection', nl: 'Bekijk de volledige collectie' })} onPress={() => navigation.navigate('Paywall', { topicId: topic.id })} />}
      <TextBlock variant="supporting" secondary center>{access.state === 'new' || access.state === 'checking'
        ? t({ en: 'Every conversation, free for 7 days. No subscription.', nl: 'Elk gesprek, 7 dagen gratis. Geen abonnement.' })
        : t({ en: 'One payment keeps every conversation. No subscription.', nl: 'Eén betaling voor alle gesprekken. Geen abonnement.' })}</TextBlock>
    </>
    : resumable
      ? <>
        <TextBlock variant="meta" secondary center>{t({ en: 'You left off partway through this conversation.', nl: 'Je was halverwege dit gesprek.' })}</TextBlock>
        <Button label={t({ en: 'Resume', nl: 'Hervatten' })} trailingArrow onPress={() => open({ topicId: topic.id, resume: true })} />
        <Button variant="secondary" label={t({ en: 'Start again', nl: 'Opnieuw beginnen' })} loading={starting} onPress={() => { void onStart(); }} />
      </>
      : <Button label={t({ en: 'Start this conversation', nl: 'Begin dit gesprek' })} trailingArrow loading={starting} onPress={() => { void onStart(); }} />;

  return <Screen header={<BackHeader label={backLabel(navigation, t)} onBack={goBack} />} footer={footer}>
    <View style={{ marginTop: spacing.sm }}>
      <SceneArt family={topic.artFamily} height={250} />
    </View>
    <View style={{ gap: spacing.sm }}>
      {theme ? <TextBlock variant="eyebrow" secondary>{t(theme.label)}</TextBlock> : null}
      <TextBlock variant="display">{title}</TextBlock>
      <TextBlock variant="invitation" secondary>{topic.invitation[language]}</TextBlock>
    </View>
    <View>
      <Divider />
      <View style={{ flexDirection: 'row', paddingVertical: spacing.md }}>
        <MetaCell icon="clock" label={durationShort(topic.minutes, language)} />
        <View style={{ width: 1, backgroundColor: palette.divider }} />
        <MetaCell icon="sliders" label={t(intensityLabel[topic.intensity])} />
        <View style={{ width: 1, backgroundColor: palette.divider }} />
        <MetaCell icon={accessIcon(topic, unlocked)} label={accessText(topic, unlocked, t)} />
      </View>
      <Divider />
    </View>
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="eyebrow" secondary>{t({ en: 'About this conversation', nl: 'Over dit gesprek' })}</TextBlock>
      <TextBlock variant="body">{topic.about[language]}</TextBlock>
    </View>
    {topic.intensity !== 'light' ? <WarmCard>
      <TextBlock variant="meta">{expectation(topic.intensity, title, language)}</TextBlock>
    </WarmCard> : null}
    <DraftSheet visible={draft !== null} mode="resolve" busy={resolving}
      onKeep={() => { void resolveDraft(true); }} onDiscard={() => { void resolveDraft(false); }} onStay={() => setDraft(null)} />
  </Screen>;
}

function MetaCell({ icon, label }: { icon: IconName; label: string }) {
  const { palette } = useDesign();
  return <View style={{ flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs }} accessible accessibilityLabel={label}>
    <Icon name={icon} color={palette.text} size={16} />
    <TextBlock variant="meta" center>{label}</TextBlock>
  </View>;
}

/** Brief neutral expectation before a Personal or Direct conversation (spec 14). */
function expectation(intensity: 'personal' | 'direct', title: string, language: 'en' | 'nl') {
  const subject = title.charAt(0).toLocaleLowerCase(language) + title.slice(1);
  if (language === 'nl') {
    const kind = intensity === 'direct' ? 'Een directer gesprek' : 'Een persoonlijker gesprek';
    return `${kind} over ${subject}. Jullie kunnen allebei een vraag overslaan of stoppen.`;
  }
  const kind = intensity === 'direct' ? 'A more direct conversation' : 'A more personal conversation';
  return `${kind} about ${subject}. Either of you can skip a question or stop.`;
}
