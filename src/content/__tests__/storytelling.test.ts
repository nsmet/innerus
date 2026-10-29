import { getTopic, topics as catalogue } from '../catalogue';
import { getStoryFrame, storyFrames } from '../storyArt';
import { quickPool } from '../quick';

const extraIds = ['A06', 'B06', 'C06'];
const topics = catalogue.filter(topic => !extraIds.includes(topic.id));

test('every launch story has a complete bilingual five-question arc and six distinct paintings', () => {
  expect(catalogue).toHaveLength(18);
  expect(topics).toHaveLength(15);
  expect(topics.filter(topic => topic.access === 'free').map(topic => topic.id)).toEqual(['A01', 'B01', 'C01']);
  expect(quickPool).toHaveLength(7);
  expect(quickPool.every(({ topic }) => topic.access === 'free')).toBe(true);
  const states: string[] = [];
  for (const topic of topics) {
    expect(topic.version).toBe('1.1');
    expect(topic.prompts).toHaveLength(5);
    expect(storyFrames[topic.id]).toHaveLength(6);
    topic.prompts.forEach((prompt, index) => {
      expect(prompt.id).toBe(`${topic.id}-0${index + 1}`);
      for (const language of ['en', 'nl'] as const) {
        expect(prompt.chapter[language].trim()).not.toBe('');
        expect(prompt.text[language].trim()).not.toBe('');
        expect(prompt.nudge[language].trim()).not.toBe('');
      }
      expect(getStoryFrame(topic, index)?.id).toBe(prompt.sceneState);
    });
    for (const position of [0, 4, 2, 5, 1, 3, 0]) {
      expect(getStoryFrame(topic, position)).toBe(storyFrames[topic.id][position]);
    }
    states.push(...storyFrames[topic.id].map(frame => frame.id));
  }
  expect(new Set(states).size).toBe(90);
  // A06/B06/C06 are in the catalogue from the start, free and outside the paid offer (D46).
  for (const id of extraIds) {
    expect(catalogue.some(topic => topic.id === id)).toBe(true);
    expect(getTopic(id)?.access).toBe('free');
  }
});

test('a saved v1.0 session keeps its original wording and never receives v1.1 artwork', () => {
  const old = getTopic('A01', '1.0')!;
  const revised = getTopic('A01', '1.1')!;
  expect(old.prompts[1].text.en).toBe('What was the first thing you noticed about me?');
  expect(revised.prompts[1].text.en).toContain('choosing to wear');
  expect(revised.prompts[2].text.en).toContain('first saw me');
  expect(revised.prompts[4].text.en).toContain('said goodbye');
  expect(getStoryFrame(old, 1)).toBeUndefined();
  expect(getTopic('A01', 'unknown')).toBeUndefined();
  expect(getStoryFrame(revised, -1)).toBeUndefined();
  expect(getStoryFrame(revised, 6)).toBeUndefined();
  expect(getStoryFrame(revised, 1.5)).toBeUndefined();
});
