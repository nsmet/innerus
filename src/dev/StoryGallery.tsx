import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { topics } from '../content/catalogue';
import { StoryChapter } from '../design/StoryChapter';
import { Button, Chip, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';

/** Development-only editorial review. Fictional authored content; no session or private-library access. */
export function StoryGallery() {
  const { language, t } = useDesign();
  const [topicId, setTopicId] = useState('A01');
  const [position, setPosition] = useState(0);
  const [still, setStill] = useState(false);
  const [fallback, setFallback] = useState(false);
  const topic = topics.find(item => item.id === topicId) ?? topics[0];
  const prompt = topic.prompts[position];
  return <View style={{ gap: spacing.group }}>
    <TextBlock variant="heading">Story direction · all 18 conversations</TextBlock>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {topics.map(item => <Chip key={item.id} label={`${item.id} · ${item.title[language]}`} selected={topic.id === item.id}
        onPress={() => { setTopicId(item.id); setPosition(0); }} />)}
    </ScrollView>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Chip label="Static preview" selected={still} onPress={() => setStill(value => !value)} />
      <Chip label="Family fallback" selected={fallback} onPress={() => setFallback(value => !value)} />
    </View>
    <StoryChapter topic={fallback ? { ...topic, version: 'preview-fallback' } : topic} position={position} still={still}
      eyebrow={prompt ? prompt.chapter[language] : t({ en: 'Take this with us', nl: 'Neem iets mee' })}>
      <TextBlock variant="prompt" center>{prompt ? prompt.text[language] : topic.closing[language]}</TextBlock>
      {prompt ? <TextBlock variant="invitation" secondary center>{prompt.nudge[language]}</TextBlock> : null}
    </StoryChapter>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Button variant="quiet" icon="back" label="Previous scene" disabled={position === 0} onPress={() => setPosition(value => Math.max(0, value - 1))} />
      <Button variant="quiet" trailingArrow label="Next scene" disabled={position === 5} onPress={() => setPosition(value => Math.min(5, value + 1))} />
    </View>
  </View>;
}
