import React, { useState } from 'react';
import { View } from 'react-native';
import { topics } from '../content/catalogue';
import { StoryGallery } from './StoryGallery';
import { EmptyState, MomentRow, TopicRow } from '../design/patterns';
import { AccessCard, TrialMeter, TrialPill, TrialTimeline } from '../design/access';
import { BackHeader, Button, Chip, CloseHeader, Eyebrow, IconButton, ListGroup, ListRow, Screen, SearchField, Sheet, StatusLine, TextBlock, ToggleRow, PromptPager, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { colors, spacing } from '../design/tokens';
import { useAppStore } from '../state/AppStore';
import type { StackProps } from '../navigation/types';

/**
 * Local component gallery (development builds only). The SAME components the app uses, with fictional
 * fixtures. Nothing here records, saves, buys or reads the private library.
 */
export function GalleryScreen({ navigation }: StackProps<'Gallery'>) {
  const { palette, language, scheme } = useDesign();
  const { setPref } = useAppStore();
  const [query, setQuery] = useState('');
  const [toggle, setToggle] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [presses, setPresses] = useState(0);
  const press = () => setPresses(n => n + 1);
  const topic = topics[0];
  const fixtureMoment = { id: 'fixture', topicId: 'A01', topicVersion: '1.0', promptId: 'A01-03', questionSnapshot: topic.prompts[2].text.en, contentLanguage: 'en' as const,
    title: 'The first coffee', body: 'Fictional: that first coffee. The nerves. How easily we started talking.', source: 'typed' as const, participantLabel: null, version: 1, createdAt: '2026-10-21T19:00:00Z', updatedAt: '2026-10-21T19:00:00Z' };
  return <Screen testID="gallery-screen" header={<BackHeader label="InnerUs · Development" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main')} />}>
    <TextBlock variant="display">Component gallery</TextBlock>
    <TextBlock secondary>Shared tokens and components used by the app. Fictional fixtures only. Actions pressed: {presses}</TextBlock>
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
      <Chip label={language === 'en' ? 'Nederlands' : 'English'} onPress={() => void setPref('language', language === 'en' ? 'nl' : 'en')} />
      <Chip label={scheme === 'light' ? 'Dark' : 'Light'} onPress={() => void setPref('appearance', scheme === 'light' ? 'dark' : 'light')} />
    </View>
    <Eyebrow>Foundations · colour roles</Eyebrow>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{Object.entries(colors[scheme]).map(([name, value]) => <View key={name} style={{ width: 96, gap: 4 }}><View style={{ height: 32, borderRadius: 6, backgroundColor: value, borderWidth: 1, borderColor: palette.divider }} /><TextBlock variant="supporting">{name}</TextBlock></View>)}</View>
    <Eyebrow>DS03 · Text</Eyebrow>
    <TextBlock variant="display">Where shall we go tonight?</TextBlock>
    <TextBlock variant="title">Our first date</TextBlock>
    <TextBlock variant="invitation" secondary>A little trip back to the beginning.</TextBlock>
    <TextBlock variant="prompt">{topic.prompts[2].text[language]}</TextBlock>
    <Eyebrow framed>The little details</Eyebrow>
    <Eyebrow>DS04 · Actions</Eyebrow>
    <Button label="Start this conversation" trailingArrow onPress={press} />
    <Button label="Saving…" loading loadingLabel="Saving…" onPress={press} />
    <Button label="Choose a topic first" disabled reason="Disabled with a reason" onPress={press} />
    <Button variant="secondary" icon="pen" label="Keep a moment" onPress={press} />
    <Button variant="quiet" icon="chevronDown" label="A little nudge?" onPress={press} />
    <Button variant="destructive" icon="trash" label="Delete this moment" onPress={press} />
    <Eyebrow>DS05–DS07 · Icons, search, filters</Eyebrow>
    <View style={{ flexDirection: 'row' }}><IconButton name="settings" label="Settings" onPress={press} /><IconButton name="close" label="Close" onPress={press} /><IconButton name="share" label="Share" onPress={press} /></View>
    <SearchField value={query} onChangeText={setQuery} placeholder="Find a conversation" clearLabel="Clear search" />
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}><Chip selected label="All themes" onPress={press} /><Chip label="Our story" onPress={press} /><Chip menu label="Any length" onPress={press} /></View>
    <Eyebrow>DS08 · Topic row</Eyebrow>
    <TopicRow topic={topic} unlocked={null} onOpen={press} />
    {topics[3] && <TopicRow topic={topics[3]} unlocked={null} onOpen={press} />}
    {topics[3] && <TopicRow topic={topics[3]} unlocked="trial" onOpen={press} />}
    {topics[3] && <TopicRow topic={topics[3]} unlocked="owned" onOpen={press} />}
    <Eyebrow>DS23 · Free week and the full collection</Eyebrow>
    <View style={{ flexDirection: 'row', gap: spacing.group, alignItems: 'center', flexWrap: 'wrap' }}><TrialMeter day={0} /><TrialMeter day={3} /><TrialMeter day={7} /><TrialMeter day={8} /></View>
    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}><TrialPill day={2} daysLeft={6} onPress={press} /><TrialPill day={7} daysLeft={1} onPress={press} /></View>
    <AccessCard state={{ kind: 'new' }} freeCount={6} totalCount={18} onAction={press} />
    <AccessCard state={{ kind: 'trial', day: 3, daysLeft: 5, endsLabel: 'Thursday 29 October' }} art="window" freeCount={6} totalCount={18} onAction={press} />
    <AccessCard state={{ kind: 'trial', day: 6, daysLeft: 2, endsLabel: 'Thursday 29 October' }} art="window" freeCount={6} totalCount={18} onAction={press} />
    <AccessCard state={{ kind: 'ended' }} art="cafe" freeCount={6} totalCount={18} onAction={press} />
    <AccessCard state={{ kind: 'owned' }} art="cafe" freeCount={6} totalCount={18} />
    <AccessCard state={{ kind: 'owned', legacy: true }} art="cafe" freeCount={6} totalCount={18} />
    <WarmCard><TrialTimeline steps={[{ marker: 'today', label: 'Today', text: 'All 15 open. Nothing is charged.' }, { marker: 'end', label: 'Day 7 · Thu 29 Oct', text: 'Ends by itself. 12 close again.' }, { marker: 'after', label: 'Then you choose', text: 'Keep all for €19.99, once. Or 3 stay free.' }]} /></WarmCard>
    <Eyebrow>DS10 · Scene, chapters</Eyebrow>
    <StoryGallery />
    <Eyebrow>DS11 · Conversation</Eyebrow>
    <CloseHeader title="Our first date" closeLabel="Close" onClose={press} />
    <PromptPager position={1} total={5} onPrevious={press} onSkip={press} previousLabel="Previous" skipLabel="Skip" progressLabel="Question 2 of 5" />
    <Eyebrow>DS14 · Moment</Eyebrow>
    <MomentRow moment={fixtureMoment} attachments={[]} onOpen={press} />
    <Eyebrow>DS19 · Status</Eyebrow>
    <StatusLine icon="device" text="Saved on this device" /><StatusLine icon="cloud" text="Waiting to sync" /><StatusLine icon="warning" text="This could not be saved yet. Your draft is still here." />
    <Eyebrow>DS20 · Empty state</Eyebrow>
    <EmptyState title="Your saved moments will gather here." detail="Fictional preview; no personal library is read." action={{ label: 'Find a conversation', onPress: press }} />
    <Eyebrow>DS21 · Preferences</Eyebrow>
    <ListGroup title="Example"><ToggleRow title="Keep the original audio" value={toggle} onChange={setToggle} onLabel="On" offLabel="Off" /><ListRow icon="globe" title="App language" value="Follow device" onPress={press} /></ListGroup>
    <WarmCard><TextBlock variant="meta">App lock is unavailable. Set a passcode on this device first.</TextBlock></WarmCard>
    <Eyebrow>DS22 · Sheet</Eyebrow>
    <Button variant="secondary" label="Open a sheet" onPress={() => setSheet(true)} />
    <Sheet visible={sheet} onClose={() => setSheet(false)}><TextBlock variant="title">A little piece of us.</TextBlock><TextBlock secondary>Fictional sheet.</TextBlock><Button label="Done" onPress={() => setSheet(false)} /></Sheet>
  </Screen>;
}
