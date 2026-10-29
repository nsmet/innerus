import React from 'react';
import { Pressable, View } from 'react-native';
import type { ArtFamily, Topic } from '../content/types';
import { ArtTile } from './Art';
import { Icon, type IconName } from './Icon';
import { Button, TextBlock } from './primitives';
import { useDesign } from './ThemeProvider';
import { radius, shadow, spacing } from './tokens';

/**
 * Premium-state patterns (D28). Pure UI: screens pass the state and the actions; nothing here
 * reads the store, starts a purchase or counts days.
 *
 * The visual language: the free week is a row of seven painted dots (terracotta for days lived,
 * ink for today, an open ring for days still to come). Ownership is quiet — a check and "Yours",
 * never a badge, crown or gradient (handoff §45: no glossy, no shiny glass).
 */

export type CollectionAccess = 'trial' | 'owned' | null;

type T = (v: { en: string; nl: string }) => string;

/** Words for a topic's access, used by rows, the topic detail and Tonight. */
export function accessText(topic: Topic, unlocked: CollectionAccess, t: T) {
  if (topic.access === 'free') return t({ en: 'Free', nl: 'Gratis' });
  if (unlocked === 'owned') return t({ en: 'In your collection', nl: 'In jouw collectie' });
  if (unlocked === 'trial') return t({ en: 'Free this week', nl: 'Deze week gratis' });
  return t({ en: 'Collection', nl: 'Collectie' });
}
export function accessIcon(topic: Topic, unlocked: CollectionAccess): IconName {
  if (topic.access === 'free' || unlocked === 'owned') return 'check';
  return unlocked === 'trial' ? 'clock' : 'lock';
}

/** Access label: text + symbol, never colour alone. */
export function AccessTag({ topic, unlocked }: { topic: Topic; unlocked: CollectionAccess }) {
  const { palette, t } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Icon name={accessIcon(topic, unlocked)} color={palette.text} size={14} />
    <TextBlock variant="supporting" style={{ fontWeight: '600' }}>{accessText(topic, unlocked, t)}</TextBlock>
  </View>;
}

export const daysLeftText = (days: number, t: T) => days === 1
  ? t({ en: 'Last day of your free week', nl: 'Laatste dag van je gratis week' })
  : t({ en: `${days} days left in your free week`, nl: `Nog ${days} dagen in je gratis week` });

/** Seven dots, one per day of the free week. `day` = today (1–7); 8 = ended; 0 = not started. */
export function TrialMeter({ day, total = 7, size = 10 }: { day: number; total?: number; size?: number }) {
  const { palette, t } = useDesign();
  const label = day <= 0 ? t({ en: 'Free week not started', nl: 'Gratis week niet gestart' })
    : day > total ? t({ en: 'Free week ended', nl: 'Gratis week voorbij' })
    : t({ en: `Day ${day} of ${total}`, nl: `Dag ${day} van ${total}` });
  return <View accessible accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.55 }}>
    {Array.from({ length: total }, (_, i) => {
      const n = i + 1;
      const lived = n < day;
      const today = n === day;
      return <View key={n} style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: lived ? palette.accent : today ? palette.text : 'transparent',
        borderWidth: lived || today ? 0 : 1.25, borderColor: palette.outline, opacity: lived ? 0.85 : 1,
      }} />;
    })}
  </View>;
}

/** Tonight header: a small, tappable reminder of the free week. */
export function TrialPill({ day, daysLeft, onPress }: { day: number; daysLeft: number; onPress: () => void }) {
  const { palette, t } = useDesign();
  const text = daysLeft === 1 ? t({ en: 'Last free day', nl: 'Laatste gratis dag' }) : t({ en: `${daysLeft} days left`, nl: `Nog ${daysLeft} dagen` });
  return <Pressable accessibilityRole="button" accessibilityLabel={`${daysLeftText(daysLeft, t)}. ${t({ en: 'See the full collection', nl: 'Bekijk de volledige collectie' })}`} onPress={onPress} hitSlop={6}
    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: palette.divider, backgroundColor: palette.raised, opacity: pressed ? 0.7 : 1 })}>
    <TrialMeter day={day} size={6} />
    <TextBlock variant="supporting" style={{ fontWeight: '600' }}>{text}</TextBlock>
  </Pressable>;
}

export type AccessCardState =
  | { kind: 'new' }
  | { kind: 'trial'; day: number; daysLeft: number; endsLabel: string }
  | { kind: 'ended' }
  | { kind: 'owned'; legacy?: boolean };

/**
 * The one card that tells the person where they stand. Tonight shows it for new / last days / ended;
 * Settings shows it in every state, so there is always one honest place to look.
 */
export function AccessCard({ state, onAction, art = 'garden', freeCount, totalCount }: {
  state: AccessCardState; onAction?: () => void; art?: ArtFamily; freeCount: number; totalCount: number;
}) {
  const { palette, scheme, t } = useDesign();
  const copy = (() => {
    switch (state.kind) {
      case 'new': return {
        eyebrow: t({ en: 'Your first week', nl: 'Je eerste week' }),
        title: t({ en: `All ${totalCount} conversations, free for 7 days`, nl: `Alle ${totalCount} gesprekken, 7 dagen gratis` }),
        detail: t({ en: 'No subscription. Nothing is charged when the week ends.', nl: 'Geen abonnement. Er wordt niets aangerekend als de week voorbij is.' }),
        action: t({ en: 'Start your free week', nl: 'Start je gratis week' }),
      };
      case 'trial': return {
        eyebrow: t({ en: 'Your free week', nl: 'Je gratis week' }),
        title: daysLeftText(state.daysLeft, t),
        detail: t({ en: `Everything is open until ${state.endsLabel}. One payment keeps it that way.`, nl: `Alles staat open tot ${state.endsLabel}. Met één betaling blijft dat zo.` }),
        action: t({ en: 'Keep every conversation', nl: 'Hou alle gesprekken' }),
      };
      case 'ended': return {
        eyebrow: t({ en: 'Your free week has ended', nl: 'Je gratis week is voorbij' }),
        title: t({ en: `${freeCount} conversations stay free`, nl: `${freeCount} gesprekken blijven gratis` }),
        detail: t({ en: `One payment opens all ${totalCount} again, for good. No subscription.`, nl: `Met één betaling staan alle ${totalCount} weer open, voor altijd. Geen abonnement.` }),
        action: t({ en: 'Keep every conversation', nl: 'Hou alle gesprekken' }),
      };
      case 'owned': return {
        eyebrow: t({ en: 'The full collection', nl: 'De volledige collectie' }),
        title: state.legacy ? t({ en: 'Yours, from the earlier InnerUs', nl: 'Van jou, uit de vorige InnerUs' }) : t({ en: 'Every conversation is yours', nl: 'Elk gesprek is van jou' }),
        detail: state.legacy
          ? t({ en: 'Thank you for supporting the earlier InnerUs. The full collection is yours for good, at no extra cost.', nl: 'Bedankt om de vorige InnerUs te steunen. De volledige collectie is voor altijd van jou, zonder extra kosten.' })
          : t({ en: 'Bought once. Nothing renews.', nl: 'Eenmalig gekocht. Er wordt niets verlengd.' }),
        action: undefined,
      };
    }
  })();
  return <View style={[{ backgroundColor: palette.raised, borderRadius: radius.group, borderWidth: 1, borderColor: palette.divider, padding: spacing.group, gap: spacing.md }, state.kind !== 'owned' && shadow(scheme)]}>
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      <ArtTile family={art} size={56} height={64} rounded={8} />
      <View style={{ flex: 1, gap: 4 }}>
        <TextBlock variant="eyebrow" secondary>{copy.eyebrow}</TextBlock>
        <TextBlock variant="rowTitle">{copy.title}</TextBlock>
      </View>
      {state.kind === 'owned' ? <Icon name="check" color={palette.text} /> : null}
    </View>
    {state.kind === 'trial' ? <TrialMeter day={state.day} /> : state.kind === 'ended' ? <TrialMeter day={8} /> : null}
    <TextBlock variant="meta" secondary>{copy.detail}</TextBlock>
    {copy.action && onAction ? <Button variant={state.kind === 'trial' && state.daysLeft > 2 ? 'secondary' : 'primary'} label={copy.action} onPress={onAction} /> : null}
  </View>;
}

export type TimelineStep = { label: string; text: string; marker: 'today' | 'end' | 'after' };

/**
 * The free-week timeline on the offer (App Review 3.1.1: before the trial starts, say how long it lasts,
 * what closes when it ends and what it would cost to keep). Three steps side by side, painted dots on a hairline.
 */
export function TrialTimeline({ steps }: { steps: TimelineStep[] }) {
  const { palette } = useDesign();
  return <View accessibilityRole="list" style={{ flexDirection: 'row', gap: spacing.sm }}>
    {steps.map((step, i) => {
      const last = i === steps.length - 1;
      const dot = step.marker === 'today' ? palette.text : step.marker === 'end' ? palette.accent : 'transparent';
      return <View key={step.label} accessible accessibilityLabel={`${step.label}. ${step.text}`} style={{ flex: 1, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: last ? 0 : -spacing.sm }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot, borderWidth: step.marker === 'after' ? 1.25 : 0, borderColor: palette.outline }} />
          {!last ? <View style={{ flex: 1, height: 1, backgroundColor: palette.divider, marginLeft: 6 }} /> : null}
        </View>
        <View style={{ gap: 2, paddingRight: spacing.xs }}>
          <TextBlock variant="supporting" style={{ fontWeight: '600' }}>{step.label}</TextBlock>
          <TextBlock variant="supporting" secondary>{step.text}</TextBlock>
        </View>
      </View>;
    })}
  </View>;
}
