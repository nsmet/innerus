import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Platform, Pressable, View } from 'react-native';
import { getTopic, isAccessible, themes, topics } from '../content/catalogue';
import type { Topic } from '../content/types';
import { ArtTile, SceneArt } from '../design/Art';
import { Icon } from '../design/Icon';
import { durationLong, intensityLabel } from '../design/patterns';
import { AccessCard, TrialPill, accessText } from '../design/access';
import { formatTrialEnd, useAccess } from '../platform/access';
import { Button, IconButton, Screen, TextBlock, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, radius, shadow, spacing, typography } from '../design/tokens';
import { DraftSheet } from '../features/DraftSheet';
import { RecordingDraftPrompt } from '../features/RecordingDraftPrompt';
import { ReminderInviteSheet } from '../features/ReminderInviteSheet';
import { scheduleReminder, type ReminderSchedule } from '../features/reminders';
import { AccountChangedSheet } from '../features/SyncSettingsSection';
import type { TabProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

/**
 * UI01 Tonight: one ready-to-start conversation, an optional resume item, the three entrances and the
 * quick-question shortcut (spec §12). Recommendation uses only local completions, access and hidden
 * themes (spec §64): new installs feature the free first date, then rotate after completion.
 */
function chooseFeatured(catalogue: readonly Topic[], owned: boolean, completions: Record<string, number>, hiddenThemes: string[]): Topic {
  const candidates = catalogue.filter(t => isAccessible(t, owned) && !hiddenThemes.includes(t.theme));
  const pool = candidates.length ? candidates : topics.filter(t => t.access === 'free');
  return pool.find(t => !completions[t.id]) ?? [...pool].sort((a, b) => (completions[a.id] ?? 0) - (completions[b.id] ?? 0))[0];
}

export function TonightScreen({ navigation }: TabProps<'Tonight'>) {
  const { palette, scheme, language, t } = useDesign();
  const store = useAppStore();
  const { prefs, activeSession, completions } = store;
  const { access, unlocked, endedInvitationDue, markEndedInvitationShown } = useAccess();
  const [draftPrompt, setDraftPrompt] = useState(false);
  const [reminderInvite, setReminderInvite] = useState(false);
  const featured = useMemo(() => chooseFeatured(topics, !!unlocked, completions, prefs.hiddenThemes),
    [unlocked, completions, prefs.hiddenThemes]);
  const freeCount = topics.filter(x => x.access === 'free').length;

  // When the free week has ended, Tonight invites once (then at most every few days) to keep the collection.
  // Only from Tonight, never over a conversation, a sheet or a saved moment (spec 38).
  useFocusEffect(useCallback(() => {
    if (!endedInvitationDue) return;
    const timer = setTimeout(() => {
      markEndedInvitationShown();
      navigation.navigate('Paywall', { reason: 'trial-ended' });
    }, 700);
    return () => clearTimeout(timer);
  }, [endedInvitationDue, markEndedInvitationShown, navigation]));

  // After the first finished conversation, invite once to pick a weekly moment. Never again after that,
  // never when reminders are already on, and never at the same time as the trial-ended invitation.
  const finishedAny = Object.values(completions).some(n => n > 0);
  const reminderInviteDue = store.ready && !store.storageError && finishedAny && !activeSession
    && !prefs.reminders.enabled && !prefs.reminderInviteShown && !endedInvitationDue;
  useFocusEffect(useCallback(() => {
    if (!reminderInviteDue) return;
    const timer = setTimeout(() => {
      void store.setPref('reminderInviteShown', true);
      setReminderInvite(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [reminderInviteDue, store]));

  const confirmReminder = async (schedule: ReminderSchedule) => {
    const result = await scheduleReminder(schedule, language);
    await store.setPref('reminders', { ...schedule, enabled: result === 'scheduled' });
    return result;
  };

  const openOffer = () => navigation.navigate('Paywall', {});
  const accessCard = access.state === 'new'
    ? <AccessCard state={{ kind: 'new' }} art="garden" freeCount={freeCount} totalCount={topics.length} onAction={openOffer} />
    : access.state === 'trial' && access.daysLeft <= 2
      ? <AccessCard state={{ kind: 'trial', day: access.day, daysLeft: access.daysLeft, endsLabel: formatTrialEnd(access.endsAt, language) }} art="window" freeCount={freeCount} totalCount={topics.length} onAction={openOffer} />
      : access.state === 'ended'
        ? <AccessCard state={{ kind: 'ended' }} art="cafe" freeCount={freeCount} totalCount={topics.length} onAction={openOffer} />
        : null;
  const resumeTopic = activeSession ? getTopic(activeSession.topicId, activeSession.topicVersion) : undefined;
  const theme = themes.find(th => th.id === featured.theme);
  const device = Platform.OS === 'ios' ? t({ en: 'this iPhone', nl: 'deze iPhone' }) : t({ en: 'this device', nl: 'dit apparaat' });

  const startFeatured = async () => {
    // Light topics start straight away; personal/direct topics first show their detail and expectation.
    if (featured.intensity !== 'light') return navigation.navigate('Topic', { topicId: featured.id });
    if (activeSession?.topicId === featured.id) return navigation.navigate('Conversation', { topicId: featured.id, resume: true });
    await store.startSession(featured.id, featured.version);
    navigation.navigate('Conversation', { topicId: featured.id });
  };

  const dismissResume = async () => {
    if (!activeSession || !store.repository) return store.dismissResume();
    const draft = await store.repository.getDraft(activeSession.sessionId);
    if (draft && (draft.body.trim() || draft.title.trim())) setDraftPrompt(true);
    else await store.dismissResume();
  };

  return <Screen testID="tonight-screen">
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: geometry.touch, marginTop: spacing.sm }}>
      <Pressable accessibilityRole="header" accessibilityLabel="InnerUs" onLongPress={__DEV__ ? () => navigation.navigate('Gallery') : undefined}>
        <TextBlock variant="heading" style={{ fontSize: 24, lineHeight: 28 }}>Inner<TextBlock variant="heading" style={{ fontSize: 24, lineHeight: 28, fontFamily: typography.invitation.fontFamily }}>Us</TextBlock></TextBlock>
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: -10 }}>
        {access.state === 'trial' ? <TrialPill day={access.day} daysLeft={access.daysLeft} onPress={openOffer} /> : null}
        <IconButton name="settings" label={t({ en: 'Settings', nl: 'Instellingen' })} onPress={() => navigation.navigate('Settings')} />
      </View>
    </View>

    {activeSession && resumeTopic ? (
      <View style={[{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.group, paddingRight: spacing.sm, borderRadius: radius.group, backgroundColor: palette.raised, borderWidth: scheme === 'dark' ? 1 : 0, borderColor: palette.divider }, shadow(scheme)]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t({ en: 'Continue our conversation', nl: 'Ga verder met ons gesprek' })}: ${resumeTopic.title[language]}`}
          onPress={() => navigation.navigate('Conversation', { topicId: resumeTopic.id, resume: true })}
          style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center', opacity: pressed ? 0.75 : 1 })}>
          <ArtTile family={resumeTopic.artFamily} size={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <TextBlock variant="eyebrow" secondary>{t({ en: 'Unfinished', nl: 'Onafgerond' })}</TextBlock>
            <TextBlock variant="rowTitle">{resumeTopic.title[language]}</TextBlock>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <TextBlock variant="label" style={{ fontWeight: '600' }}>{t({ en: 'Continue our conversation', nl: 'Ga verder met ons gesprek' })}</TextBlock>
              <Icon name="arrow" color={palette.text} size={16} />
            </View>
          </View>
        </Pressable>
        <View style={{ alignSelf: 'flex-start', marginTop: -10 }}><IconButton name="close" size={20} label={t({ en: 'Dismiss the unfinished conversation', nl: 'Onafgerond gesprek wegleggen' })} onPress={() => void dismissResume()} /></View>
      </View>
    ) : !prefs.privacyNoteDismissed ? (
      <WarmCard style={{ paddingVertical: 14, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingRight: spacing.sm }}>
        <View style={{ paddingTop: 1 }}><Icon name="shield" color={palette.text} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <TextBlock variant="meta">{Platform.OS === 'ios'
            ? t({ en: `No InnerUs account. Your moments stay on ${device}.`, nl: `Geen InnerUs-account. Je momenten blijven op ${device}.` })
            : t({ en: 'No InnerUs account. Your moments stay on this device.', nl: 'Geen InnerUs-account. Je momenten blijven op dit apparaat.' })}</TextBlock>
          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Help', { topic: 'how' })} hitSlop={8}>
            <TextBlock variant="meta" style={{ fontWeight: '600', textDecorationLine: 'underline' }}>{t({ en: 'How this works', nl: 'Zo werkt het' })}</TextBlock>
          </Pressable>
        </View>
        <View style={{ marginTop: -12 }}><IconButton name="close" size={20} label={t({ en: 'Dismiss', nl: 'Sluiten' })} onPress={() => void store.setPref('privacyNoteDismissed', true)} /></View>
      </WarmCard>
    ) : null}

    <TextBlock variant="display" style={{ marginTop: spacing.sm }}>{t({ en: 'Where shall we go tonight?', nl: 'Waar gaan we vanavond naartoe?' })}</TextBlock>

    <Pressable accessibilityRole="button" accessibilityLabel={`${featured.title[language]}. ${featured.invitation[language]}`} onPress={() => navigation.navigate('Topic', { topicId: featured.id })}>
      <SceneArt family={featured.artFamily} height={210} />
      <View style={{ gap: 6, marginTop: spacing.group }}>
        <TextBlock variant="eyebrow" secondary>{`${theme?.label[language] ?? ''} · ${accessText(featured, unlocked, t)}`}</TextBlock>
        <TextBlock variant="title">{featured.title[language]}</TextBlock>
        <TextBlock variant="invitation" secondary>{featured.invitation[language]}</TextBlock>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
          <Icon name="clock" color={palette.secondary} size={16} />
          <TextBlock variant="meta" secondary>{`${durationLong(featured.minutes, language)}  ·  ${t(intensityLabel[featured.intensity])}`}</TextBlock>
        </View>
      </View>
    </Pressable>

    <Button label={activeSession?.topicId === featured.id ? t({ en: 'Continue our conversation', nl: 'Ga verder met ons gesprek' }) : t({ en: 'Start this conversation', nl: 'Begin dit gesprek' })}
      trailingArrow onPress={() => void startFeatured()} />

    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
      {themes.map(th => <Pressable key={th.id} accessibilityRole="button" accessibilityLabel={th.label[language]} onPress={() => navigation.navigate('Explore', { theme: th.id })}
        style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 10, opacity: pressed ? 0.75 : 1 })}>
        <ThemeTile family={th.artFamily} />
        <TextBlock variant="rowTitle" center style={{ fontSize: 16, lineHeight: 20 }}>{th.label[language]}</TextBlock>
      </Pressable>)}
    </View>

    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Quick')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.divider, opacity: pressed ? 0.7 : 1 })}>
      <Icon name="cards" color={palette.text} size={22} />
      <TextBlock variant="body" style={{ flex: 1, fontWeight: '500' }}>{t({ en: 'Just give us a question', nl: 'Geef ons gewoon een vraag' })}</TextBlock>
      <Icon name="chevronRight" color={palette.text} size={18} />
    </Pressable>

    {accessCard}

    <DraftSheet visible={draftPrompt}
      onKeep={() => setDraftPrompt(false)}
      onStay={() => setDraftPrompt(false)}
      onDiscard={async () => {
        setDraftPrompt(false);
        if (activeSession && store.repository) await store.repository.discardDraft(activeSession.sessionId);
        await store.dismissResume();
      }} />
    <RecordingDraftPrompt />
    <ReminderInviteSheet visible={reminderInvite} onConfirm={confirmReminder} onClose={() => setReminderInvite(false)} />
    <AccountChangedSheet onHowItWorks={() => navigation.navigate('Help', { topic: 'data' })} />
  </Screen>;
}

/** Theme entrance tile: full-width crop, 104 tall, the one shadow. */
function ThemeTile({ family }: { family: Topic['artFamily'] }) {
  const [width, setWidth] = useState(0);
  return <View style={{ alignSelf: 'stretch' }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
    {width > 0 && <ArtTile family={family} size={width} height={104} rounded={radius.group} />}
  </View>;
}
