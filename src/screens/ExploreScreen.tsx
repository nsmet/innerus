import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { filterTopics, themes, topics, type DurationFilter, type IntensityFilter } from '../content/catalogue';
import type { ThemeId, Topic } from '../content/types';
import { ArtTile } from '../design/Art';
import { Icon } from '../design/Icon';
import { TopicRow, intensityLabel } from '../design/patterns';
import { Button, Chip, Eyebrow, Screen, SearchField, Sheet, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing } from '../design/tokens';
import type { TabProps } from '../navigation/types';
import { useAccess } from '../platform/access';

type ThemeChoice = ThemeId | 'all';

/**
 * UI02 Explore (spec §13): local search over titles, invitations, descriptions and tags in the current
 * language; themes plus combinable length/intensity filters with a visible clear action.
 * Query and filters live in this tab's state, so returning from a topic keeps them.
 */
export function ExploreScreen({ route, navigation }: TabProps<'Explore'>) {
  const { palette, language, t } = useDesign();
  const { unlocked } = useAccess();
  const [theme, setTheme] = useState<ThemeChoice>(route.params?.theme ?? 'all');
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState<DurationFilter>('any');
  const [intensity, setIntensity] = useState<IntensityFilter>('any');
  const [menu, setMenu] = useState<'duration' | 'intensity' | null>(null);
  useEffect(() => { if (route.params?.theme) setTheme(route.params.theme); }, [route.params?.theme]);

  const results = useMemo(() => {
    return filterTopics(theme, query, language, duration, intensity, topics);
  }, [theme, query, language, duration, intensity]);

  const filtered = theme !== 'all' || query.trim() !== '' || duration !== 'any' || intensity !== 'any';
  const clear = () => { setTheme('all'); setQuery(''); setDuration('any'); setIntensity('any'); navigation.setParams({ theme: undefined }); };

  const durationText: Record<DurationFilter, string> = {
    any: t({ en: 'Any length', nl: 'Elke duur' }), short: t({ en: 'About 8 min', nl: 'Ongeveer 8 min' }), long: t({ en: '10 min or more', nl: '10 min of langer' }),
  };
  const intensityText: Record<IntensityFilter, string> = {
    any: t({ en: 'Any intensity', nl: 'Elke intensiteit' }), light: t(intensityLabel.light), personal: t(intensityLabel.personal), direct: t(intensityLabel.direct),
  };
  const themeName = (id: ThemeChoice) => id === 'all' ? t({ en: 'All themes', nl: "Alle thema's" }) : themes.find(x => x.id === id)!.label[language];

  const row = (topic: Topic) => <TopicRow key={topic.id} topic={topic} unlocked={unlocked} onOpen={() => navigation.navigate('Topic', { topicId: topic.id })} />;

  const summary = [
    `${results.length} ${results.length === 1 ? t({ en: 'conversation', nl: 'gesprek' }) : t({ en: 'conversations', nl: 'gesprekken' })}`,
    theme !== 'all' ? themeName(theme) : null,
    duration !== 'any' ? durationText[duration] : null,
    intensity !== 'any' ? intensityText[intensity] : null,
  ].filter(Boolean).join(' · ');

  return <Screen testID="explore-screen">
    <TextBlock variant="display" style={{ marginTop: spacing.sm }}>{t({ en: 'Explore', nl: 'Ontdekken' })}</TextBlock>
    <SearchField value={query} onChangeText={setQuery} placeholder={t({ en: 'Find a conversation', nl: 'Zoek een gesprek' })} clearLabel={t({ en: 'Clear search', nl: 'Wis zoekopdracht' })} />

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.page, flexGrow: 0 }} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.page, alignItems: 'center' }}>
      {(['all', ...themes.map(x => x.id)] as ThemeChoice[]).map(id =>
        <Chip key={id} label={themeName(id)} selected={theme === id} onPress={() => setTheme(id)} />)}
    </ScrollView>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Chip menu label={durationText[duration]} selected={duration !== 'any'} onPress={() => setMenu('duration')} />
      <Chip menu label={intensityText[intensity]} selected={intensity !== 'any'} onPress={() => setMenu('intensity')} />
    </View>

    {filtered && results.length > 0 && <View style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
      <Pressable accessibilityRole="button" onPress={clear} hitSlop={8} style={{ minHeight: geometry.touch, justifyContent: 'center' }}>
        <TextBlock variant="label" style={{ textDecorationLine: 'underline' }}>{t({ en: 'Clear filters', nl: 'Wis filters' })}</TextBlock>
      </Pressable>
      <TextBlock variant="supporting" secondary accessibilityLiveRegion="polite">{summary}</TextBlock>
    </View>}

    {results.length === 0 ? <View style={{ alignItems: 'center', gap: spacing.group, paddingTop: spacing.lg }}>
      <ArtTile family="notebook" size={170} height={150} />
      <TextBlock variant="heading" center style={{ fontSize: 24, lineHeight: 30 }}>{t({ en: 'No conversations match yet.', nl: 'Nog geen passende gesprekken.' })}</TextBlock>
      <TextBlock variant="body" secondary center>{t({ en: 'Try another word or clear a filter.', nl: 'Probeer een ander woord of wis een filter.' })}</TextBlock>
      <View style={{ alignSelf: 'stretch' }}><Button variant="secondary" label={t({ en: 'Clear filters', nl: 'Wis filters' })} onPress={clear} /></View>
      <View style={{ marginTop: spacing.sm }}><Eyebrow framed>{t({ en: 'Nearby themes', nl: "Verwante thema's" })}</Eyebrow></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        {themes.map(x => <Chip key={x.id} label={x.label[language]} onPress={() => { setQuery(''); setDuration('any'); setIntensity('any'); setTheme(x.id); }} />)}
      </View>
    </View>
    : !filtered ? themes.map(x => {
      const inTheme = results.filter(topic => topic.theme === x.id);
      return <View key={x.id} style={{ marginTop: spacing.sm }}>
        <Eyebrow>{x.label[language]}</Eyebrow>
        {inTheme.map(row)}
      </View>;
    })
    : <View>{results.map(row)}</View>}

    <Sheet visible={menu !== null} onClose={() => setMenu(null)}>
      <TextBlock variant="heading">{menu === 'duration' ? t({ en: 'Length', nl: 'Duur' }) : t({ en: 'Intensity', nl: 'Intensiteit' })}</TextBlock>
      {menu === 'duration' && (Object.keys(durationText) as DurationFilter[]).map(key =>
        <ChoiceRow key={key} label={durationText[key]} selected={duration === key} onPress={() => { setDuration(key); setMenu(null); }} />)}
      {menu === 'intensity' && (Object.keys(intensityText) as IntensityFilter[]).map(key =>
        <ChoiceRow key={key} label={intensityText[key]} selected={intensity === key} onPress={() => { setIntensity(key); setMenu(null); }} />)}
      <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => setMenu(null)} />
    </Sheet>
  </Screen>;

  function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: palette.divider, opacity: pressed ? 0.7 : 1 })}>
      <TextBlock variant="body" style={{ flex: 1, fontWeight: selected ? '600' : '400' }}>{label}</TextBlock>
      {selected && <Icon name="check" color={palette.text} />}
    </Pressable>;
  }
}
