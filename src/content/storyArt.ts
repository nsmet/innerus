import type { ImageSourcePropType } from 'react-native';
import type { Topic } from './types';

export type StoryReveal = 'arrive' | 'unfold' | 'glow' | 'gather' | 'settle' | 'rise' | 'open';
export type StoryFrame = Readonly<{ id: string; source: ImageSourcePropType; reveal: StoryReveal }>;

/** Explicit bundled assets, one painting per prompt plus a closing; no remote lookup. */
export const storyFrames: Readonly<Record<string, readonly StoryFrame[]>> = {
  A01: [
    { id: 'cafe-A01-1-v2', source: require('../../assets/art/stories/A01-01.jpg'), reveal: 'arrive' },
    { id: 'cafe-A01-2-v2', source: require('../../assets/art/stories/A01-02.jpg'), reveal: 'unfold' },
    { id: 'cafe-A01-3-v2', source: require('../../assets/art/stories/A01-03.jpg'), reveal: 'glow' },
    { id: 'cafe-A01-4-v2', source: require('../../assets/art/stories/A01-04.jpg'), reveal: 'gather' },
    { id: 'cafe-A01-5-v2', source: require('../../assets/art/stories/A01-05.jpg'), reveal: 'settle' },
    { id: 'cafe-A01-closing-v2', source: require('../../assets/art/stories/A01-06.jpg'), reveal: 'settle' },
  ],
  A02: [
    { id: 'travel-A02-1-v2', source: require('../../assets/art/stories/A02-01.jpg'), reveal: 'unfold' },
    { id: 'travel-A02-2-v2', source: require('../../assets/art/stories/A02-02.jpg'), reveal: 'arrive' },
    { id: 'travel-A02-3-v2', source: require('../../assets/art/stories/A02-03.jpg'), reveal: 'glow' },
    { id: 'travel-A02-4-v2', source: require('../../assets/art/stories/A02-04.jpg'), reveal: 'open' },
    { id: 'travel-A02-5-v2', source: require('../../assets/art/stories/A02-05.jpg'), reveal: 'gather' },
    { id: 'travel-A02-closing-v2', source: require('../../assets/art/stories/A02-06.jpg'), reveal: 'settle' },
  ],
  A03: [
    { id: 'kitchen-A03-1-v2', source: require('../../assets/art/stories/A03-01.jpg'), reveal: 'arrive' },
    { id: 'kitchen-A03-2-v2', source: require('../../assets/art/stories/A03-02.jpg'), reveal: 'rise' },
    { id: 'kitchen-A03-3-v2', source: require('../../assets/art/stories/A03-03.jpg'), reveal: 'gather' },
    { id: 'kitchen-A03-4-v2', source: require('../../assets/art/stories/A03-04.jpg'), reveal: 'glow' },
    { id: 'kitchen-A03-5-v2', source: require('../../assets/art/stories/A03-05.jpg'), reveal: 'settle' },
    { id: 'kitchen-A03-closing-v2', source: require('../../assets/art/stories/A03-06.jpg'), reveal: 'settle' },
  ],
  A04: [
    { id: 'travel-A04-1-v2', source: require('../../assets/art/stories/A04-01.jpg'), reveal: 'arrive' },
    { id: 'travel-A04-2-v2', source: require('../../assets/art/stories/A04-02.jpg'), reveal: 'open' },
    { id: 'travel-A04-3-v2', source: require('../../assets/art/stories/A04-03.jpg'), reveal: 'gather' },
    { id: 'travel-A04-4-v2', source: require('../../assets/art/stories/A04-04.jpg'), reveal: 'unfold' },
    { id: 'travel-A04-5-v2', source: require('../../assets/art/stories/A04-05.jpg'), reveal: 'settle' },
    { id: 'travel-A04-closing-v2', source: require('../../assets/art/stories/A04-06.jpg'), reveal: 'settle' },
  ],
  A05: [
    { id: 'kitchen-A05-1-v2', source: require('../../assets/art/stories/A05-01.jpg'), reveal: 'gather' },
    { id: 'kitchen-A05-2-v2', source: require('../../assets/art/stories/A05-02.jpg'), reveal: 'rise' },
    { id: 'kitchen-A05-3-v2', source: require('../../assets/art/stories/A05-03.jpg'), reveal: 'glow' },
    { id: 'kitchen-A05-4-v2', source: require('../../assets/art/stories/A05-04.jpg'), reveal: 'open' },
    { id: 'kitchen-A05-5-v2', source: require('../../assets/art/stories/A05-05.jpg'), reveal: 'gather' },
    { id: 'kitchen-A05-closing-v2', source: require('../../assets/art/stories/A05-06.jpg'), reveal: 'settle' },
  ],
  B01: [
    { id: 'kitchen-B01-1-v2', source: require('../../assets/art/stories/B01-01.jpg'), reveal: 'glow' },
    { id: 'kitchen-B01-2-v2', source: require('../../assets/art/stories/B01-02.jpg'), reveal: 'rise' },
    { id: 'kitchen-B01-3-v2', source: require('../../assets/art/stories/B01-03.jpg'), reveal: 'gather' },
    { id: 'kitchen-B01-4-v2', source: require('../../assets/art/stories/B01-04.jpg'), reveal: 'settle' },
    { id: 'kitchen-B01-5-v2', source: require('../../assets/art/stories/B01-05.jpg'), reveal: 'glow' },
    { id: 'kitchen-B01-closing-v2', source: require('../../assets/art/stories/B01-06.jpg'), reveal: 'settle' },
  ],
  B02: [
    { id: 'window-B02-1-v2', source: require('../../assets/art/stories/B02-01.jpg'), reveal: 'arrive' },
    { id: 'window-B02-2-v2', source: require('../../assets/art/stories/B02-02.jpg'), reveal: 'rise' },
    { id: 'window-B02-3-v2', source: require('../../assets/art/stories/B02-03.jpg'), reveal: 'open' },
    { id: 'window-B02-4-v2', source: require('../../assets/art/stories/B02-04.jpg'), reveal: 'gather' },
    { id: 'window-B02-5-v2', source: require('../../assets/art/stories/B02-05.jpg'), reveal: 'glow' },
    { id: 'window-B02-closing-v2', source: require('../../assets/art/stories/B02-06.jpg'), reveal: 'settle' },
  ],
  B03: [
    { id: 'notebook-B03-1-v2', source: require('../../assets/art/stories/B03-01.jpg'), reveal: 'unfold' },
    { id: 'notebook-B03-2-v2', source: require('../../assets/art/stories/B03-02.jpg'), reveal: 'rise' },
    { id: 'notebook-B03-3-v2', source: require('../../assets/art/stories/B03-03.jpg'), reveal: 'glow' },
    { id: 'notebook-B03-4-v2', source: require('../../assets/art/stories/B03-04.jpg'), reveal: 'open' },
    { id: 'notebook-B03-5-v2', source: require('../../assets/art/stories/B03-05.jpg'), reveal: 'gather' },
    { id: 'notebook-B03-closing-v2', source: require('../../assets/art/stories/B03-06.jpg'), reveal: 'settle' },
  ],
  B04: [
    { id: 'garden-B04-1-v2', source: require('../../assets/art/stories/B04-01.jpg'), reveal: 'arrive' },
    { id: 'garden-B04-2-v2', source: require('../../assets/art/stories/B04-02.jpg'), reveal: 'unfold' },
    { id: 'garden-B04-3-v2', source: require('../../assets/art/stories/B04-03.jpg'), reveal: 'gather' },
    { id: 'garden-B04-4-v2', source: require('../../assets/art/stories/B04-04.jpg'), reveal: 'open' },
    { id: 'garden-B04-5-v2', source: require('../../assets/art/stories/B04-05.jpg'), reveal: 'rise' },
    { id: 'garden-B04-closing-v2', source: require('../../assets/art/stories/B04-06.jpg'), reveal: 'settle' },
  ],
  B05: [
    { id: 'notebook-B05-1-v2', source: require('../../assets/art/stories/B05-01.jpg'), reveal: 'arrive' },
    { id: 'notebook-B05-2-v2', source: require('../../assets/art/stories/B05-02.jpg'), reveal: 'gather' },
    { id: 'notebook-B05-3-v2', source: require('../../assets/art/stories/B05-03.jpg'), reveal: 'open' },
    { id: 'notebook-B05-4-v2', source: require('../../assets/art/stories/B05-04.jpg'), reveal: 'glow' },
    { id: 'notebook-B05-5-v2', source: require('../../assets/art/stories/B05-05.jpg'), reveal: 'unfold' },
    { id: 'notebook-B05-closing-v2', source: require('../../assets/art/stories/B05-06.jpg'), reveal: 'settle' },
  ],
  C01: [
    { id: 'garden-C01-1-v2', source: require('../../assets/art/stories/C01-01.jpg'), reveal: 'arrive' },
    { id: 'garden-C01-2-v2', source: require('../../assets/art/stories/C01-02.jpg'), reveal: 'unfold' },
    { id: 'garden-C01-3-v2', source: require('../../assets/art/stories/C01-03.jpg'), reveal: 'open' },
    { id: 'garden-C01-4-v2', source: require('../../assets/art/stories/C01-04.jpg'), reveal: 'glow' },
    { id: 'garden-C01-5-v2', source: require('../../assets/art/stories/C01-05.jpg'), reveal: 'gather' },
    { id: 'garden-C01-closing-v2', source: require('../../assets/art/stories/C01-06.jpg'), reveal: 'settle' },
  ],
  C02: [
    { id: 'window-C02-1-v2', source: require('../../assets/art/stories/C02-01.jpg'), reveal: 'open' },
    { id: 'window-C02-2-v2', source: require('../../assets/art/stories/C02-02.jpg'), reveal: 'unfold' },
    { id: 'window-C02-3-v2', source: require('../../assets/art/stories/C02-03.jpg'), reveal: 'glow' },
    { id: 'window-C02-4-v2', source: require('../../assets/art/stories/C02-04.jpg'), reveal: 'settle' },
    { id: 'window-C02-5-v2', source: require('../../assets/art/stories/C02-05.jpg'), reveal: 'rise' },
    { id: 'window-C02-closing-v2', source: require('../../assets/art/stories/C02-06.jpg'), reveal: 'settle' },
  ],
  C03: [
    { id: 'garden-C03-1-v2', source: require('../../assets/art/stories/C03-01.jpg'), reveal: 'arrive' },
    { id: 'garden-C03-2-v2', source: require('../../assets/art/stories/C03-02.jpg'), reveal: 'glow' },
    { id: 'garden-C03-3-v2', source: require('../../assets/art/stories/C03-03.jpg'), reveal: 'gather' },
    { id: 'garden-C03-4-v2', source: require('../../assets/art/stories/C03-04.jpg'), reveal: 'open' },
    { id: 'garden-C03-5-v2', source: require('../../assets/art/stories/C03-05.jpg'), reveal: 'rise' },
    { id: 'garden-C03-closing-v2', source: require('../../assets/art/stories/C03-06.jpg'), reveal: 'settle' },
  ],
  C04: [
    { id: 'travel-C04-1-v2', source: require('../../assets/art/stories/C04-01.jpg'), reveal: 'unfold' },
    { id: 'travel-C04-2-v2', source: require('../../assets/art/stories/C04-02.jpg'), reveal: 'open' },
    { id: 'travel-C04-3-v2', source: require('../../assets/art/stories/C04-03.jpg'), reveal: 'gather' },
    { id: 'travel-C04-4-v2', source: require('../../assets/art/stories/C04-04.jpg'), reveal: 'glow' },
    { id: 'travel-C04-5-v2', source: require('../../assets/art/stories/C04-05.jpg'), reveal: 'rise' },
    { id: 'travel-C04-closing-v2', source: require('../../assets/art/stories/C04-06.jpg'), reveal: 'settle' },
  ],
  C05: [
    { id: 'window-C05-1-v2', source: require('../../assets/art/stories/C05-01.jpg'), reveal: 'glow' },
    { id: 'window-C05-2-v2', source: require('../../assets/art/stories/C05-02.jpg'), reveal: 'rise' },
    { id: 'window-C05-3-v2', source: require('../../assets/art/stories/C05-03.jpg'), reveal: 'open' },
    { id: 'window-C05-4-v2', source: require('../../assets/art/stories/C05-04.jpg'), reveal: 'gather' },
    { id: 'window-C05-5-v2', source: require('../../assets/art/stories/C05-05.jpg'), reveal: 'glow' },
    { id: 'window-C05-closing-v2', source: require('../../assets/art/stories/C05-06.jpg'), reveal: 'settle' },
  ],
};

/** A legacy or unknown chapter keeps its family fallback rather than showing an unrelated revision. */
export function getStoryFrame(topic: Topic, position: number): StoryFrame | undefined {
  if (topic.version !== '1.1' || !Number.isInteger(position) || position < 0 || position > 5) return undefined;
  const frame = storyFrames[topic.id]?.[position];
  return position === 5 || frame?.id === topic.prompts[position]?.sceneState ? frame : undefined;
}
