import React, { useMemo, useState } from 'react';
import { Animated, Easing, Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, G, Image as SvgImage, Mask, RadialGradient, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { ArtFamily } from '../content/types';
import { useDesign } from './ThemeProvider';
import { radius, shadow } from './tokens';
import { Icon } from './Icon';

/** Bundled watercolor scenes (owner-approved design canvas art). Flat images, not layered production assets. */
export const artSources: Record<ArtFamily | 'closing-cafe', ImageSourcePropType> = {
  cafe: require('../../assets/art/cafe.jpg'),
  kitchen: require('../../assets/art/kitchen.jpg'),
  window: require('../../assets/art/window.jpg'),
  travel: require('../../assets/art/travel.jpg'),
  notebook: require('../../assets/art/notebook.jpg'),
  garden: require('../../assets/art/garden.jpg'),
  'closing-cafe': require('../../assets/art/closing-cafe.jpg'),
};

/** Where the crop sits inside the painting: an authored chapter state (handoff §48–51), never driven by speech. */
export type ArtFocus = 'center' | 'top-left' | 'right' | 'bottom' | 'left' | 'top';
const aspect: Record<ArtFocus, string> = {
  center: 'xMidYMid slice', 'top-left': 'xMinYMin slice', right: 'xMaxYMid slice', bottom: 'xMidYMax slice', left: 'xMinYMid slice', top: 'xMidYMin slice',
};
/** Chapter → crop. Prompts 1–5 then the closing; rapid navigation always resolves to the mapped state. */
export const chapterFocus: readonly ArtFocus[] = ['top-left', 'center', 'right', 'left', 'bottom', 'bottom'];

let featherId = 0;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** A watercolour arrival: the painting spreads from soft blots of pigment, like paint taking on wet paper. */
export type PaintBloom = { progress: Animated.Value; seed: string };

/** Small deterministic PRNG so each painting always blooms the same way (no Math.random in render). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

type Blot = { x: number; y: number; r: number; start: number; end: number };
function paintBlots(seed: string, width: number, height: number): Blot[] {
  const rand = seeded(seed);
  const span = Math.max(width, height);
  // One blot lands first near the painting's heart; the rest follow across the paper, overlapping as they spread.
  const blots: Blot[] = [{ x: width * (0.38 + rand() * 0.24), y: height * (0.35 + rand() * 0.25), r: span * 0.62, start: 0, end: 0.72 }];
  for (let i = 0; i < 8; i++) {
    const start = 0.06 + rand() * 0.34;
    blots.push({ x: width * (0.06 + rand() * 0.88), y: height * (0.08 + rand() * 0.84), r: span * (0.2 + rand() * 0.24), start, end: Math.min(1, start + 0.42 + rand() * 0.2) });
  }
  return blots;
}

/** Mask contents for a bloom: feathered blots that grow, then a final wash so nothing is left unpainted. */
function BloomMask({ id, bloom, width, height }: { id: string; bloom: PaintBloom; width: number; height: number }) {
  const blots = useMemo(() => paintBlots(bloom.seed, width, height), [bloom.seed, width, height]);
  const ease = Easing.out(Easing.quad);
  return <>
    <RadialGradient id={`${id}pg`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <Stop offset="0" stopColor="#fff" stopOpacity="1" />
      <Stop offset="0.55" stopColor="#fff" stopOpacity="0.9" />
      <Stop offset="0.8" stopColor="#fff" stopOpacity="0.35" />
      <Stop offset="1" stopColor="#fff" stopOpacity="0" />
    </RadialGradient>
    <Mask id={`${id}pm`} x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
      {blots.map((b, i) => <AnimatedCircle key={i} cx={b.x} cy={b.y} fill={`url(#${id}pg)`}
        r={bloom.progress.interpolate({ inputRange: [0, b.start, b.end, 1], outputRange: [0.01, 0.01, b.r, b.r], easing: ease, extrapolate: 'clamp' })} />)}
      <AnimatedRect x="0" y="0" width={width} height={height} fill="#fff"
        opacity={bloom.progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' })} />
    </Mask>
  </>;
}

/**
 * DS10 hero scene: the painting feathers into the page with no box ("painted edges").
 * Decorative: hidden from screen readers. Bleeds to the screen edges (pass the page inset).
 */
export function FeatheredArt({ source, height, focus = 'center', bleed = 24, width: fixedWidth, fit = 'cover', softEdges = false, eyebrowFade = false, bloom }: { source: ImageSourcePropType; height: number; focus?: ArtFocus; bleed?: number; width?: number; fit?: 'cover' | 'contain'; softEdges?: boolean; eyebrowFade?: boolean; bloom?: PaintBloom }) {
  const [measured, setWidth] = useState(0);
  const width = fixedWidth ?? measured;
  const [id] = useState(() => `feather${featherId++}`);
  // Chapter paintings reach almost to the screen edge; the broad eyebrow fade stays vertical.
  const radialWidth = width * (eyebrowFade ? 0.9 : 0.74);
  const k = width > 0 ? (height * 0.8) / radialWidth : 1;
  const sideFade = eyebrowFade ? 0.025 : 0.12;
  const overscan = eyebrowFade ? 0.025 : 0;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden pointerEvents="none"
    style={fixedWidth ? { height, width: fixedWidth, alignSelf: 'center' } : { height, marginHorizontal: -bleed }} onLayout={fixedWidth ? undefined : e => setWidth(e.nativeEvent.layout.width)}>
    {width > 0 ? <Svg width={width} height={height}>
      <Defs>
        {/* Design mask: radial-gradient(ellipse 74% 80% at 50% 50%, #000 56%, transparent 100%) — the painting stays
            nearly rectangular and only its edges and corners dissolve. A circle drawn in a vertically scaled group gives
            the ellipse; rx/ry percentages and gradientTransform are not honoured on every renderer. */}
        <RadialGradient id={`${id}g`} gradientUnits="userSpaceOnUse" cx={width / 2} cy={height / 2 / k} r={radialWidth} fx={width / 2} fy={height / 2 / k}>
          <Stop offset="0.56" stopColor="#fff" stopOpacity="1" />
          <Stop offset="1" stopColor="#fff" stopOpacity="0" />
        </RadialGradient>
        <Mask id={`${id}m`} x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
          <G transform={`scale(1 ${k})`}><Rect x="0" y="0" width={width} height={height / k} fill={`url(#${id}g)`} /></G>
        </Mask>
        {softEdges ? <>
          <LinearGradient id={`${id}h`} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#fff" stopOpacity="0" /><Stop offset={sideFade} stopColor="#fff" stopOpacity="1" />
            <Stop offset={1 - sideFade} stopColor="#fff" stopOpacity="1" /><Stop offset="1" stopColor="#fff" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${id}v`} x1="0%" y1="0%" x2="0%" y2="100%">
            {(eyebrowFade
              ? [[0, 0], [0.08, 1], [0.38, 1], [0.64, 0.68], [0.84, 0.2], [1, 0]]
              : [[0, 0], [0.12, 1], [0.88, 1], [1, 0]]
            ).map(([offset, opacity]) => <Stop key={offset} offset={offset} stopColor="#fff" stopOpacity={opacity} />)}
          </LinearGradient>
          <Mask id={`${id}hm`}><Rect width={width} height={height} fill={`url(#${id}h)`} /></Mask>
          <Mask id={`${id}vm`}><Rect width={width} height={height} fill={`url(#${id}v)`} /></Mask>
        </> : null}
        {bloom ? <BloomMask id={id} bloom={bloom} width={width} height={height} /> : null}
      </Defs>
      <G mask={bloom ? `url(#${id}pm)` : undefined}>
      <G mask={softEdges ? `url(#${id}hm)` : undefined}><G mask={softEdges ? `url(#${id}vm)` : undefined}>
      <SvgImage href={source} x={-width * overscan} y={-height * overscan} width={width * (1 + 2 * overscan)} height={height * (1 + 2 * overscan)} preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : aspect[focus]} mask={`url(#${id}m)`} />
      </G></G>
      </G>
    </Svg> : null}
  </View>;
}

/**
 * Feathered art that keeps a warm-paper ground in dark mode ("Dark mode keeps art on its own warm paper").
 * Full-bleed by default; `width` gives a centred vignette (empty states: 220×180, 260×220).
 */
export function SceneArt({ family, height, focus, source, width, fit, softEdges, eyebrowFade, bloom }: { family: ArtFamily; height: number; focus?: ArtFocus; source?: ImageSourcePropType; width?: number; fit?: 'cover' | 'contain'; softEdges?: boolean; eyebrowFade?: boolean; bloom?: PaintBloom }) {
  const { scheme, palette } = useDesign();
  const art = <FeatheredArt source={source ?? artSources[family]} height={height} focus={focus} width={width} fit={fit} softEdges={softEdges} eyebrowFade={eyebrowFade} bloom={bloom} />;
  // The chapter image already carries warm paper. Fade that paper into the canvas too,
  // rather than leaving a rectangular dark-mode backing at the eyebrow.
  if (scheme === 'light' || eyebrowFade) return art;
  if (width) return <View style={{ alignSelf: 'center', backgroundColor: palette.paper, borderRadius: radius.group }}>{art}</View>;
  return <View style={{ marginHorizontal: -24, backgroundColor: palette.paper }}><View style={{ marginHorizontal: 24 }}>{art}</View></View>;
}

/**
 * Small cropped art with a 10–12 pt corner (catalogue crop, Moment thumbs, resume card).
 * `lifted` adds the one shadow — only Tonight's theme entrances float in the design.
 */
export function ArtTile({ family, size, height, rounded = radius.art, missing = false, lifted = false }: { family?: ArtFamily; size: number; height?: number; rounded?: number; missing?: boolean; lifted?: boolean }) {
  const { palette, scheme } = useDesign();
  const h = height ?? size;
  if (missing || !family) {
    return <View accessible={false} style={{ width: size, height: h, borderRadius: rounded, backgroundColor: palette.warm, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="book" color={palette.secondary} size={22} />
    </View>;
  }
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[{ width: size, height: h, borderRadius: rounded, backgroundColor: palette.paper }, lifted && shadow(scheme)]}>
    <Image source={artSources[family]} accessible={false} resizeMode="cover" style={{ width: size, height: h, borderRadius: rounded }} />
  </View>;
}
