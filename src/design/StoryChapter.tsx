import React, { useState } from 'react';
import { Animated, View } from 'react-native';
import type { Topic } from '../content/types';
import { StoryArt } from './StoryArt';
import { Eyebrow } from './primitives';
import { spacing } from './tokens';

/**
 * DS10/11: the painting dissolves upward from the chapter eyebrow's actual top edge.
 * Artwork is absolute so its adaptive height cannot move text or create a layout feedback loop.
 * Native text stays in normal flow and the anchor follows large type, nudges and shorter screens.
 */
export function StoryChapter({ topic, position, eyebrow, opacity, artHeight = 208, still = false, children }: React.PropsWithChildren<{
  topic: Topic; position: number; eyebrow: string; opacity?: Animated.Value; artHeight?: number; still?: boolean;
}>) {
  const [bodyTop, setBodyTop] = useState(artHeight + spacing.group);
  const [eyebrowTop, setEyebrowTop] = useState<number>(spacing.group);
  const paintingHeight = Math.ceil(Math.max(artHeight, bodyTop + eyebrowTop));
  return <View style={{ flexGrow: 1, marginTop: spacing.sm }}>
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <StoryArt topic={topic} position={position} height={paintingHeight} still={still} eyebrowFade />
    </View>
    <View pointerEvents="none" style={{ height: artHeight + spacing.group }} />
    <Animated.View onLayout={event => setBodyTop(event.nativeEvent.layout.y)}
      style={{ flexGrow: 1, justifyContent: 'center', gap: spacing.page, paddingVertical: spacing.group, opacity }}>
      <View onLayout={event => setEyebrowTop(event.nativeEvent.layout.y)}>
        <Eyebrow framed>{eyebrow}</Eyebrow>
      </View>
      {children}
    </Animated.View>
  </View>;
}
