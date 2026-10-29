import React from 'react';
import { Pressable, View } from 'react-native';
import type { Topic } from '../content/types';
import type { Attachment, Moment } from '../data/repository';
import { getTopic } from '../content/catalogue';
import { ArtTile } from './Art';
import { Icon } from './Icon';
import { Button, StatusLine, TextBlock } from './primitives';
import { AccessTag, accessText, type CollectionAccess } from './access';
import { useDesign } from './ThemeProvider';
import { spacing } from './tokens';

export const durationShort = (minutes: number, language: 'en' | 'nl') => (language === 'nl' ? `Ongeveer ${minutes} min` : `About ${minutes} min`);
export const durationLong = (minutes: number, language: 'en' | 'nl') => (language === 'nl' ? `Ongeveer ${minutes} minuten` : `About ${minutes} minutes`);
export { AccessTag };
export const intensityLabel = { light: { en: 'Light', nl: 'Luchtig' }, personal: { en: 'Personal', nl: 'Persoonlijk' }, direct: { en: 'Direct', nl: 'Direct' } } as const;

/** DS08 topic row: cover crop, title, invitation, duration · intensity, access. */
export function TopicRow({ topic, unlocked, onOpen }: { topic: Topic; unlocked: CollectionAccess; onOpen: () => void }) {
  const { palette, language, t } = useDesign();
  const meta = `${durationShort(topic.minutes, language)} · ${t(intensityLabel[topic.intensity])}`;
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.group, paddingVertical: spacing.group, borderBottomWidth: 1, borderBottomColor: palette.divider }}>
    <Pressable accessibilityRole="button" onPress={onOpen}
      accessibilityLabel={`${topic.title[language]}. ${topic.invitation[language]} ${meta}. ${accessText(topic, unlocked, t)}`}
      style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: spacing.group, opacity: pressed ? 0.75 : 1 })}>
      <ArtTile family={topic.artFamily} size={76} />
      <View style={{ flex: 1, gap: 3 }}>
        <TextBlock variant="rowTitle" style={{ letterSpacing: -0.2 }}>{topic.title[language]}</TextBlock>
        <TextBlock variant="meta" secondary>{topic.invitation[language]}</TextBlock>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginTop: 4 }}>
          <TextBlock variant="supporting" secondary>{meta}</TextBlock>
          <AccessTag topic={topic} unlocked={unlocked} />
        </View>
      </View>
    </Pressable>
  </View>;
}

export function formatClip(ms: number | null | undefined) {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDay(iso: string, language: 'en' | 'nl') {
  return new Date(iso).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** DS14 Moment row: thumb, title, date, saved words in italic (or "Voice note · 01:48"), source and save status. */
export function MomentRow({ moment, attachments, onOpen }: { moment: Moment; attachments: Attachment[]; onOpen: () => void }) {
  const { palette, language, t } = useDesign();
  const topic = getTopic(moment.topicId);
  const audio = attachments.find(a => a.momentId === moment.id && a.kind === 'audio');
  const isVoiceOnly = moment.source === 'audio' && !moment.body.trim();
  const preview = isVoiceOnly ? `${t({ en: 'Voice note', nl: 'Spraaknotitie' })} · ${formatClip(audio?.durationMs)}` : moment.body;
  return <Pressable accessibilityRole="button" onPress={onOpen} accessibilityLabel={`${moment.title}. ${formatDay(moment.createdAt, language)}. ${preview}`}
    style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.group, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: palette.divider, opacity: pressed ? 0.75 : 1 })}>
    <ArtTile family={topic?.artFamily} size={56} height={72} rounded={8} missing={!topic} />
    <View style={{ flex: 1, gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <TextBlock variant="rowTitle" style={{ flex: 1, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 }}>{moment.title}</TextBlock>
        <TextBlock variant="supporting" secondary style={{ paddingTop: 3 }}>{formatDay(moment.createdAt, language)}</TextBlock>
      </View>
      <TextBlock variant="voice" style={{ fontSize: 16, lineHeight: 23 }} numberOfLines={3}>{preview}</TextBlock>
      {moment.source === 'reviewed-ai' && <StatusLine icon="document" text={t({ en: 'AI draft, reviewed by you', nl: 'AI-voorstel, door jou nagekeken' })} emphasis />}
      {topic && <StatusLine icon={moment.source === 'audio' ? 'mic' : moment.source === 'reviewed-ai' ? 'document' : 'pen'} text={topic.title[language]} />}
      <StatusLine icon="device" text={t({ en: 'Saved on this device', nl: 'Bewaard op dit apparaat' })} />
    </View>
  </Pressable>;
}

/** DS20 empty / recovery state: useful copy, optional art, one relevant action. */
export function EmptyState({ title, detail, action, art }: { title: string; detail: string; action?: { label: string; onPress: () => void }; art?: React.ReactNode }) {
  return <View style={{ alignItems: 'center', gap: spacing.group, paddingVertical: spacing.lg }}>
    {art}
    <TextBlock variant="title" center>{title}</TextBlock>
    <TextBlock variant="body" secondary center>{detail}</TextBlock>
    {action && <View style={{ alignSelf: 'stretch', alignItems: 'center' }}><View style={{ minWidth: 180 }}><Button variant="secondary" label={action.label} onPress={action.onPress} /></View></View>}
  </View>;
}
