import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { TextBlock } from './primitives';
import { useDesign } from './ThemeProvider';
import { typewriter as tw, type TextVariant } from './tokens';

type Props = {
  text: string;
  variant?: TextVariant;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  /** Called once the last character has been struck (or immediately with Reduced Motion). */
  onDone?: () => void;
};

/** Mixes two #RRGGBB colours; t = 0 → a, t = 1 → b. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Pause after striking `ch`: a human, slightly uneven rhythm that breathes at punctuation. */
function pauseAfter(ch: string, next: string | undefined): number {
  const jitter = (Math.random() * 2 - 1) * tw.jitter;
  let ms = tw.stroke + jitter;
  if (ch === ' ') ms += tw.space;
  else if (',;:—–'.includes(ch)) ms += tw.comma;
  else if ('.?!…'.includes(ch) && next !== undefined && !'.?!…'.includes(next)) ms += tw.stop;
  return Math.max(12, ms);
}

/**
 * A question struck onto the page like an old typewriter. The full text is laid out from the first
 * frame (untyped characters are transparent), so line breaks and height never shift while typing.
 * The newest strokes land in terracotta ink and settle into the text colour over the next few keys.
 * Tap to reveal at once. Reduced Motion shows the text immediately. Screen readers get the full text.
 */
export function Typewriter({ text, variant = 'prompt', center, style, onDone }: Props) {
  const { palette, reduceMotion } = useDesign();
  const chars = useMemo(() => Array.from(text), [text]);
  // `clock` keeps ticking for `inkTail` strokes after the last character so the final letters dry too.
  const end = chars.length + tw.inkTail;
  const [clock, setClock] = useState(reduceMotion ? end : 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (reduceMotion) { setClock(end); done.current?.(); return; }
    setClock(0);
    let i = 0;
    const strike = () => {
      i += 1;
      setClock(i);
      if (i === chars.length) done.current?.();
      if (i >= end) { timer.current = null; return; }
      timer.current = setTimeout(strike, i < chars.length ? pauseAfter(chars[i - 1], chars[i]) : tw.stroke * 2);
    };
    timer.current = setTimeout(strike, tw.lead);
    return () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  }, [chars, end, reduceMotion]);

  const count = Math.min(clock, chars.length);
  const typing = count < chars.length;
  const finish = () => {
    if (!typing) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setClock(end);
    done.current?.();
  };

  // Settled ink, then the strokes still drying (oldest → newest), then the untyped remainder.
  const dryFrom = Math.max(0, clock - tw.inkTail);
  const settled = chars.slice(0, Math.min(dryFrom, count)).join('');
  const tailStart = Math.min(dryFrom, count);
  const tail = chars.slice(tailStart, count);
  const rest = chars.slice(count).join('');

  return <TextBlock variant={variant} center={center} style={style}
    accessibilityLabel={text} onPress={typing ? finish : undefined} suppressHighlighting>
    {settled}
    {tail.map((ch, k) => {
      const index = tailStart + k;
      const age = clock - 1 - index; // 0 = just struck
      return <Text key={index} style={{ color: mix(palette.accent, palette.text, Math.min(1, age / (tw.inkTail - 1))) }}>{ch}</Text>;
    })}
    {rest ? <Text style={{ color: 'transparent' }}>{rest}</Text> : null}
  </TextBlock>;
}
