import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { getStoryFrame, type StoryFrame, type StoryReveal } from '../content/storyArt';
import type { Topic } from '../content/types';
import { chapterFocus, SceneArt } from './Art';
import { useDesign } from './ThemeProvider';
import { motion } from './tokens';

/** Small, finite gestures: pigment appears, then the painting rests while the couple talks. */
export const storyReveals: Readonly<Record<StoryReveal, { x: number; y: number; fromOpacity: number; duration: number }>> = {
  arrive: { x: 5, y: 0, fromOpacity: 0.18, duration: motion.entry },
  unfold: { x: -4, y: 2, fromOpacity: 0.12, duration: motion.chapter },
  glow: { x: 0, y: 0, fromOpacity: 0.08, duration: motion.chapter },
  gather: { x: 3, y: 3, fromOpacity: 0.2, duration: motion.chapter },
  settle: { x: 0, y: -3, fromOpacity: 0.25, duration: motion.chapter },
  rise: { x: 0, y: 5, fromOpacity: 0.16, duration: motion.chapter },
  open: { x: -5, y: 0, fromOpacity: 0.14, duration: motion.chapter },
};

function PaintedFrame({ frame, topic, height, still, eyebrowFade, under, progress, onSettled }: {
  frame: StoryFrame; topic: Topic; height: number; still: boolean; eyebrowFade: boolean;
  /** The incoming painting's bloom; the layer beneath fades with it instead of disappearing at the end. */
  under?: Animated.Value; progress: Animated.Value; onSettled?: (id: string) => void;
}) {
  const reveal = storyReveals[frame.reveal];
  useEffect(() => {
    if (under) return; // the layer beneath never animates itself
    progress.stopAnimation();
    if (still) { progress.setValue(1); return; }
    progress.setValue(0);
    // JS driver: the bloom animates SVG mask geometry, which the native driver cannot reach.
    const animation = Animated.timing(progress, { toValue: 1, duration: motion.bloom, easing: Easing.inOut(Easing.sin), useNativeDriver: false, isInteraction: false });
    animation.start(({ finished }) => { if (finished) onSettled?.(frame.id); });
    return () => animation.stop();
  }, [progress, reveal, still, frame.id, onSettled, under]);

  return <Animated.View testID={`story-art-${under ? 'under-' : ''}${frame.id}`} style={{
    ...(under ? { position: 'absolute' as const, top: 0, left: 0, right: 0 } : null),
    // Both paintings have feathered edges, so the old one shows through the new one's edges during the bloom.
    // It eases out over the second half (in step with the final wash) so nothing is removed abruptly at the end.
    opacity: under ? under.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1, 0], easing: Easing.inOut(Easing.sin), extrapolate: 'clamp' }) : 1,
    // The authored gesture drifts slowly while the pigment spreads, then the painting rests.
    transform: still || under ? [] : [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [reveal.x, 0] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reveal.y, 0] }) },
    ],
  }}>
    <SceneArt family={topic.artFamily} source={frame.source} height={height} softEdges eyebrowFade={eyebrowFade}
      bloom={still || under ? undefined : { progress, seed: frame.id }} />
  </Animated.View>;
}

/**
 * DS10 authored chapter illustration. State comes only from topic/version/position.
 * Between prompts the previous painting stays put while the next one blooms over it like wet watercolour;
 * once the new one has fully taken, the old layer is dropped. At most two paintings are ever mounted, and a
 * new keyed frame cancels the previous animation even under rapid Next/Previous/Skip.
 * Native text and actions stay outside this decorative, non-interactive scene.
 */
export function StoryArt({ topic, position, height = 208, still = false, eyebrowFade = false }: { topic: Topic; position: number; height?: number; still?: boolean; eyebrowFade?: boolean }) {
  const { reduceMotion } = useDesign();
  const frame = getStoryFrame(topic, position);
  const quiet = still || reduceMotion;
  const [shown, setShown] = useState<StoryFrame | undefined>(frame);
  const [under, setUnder] = useState<StoryFrame | null>(null);
  if (frame?.id !== shown?.id) {
    // Derived during render so the old painting never leaves a frame-long gap.
    setUnder(quiet ? null : shown ?? null);
    setShown(frame);
  }
  // One bloom value per arriving painting, shared with the layer it covers.
  const progress = useMemo(() => new Animated.Value(quiet ? 1 : 0), [frame?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const settled = useCallback((id: string) => { if (id === frame?.id) setUnder(null); }, [frame?.id]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ height }}>
    {frame && under && !quiet ? <PaintedFrame key={`under-${under.id}`} frame={under} topic={topic} height={height} still eyebrowFade={eyebrowFade} under={progress} progress={progress} /> : null}
    {frame
      ? <PaintedFrame key={frame.id} frame={frame} topic={topic} height={height} still={quiet} eyebrowFade={eyebrowFade} progress={progress} onSettled={settled} />
      : <SceneArt family={topic.artFamily} height={height} focus={chapterFocus[Math.max(0, Math.min(position, 5))]} softEdges={eyebrowFade} eyebrowFade={eyebrowFade} />}
  </View>;
}
