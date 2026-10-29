import React from 'react';
import { View } from 'react-native';
import { getTopic } from '../content/catalogue';
import { addDays, daysBetween, toDay } from '../content/releases';
import { BackHeader, Button, Chip, Eyebrow, Screen, TextBlock, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import type { StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';
import { useReleases } from '../state/useReleases';

/**
 * Development-only release controls (docs/RELEASES.md). Changes only the 'releases.*' preferences on this
 * device. Release builds ignore the simulated day and hand-released packs, and never include this screen.
 */
export function ReleasesScreen({ navigation }: StackProps<'Releases'>) {
  const { palette, language } = useDesign();
  const { prefs, setPref } = useAppStore();
  const { today, start, states } = useReleases();
  const realToday = toDay(new Date());
  const simulated = prefs['releases.devToday'];
  const forced = prefs['releases.devForced'];

  const setStart = (day: string) => void setPref('releases.start', day);
  const setToday = (day: string | null) => void setPref('releases.devToday', day === realToday ? null : day);
  const toggleForced = (id: string) => void setPref('releases.devForced', forced.includes(id) ? forced.filter(x => x !== id) : [...forced, id]);

  return <Screen testID="releases-screen" header={<BackHeader label="InnerUs · Development" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main')} />}>
    <TextBlock variant="display">Releases</TextBlock>
    <TextBlock secondary>A pack arrives on max(release date, journey start + weeks). Changes here stay on this device.</TextBlock>

    <Eyebrow>Journey start</Eyebrow>
    <TextBlock variant="title">{start}</TextBlock>
    <TextBlock variant="supporting" secondary>{`Week ${Math.floor(daysBetween(start, today) / 7)} · day ${daysBetween(start, today)} of the journey`}</TextBlock>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Chip label="−1 week" onPress={() => setStart(addDays(start, -7))} />
      <Chip label="−1 day" onPress={() => setStart(addDays(start, -1))} />
      <Chip label="+1 day" onPress={() => setStart(addDays(start, 1))} />
      <Chip label="+1 week" onPress={() => setStart(addDays(start, 7))} />
      <Chip label="Today" onPress={() => setStart(realToday)} />
    </View>

    <Eyebrow>Today</Eyebrow>
    <TextBlock variant="title">{today}{simulated ? '  (simulated)' : ''}</TextBlock>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Chip label="−1 week" onPress={() => setToday(addDays(today, -7))} />
      <Chip label="−1 day" onPress={() => setToday(addDays(today, -1))} />
      <Chip label="+1 day" onPress={() => setToday(addDays(today, 1))} />
      <Chip label="+1 week" onPress={() => setToday(addDays(today, 7))} />
      <Chip label="Real today" selected={!simulated} onPress={() => setToday(null)} />
    </View>

    <Eyebrow>Packs</Eyebrow>
    {states.map(state => <WarmCard key={state.pack.id} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextBlock variant="rowTitle">{`${state.pack.id} · ${state.pack.title[language]}`}</TextBlock>
        <TextBlock variant="supporting" style={{ fontWeight: '600', color: state.released ? palette.accent : palette.secondary }}>
          {!state.released ? 'Upcoming' : state.unseenTopicIds.length ? (state.fresh ? 'New' : 'Released') : 'Seen'}
        </TextBlock>
      </View>
      <TextBlock variant="supporting" secondary>{state.pack.topicIds.map(id => `${id} ${getTopic(id)?.title[language] ?? ''}`).join(', ')}</TextBlock>
      <TextBlock variant="supporting" secondary>{`Release date ${state.pack.releaseDate} · start + ${state.pack.weekOffset} wk = ${addDays(start, state.pack.weekOffset * 7)}`}</TextBlock>
      <TextBlock variant="supporting">{`Unlocks ${state.unlockDay} (decided by ${state.decidedBy})${state.forced ? ' · released by hand' : ''}`}</TextBlock>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label={state.forced ? 'Undo release now' : 'Release now'} selected={state.forced} onPress={() => toggleForced(state.pack.id)} />
        <Chip label="Jump today here" onPress={() => setToday(state.unlockDay)} />
      </View>
    </WarmCard>)}

    <Eyebrow>Reset</Eyebrow>
    <Button variant="secondary" label="Mark every pack unseen" onPress={() => void setPref('releases.seen', [])} />
    <Button variant="quiet" label="Reset all release settings" onPress={() => {
      void setPref('releases.seen', []); void setPref('releases.devForced', []); void setPref('releases.devToday', null); setStart(realToday);
    }} />
  </Screen>;
}
