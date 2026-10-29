import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, View, type ImageSourcePropType } from 'react-native';
import { themes, topics } from '../content/catalogue';
import type { Language } from '../content/types';
import { ArtTile, artSources } from '../design/Art';
import { TrialMeter, TrialTimeline, daysLeftText } from '../design/access';
import { Icon, type IconName } from '../design/Icon';
import { Button, Eyebrow, IconButton, Screen, StatusLine, TextBlock } from '../design/primitives';
import { OfferPalette, useDesign } from '../design/ThemeProvider';
import { radius, spacing, typography } from '../design/tokens';
import type { StackProps } from '../navigation/types';
import { TRIAL_DAYS, formatTrialEnd, storeName, useAccess } from '../platform/access';

/**
 * UI11 the offer (D28, layout D29). Its own evening-plum surface so it reads as a distinct moment.
 * One screen, four honest states, built to fit without scrolling on a standard phone:
 *   new    — the free week, explained before it starts (App Review 3.1.1), and the price to keep it
 *   trial  — days left and what one payment keeps
 *   ended  — the week is over; what stays free; the price; an easy way to carry on for free
 *   owned  — "It's yours."
 * Structure: framed painting · eyebrow · title · one line · one state block · three theme tiles · one button.
 * Prices always come from the store. Cancel, pending and failure keep the person's place (spec 38, AC26).
 */
type Status = { icon: IconName; text: string; tone?: 'secondary' | 'text' | 'destructive' };
type StatusKey = 'pending' | 'failed' | 'earlier' | 'restored' | 'trialRestored' | 'nothing' | 'unreachable' | 'trialUsed';

function joinTitles(titles: string[], language: Language) {
  if (titles.length < 2) return titles.join('');
  return `${titles.slice(0, -1).join(', ')} ${language === 'nl' ? 'en' : 'and'} ${titles[titles.length - 1]}`;
}

const DAY = 86_400_000;
const shortDate = (at: number, language: Language) =>
  new Date(at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function PaywallScreen(props: StackProps<'Paywall'>) {
  return <OfferPalette><Offer {...props} /></OfferPalette>;
}

function Offer({ navigation, route }: StackProps<'Paywall'>) {
  const { palette, t, language } = useDesign();
  const { access, offer, loadOffer, startTrial, buy, restore } = useAccess();
  const [busy, setBusy] = useState<'trial' | 'buy' | 'restore' | null>(null);
  const [statusKey, setStatusKey] = useState<StatusKey | null>(null);
  const [showAll, setShowAll] = useState(false);
  const alive = useRef(true);
  const topicId = route.params?.topicId;

  useEffect(() => {
    alive.current = true;
    loadOffer();
    return () => { alive.current = false; };
  }, [loadOffer]);

  // A pending purchase (Ask to Buy) can be approved while this screen is open.
  useEffect(() => {
    if (access.state === 'owned') setStatusKey(key => (key === 'pending' || key === 'failed' ? null : key));
  }, [access.state]);

  /** Success returns to the chosen topic (spec 38), which now opens; without one, back to where the person was. */
  const returnToTopic = useCallback(() => {
    const state = navigation.getState();
    const previous = state.routes[state.index - 1];
    const cameFromTopic = previous?.name === 'Topic' && (previous.params as { topicId?: string } | undefined)?.topicId === topicId;
    if (topicId && !cameFromTopic) navigation.replace('Topic', { topicId });
    else navigation.goBack();
  }, [navigation, topicId]);

  const paid = topics.filter(topic => topic.access === 'collection');
  const freeTitles = topics.filter(topic => topic.access === 'free').map(topic => topic.title[language]);
  const total = topics.length;
  const freeCount = freeTitles.length;
  const account = Platform.OS === 'ios' ? t({ en: 'Apple Account', nl: 'Apple-account' }) : t({ en: 'Google account', nl: 'Google-account' });

  const collection = offer.collection;
  const priceReady = collection !== 'loading' && collection.status === 'ready';
  const price = priceReady ? collection.displayPrice : null;
  // iOS needs the €0 trial item from the store; Android counts the week on the device.
  const trialReady = Platform.OS !== 'ios' || (offer.trial !== 'loading' && offer.trial.status === 'ready');

  const messages = {
    pending: { icon: 'clock', text: t({ en: `Your purchase is pending. The ${freeCount} free conversations remain available.`, nl: `Je aankoop is in behandeling. De ${freeCount} gratis gesprekken blijven beschikbaar.` }) },
    failed: { icon: 'warning', text: t({ en: 'The purchase did not complete. You have not lost your place.', nl: 'De aankoop is niet afgerond. Je kunt verder waar je was.' }) },
    earlier: { icon: 'star', text: t({ en: 'We found an earlier purchase. You will not be charged again.', nl: 'We hebben een eerdere aankoop gevonden. Je betaalt niet opnieuw.' }), tone: 'text' },
    restored: { icon: 'refresh', text: t({ en: 'Purchases restored. Your conversations are ready.', nl: 'Aankopen hersteld. Je gesprekken staan klaar.' }), tone: 'text' },
    trialRestored: { icon: 'refresh', text: t({ en: `Your free week was already started with this ${account}.`, nl: `Je gratis week was al gestart met dit ${account}.` }), tone: 'text' },
    nothing: { icon: 'refresh', text: t({ en: `No earlier purchase was found for this ${account}.`, nl: `Er is geen eerdere aankoop gevonden voor dit ${account}.` }) },
    unreachable: { icon: 'warning', text: t({ en: 'The store could not be reached. Try again later.', nl: 'De winkel is niet bereikbaar. Probeer het later opnieuw.' }) },
    trialUsed: { icon: 'clock', text: t({ en: `This ${account} has already had its free week.`, nl: `Dit ${account} heeft zijn gratis week al gehad.` }), tone: 'text' },
  } satisfies Record<StatusKey, Status>;
  const status: Status | null = statusKey ? messages[statusKey] : null;

  async function onStartTrial() {
    setBusy('trial'); setStatusKey(null);
    const outcome = await startTrial();
    if (!alive.current) return;
    setBusy(null);
    if (outcome === 'started') { returnToTopic(); return; }
    setStatusKey(outcome === 'already-used' ? 'trialUsed' : outcome === 'pending' ? 'pending' : outcome === 'unavailable' ? 'unreachable' : outcome === 'failed' ? 'failed' : null);
  }

  async function onBuy() {
    setBusy('buy'); setStatusKey(null);
    const outcome = await buy();
    if (!alive.current) return;
    setBusy(null);
    if (outcome === 'purchased') { returnToTopic(); return; }
    setStatusKey(outcome === 'owned' ? 'earlier' : outcome === 'pending' ? 'pending' : outcome === 'unavailable' ? 'unreachable' : outcome === 'cancelled' ? null : 'failed');
  }

  async function onRestore() {
    setBusy('restore'); setStatusKey(null);
    const outcome = await restore();
    if (!alive.current) return;
    setBusy(null);
    setStatusKey(outcome === 'restored' ? 'restored' : outcome === 'trial-restored' ? 'trialRestored' : outcome === 'nothing' ? 'nothing' : 'unreachable');
  }

  // ---- Shared parts --------------------------------------------------------------------------------
  const close = <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs, marginRight: -10 }}>
    <IconButton name="close" label={t({ en: 'Close', nl: 'Sluiten' })} onPress={() => navigation.goBack()} />
  </View>;

  const heading = (eyebrow: string, title: string, line: string, extra?: React.ReactNode) => <View style={{ gap: spacing.sm, alignItems: 'center' }}>
    <Eyebrow framed>{eyebrow}</Eyebrow>
    {extra}
    <TextBlock variant="title" center style={{ fontSize: 30, lineHeight: 36 }}>{title}</TextBlock>
    <TextBlock variant="voice" secondary center>{line}</TextBlock>
  </View>;

  const statusLine = status ? <StatusLine icon={status.icon} text={status.text} tone={status.tone ?? 'secondary'} /> : null;
  const buyLabel = price ? t({ en: `Buy once · ${price}`, nl: `Eenmalig kopen · ${price}` }) : t({ en: 'Buy once', nl: 'Eenmalig kopen' });
  const priceProblem = collection !== 'loading' && !priceReady;

  /** Small print row: restore + the one-payment promise (or a retry when the price is missing). */
  const smallPrint = <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: spacing.sm }}>
    <Pressable accessibilityRole="button" accessibilityState={{ busy: busy === 'restore', disabled: busy !== null }} disabled={busy !== null}
      onPress={() => { void onRestore(); }} hitSlop={8} style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <TextBlock variant="supporting" style={{ fontWeight: '600', textDecorationLine: 'underline' }}>
        {busy === 'restore' ? t({ en: 'Restoring…', nl: 'Herstellen…' }) : t({ en: 'Restore purchases', nl: 'Herstel aankopen' })}
      </TextBlock>
    </Pressable>
    <TextBlock variant="supporting" secondary>·</TextBlock>
    {priceProblem
      ? <Pressable accessibilityRole="button" onPress={loadOffer} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
        <TextBlock variant="supporting" secondary style={{ textDecorationLine: 'underline' }}>{t({ en: 'Price unavailable · try again', nl: 'Prijs niet beschikbaar · opnieuw' })}</TextBlock>
      </Pressable>
      : <TextBlock variant="supporting" secondary>{t({ en: `One payment via ${storeName}. No subscription.`, nl: `Eén betaling via ${storeName}. Geen abonnement.` })}</TextBlock>}
  </View>;

  /** What the collection holds: three theme tiles; the full list folds open on request. */
  const included = (label: string) => <View style={{ gap: spacing.md }}>
    <TextBlock variant="eyebrow" secondary center>{label}</TextBlock>
    <ThemeTiles counts={themes.map(theme => paid.filter(topic => topic.theme === theme.id).length)} />
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAll }} onPress={() => setShowAll(v => !v)} hitSlop={6}
      style={({ pressed }) => ({ flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 4, minHeight: 36, opacity: pressed ? 0.6 : 1 })}>
      <TextBlock variant="supporting" style={{ fontWeight: '600' }}>
        {showAll ? t({ en: 'Hide the list', nl: 'Verberg de lijst' }) : t({ en: `See all ${paid.length} conversations`, nl: `Bekijk alle ${paid.length} gesprekken` })}
      </TextBlock>
      <Icon name={showAll ? 'chevronUp' : 'chevronDown'} color={palette.text} size={16} />
    </Pressable>
    {showAll ? <View style={{ gap: spacing.md }}>
      {themes.map(theme => {
        const list = paid.filter(topic => topic.theme === theme.id);
        if (!list.length) return null;
        return <View key={theme.id} style={{ gap: 2 }} accessible accessibilityLabel={`${t(theme.label)}: ${list.map(topic => topic.title[language]).join(', ')}`}>
          <TextBlock variant="eyebrow" secondary>{t(theme.label)}</TextBlock>
          <TextBlock variant="body" style={{ fontFamily: typography.rowTitle.fontFamily }}>{list.map(topic => topic.title[language]).join(' · ')}</TextBlock>
        </View>;
      })}
      <TextBlock variant="supporting" secondary>
        {t({
          en: `Always free: ${joinTitles(freeTitles, 'en')}, quick questions and every Moment you keep.`,
          nl: `Altijd gratis: ${joinTitles(freeTitles, 'nl')}, snelle vragen en elk moment dat je bewaart.`,
        })}
      </TextBlock>
    </View> : null}
  </View>;

  const footer = (primary: React.ReactNode, secondary?: React.ReactNode) => <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
    {statusLine ? <View style={{ alignItems: 'center', paddingBottom: spacing.xs }}>{statusLine}</View> : null}
    {primary}
    {secondary}
    {smallPrint}
  </View>;

  const buyButton = (variant: 'primary' | 'secondary' = 'primary') => <Button variant={variant} label={buyLabel} onPress={() => { void onBuy(); }}
    loading={busy === 'buy' || collection === 'loading'}
    loadingLabel={collection === 'loading' ? t({ en: 'Getting the price…', nl: 'De prijs ophalen…' }) : t({ en: 'Waiting for the store…', nl: 'Wachten op de winkel…' })}
    disabled={!priceReady || (busy !== null && busy !== 'buy')} />;

  // ---- owned --------------------------------------------------------------------------------------
  if (access.state === 'owned') {
    const legacy = access.source === 'legacy';
    return <Screen header={close} footer={<View style={{ paddingTop: spacing.sm }}><Button label={t({ en: 'Continue', nl: 'Verder' })} trailingArrow onPress={returnToTopic} /></View>}>
      <Painting source={artSources.cafe} />
      {heading(t({ en: 'The full collection', nl: 'De volledige collectie' }), t({ en: 'It’s yours.', nl: 'Het is van jou.' }),
        t({ en: `All ${total} conversations, for as long as you use InnerUs.`, nl: `Alle ${total} gesprekken, zolang je InnerUs gebruikt.` }))}
      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        {statusLine}
        <StatusLine icon="check" tone="text" text={legacy
          ? t({ en: 'Thank you for supporting the earlier InnerUs. This is yours for good.', nl: 'Bedankt om de vorige InnerUs te steunen. Dit is voor altijd van jou.' })
          : t({ en: 'Bought once. Nothing renews.', nl: 'Eenmalig gekocht. Er wordt niets verlengd.' })} />
        <StatusLine icon="refresh" text={t({ en: `Restores on any device with the same ${account}.`, nl: `Herstelt op elk toestel met hetzelfde ${account}.` })} />
      </View>
    </Screen>;
  }

  // ---- ended -------------------------------------------------------------------------------------
  if (access.state === 'ended') {
    return <Screen header={close} footer={footer(buyButton(),
      <Button variant="quiet" label={t({ en: 'Continue with the free conversations', nl: 'Verder met de gratis gesprekken' })} onPress={() => navigation.goBack()} />)}>
      <Painting source={artSources['closing-cafe']} />
      {heading(t({ en: 'Your free week has ended', nl: 'Je gratis week is voorbij' }), t({ en: 'Shall we keep talking?', nl: 'Praten we verder?' }),
        t({ en: `One payment keeps all ${total} conversations, for good. ${freeCount} stay free either way.`, nl: `Eén betaling houdt alle ${total} gesprekken open, voor altijd. ${freeCount} blijven sowieso gratis.` }),
        <TrialMeter day={TRIAL_DAYS + 1} size={8} />)}
      {included(t({ en: 'One payment keeps', nl: 'Eén betaling houdt open' }))}
    </Screen>;
  }

  // ---- trial -------------------------------------------------------------------------------------
  if (access.state === 'trial') {
    return <Screen header={close} footer={footer(buyButton())}>
      <Painting source={artSources.window} />
      {heading(t({ en: 'Your free week', nl: 'Je gratis week' }), daysLeftText(access.daysLeft, t),
        t({ en: `Everything is open until ${formatTrialEnd(access.endsAt, 'en')}. One payment keeps it that way.`, nl: `Alles staat open tot ${formatTrialEnd(access.endsAt, 'nl')}. Eén betaling houdt het zo.` }),
        <TrialMeter day={access.day} size={10} />)}
      {included(t({ en: 'One payment keeps', nl: 'Eén betaling houdt open' }))}
    </Screen>;
  }

  // ---- new (and the brief moment while access is being checked) ------------------------------------
  const checking = access.state === 'checking';
  const steps = [
    { marker: 'today' as const, label: t({ en: 'Today', nl: 'Vandaag' }), text: t({ en: `All ${total} open. Nothing is charged.`, nl: `Alle ${total} open. Niets aangerekend.` }) },
    { marker: 'end' as const, label: t({ en: `Day ${TRIAL_DAYS} · ${shortDate(Date.now() + (TRIAL_DAYS - 1) * DAY, language)}`, nl: `Dag ${TRIAL_DAYS} · ${shortDate(Date.now() + (TRIAL_DAYS - 1) * DAY, language)}` }),
      text: t({ en: `Ends by itself. ${paid.length} close again.`, nl: `Stopt vanzelf. ${paid.length} gaan weer dicht.` }) },
    { marker: 'after' as const, label: t({ en: 'Then you choose', nl: 'Dan kies je' }),
      text: price ? t({ en: `Keep all for ${price}, once. Or ${freeCount} stay free.`, nl: `Hou alles voor ${price}, eenmalig. Of ${freeCount} blijven gratis.` })
        : t({ en: `Keep all with one payment. Or ${freeCount} stay free.`, nl: `Hou alles met één betaling. Of ${freeCount} blijven gratis.` }) },
  ];
  return <Screen header={close} footer={footer(
    <Button label={t({ en: 'Start your free week', nl: 'Start je gratis week' })} onPress={() => { void onStartTrial(); }}
      loading={busy === 'trial' || checking} loadingLabel={checking ? t({ en: 'Checking your purchases…', nl: 'Je aankopen controleren…' }) : t({ en: 'Starting…', nl: 'Starten…' })}
      disabled={!trialReady || (busy !== null && busy !== 'trial')}
      reason={!trialReady && offer.trial !== 'loading' ? t({ en: 'The free week isn’t available right now.', nl: 'De gratis week is nu niet beschikbaar.' }) : undefined} />,
    priceReady && !checking
      ? <Button variant="quiet" label={t({ en: `Or buy once for ${price}`, nl: `Of koop eenmalig voor ${price}` })} onPress={() => { void onBuy(); }} loading={busy === 'buy'}
        loadingLabel={t({ en: 'Waiting for the store…', nl: 'Wachten op de winkel…' })} disabled={busy !== null && busy !== 'buy'} />
      : null)}>
    <Painting source={artSources.garden} />
    {heading(t({ en: 'Your first week', nl: 'Je eerste week' }), t({ en: 'Every conversation, free for a week', nl: 'Elk gesprek, een week gratis' }),
      t({ en: 'Open them all together. Keep them with one payment.', nl: 'Open ze allemaal samen. Hou ze met één betaling.' }))}
    <View style={{ backgroundColor: palette.raised, borderRadius: radius.group, padding: spacing.group }}>
      <TrialTimeline steps={steps} />
    </View>
    {included(t({ en: 'What opens this week', nl: 'Wat deze week opengaat' }))}
  </Screen>;
}

/** The scene as a framed postcard on the plum: paper-edged, rounded, never feathered into the dark. */
function Painting({ source }: { source: ImageSourcePropType }) {
  const { palette } = useDesign();
  return <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
    style={{ height: 150, borderRadius: radius.group, backgroundColor: palette.paper, padding: 5, transform: [{ rotate: '-0.6deg' }] }}>
    <Image source={source} resizeMode="cover" style={{ flex: 1, width: '100%', borderRadius: radius.group - 4 }} />
  </View>;
}

/** Three theme tiles: art, theme name and how many paid conversations it holds. */
function ThemeTiles({ counts }: { counts: number[] }) {
  const { t } = useDesign();
  const [width, setWidth] = useState(0);
  const gap = spacing.md;
  const tile = width > 0 ? (width - gap * 2) / 3 : 0;
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', gap }}>
    {themes.map((theme, i) => <View key={theme.id} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible
      accessibilityLabel={`${t(theme.label)}, ${counts[i]} ${t({ en: 'conversations', nl: 'gesprekken' })}`}>
      {tile > 0 ? <ArtTile family={theme.artFamily} size={tile} height={64} rounded={8} /> : <View style={{ height: 64 }} />}
      <View style={{ alignItems: 'center' }}>
        <TextBlock variant="rowTitle" center style={{ fontSize: 15, lineHeight: 19 }}>{t(theme.label)}</TextBlock>
        <TextBlock variant="supporting" secondary center>{t({ en: `${counts[i]} more`, nl: `${counts[i]} extra` })}</TextBlock>
      </View>
    </View>)}
  </View>;
}
