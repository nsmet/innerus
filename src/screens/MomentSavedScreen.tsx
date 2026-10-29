import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { getTopic } from '../content/catalogue';
import { StoryArt } from '../design/StoryArt';
import { formatClip } from '../design/patterns';
import { Button, Screen, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { motion, radius, shadow, spacing } from '../design/tokens';
import { savedOnDeviceText } from '../features/KeepMomentSheet';
import type { StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

/** "A little piece of us." — shown only after a confirmed save from the closing invitation (design Finish). */
export function MomentSavedScreen({ navigation, route }: StackProps<'MomentSaved'>) {
  const { t, language, palette, scheme, reduceMotion } = useDesign();
  const { moments, attachments, finishSession } = useAppStore();
  const { momentId, sessionId } = route.params;
  const moment = moments.find(m => m.id === momentId);
  const topic = moment ? getTopic(moment.topicId, moment.topicVersion) : undefined;
  const audio = attachments.find(a => a.momentId === momentId && a.kind === 'audio');
  const [busy, setBusy] = useState(false);
  const finishing = useRef(false);
  const settle = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  // One settling composition after the save, then rest (spec 47). None with Reduced Motion.
  useEffect(() => {
    if (reduceMotion) { settle.setValue(1); return; }
    Animated.timing(settle, { toValue: 1, duration: motion.keepsake, useNativeDriver: true }).start();
  }, [reduceMotion, settle]);

  const onFinish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    try {
      if (sessionId && moment) await finishSession(sessionId, moment.topicId);
      navigation.popTo('Main', { screen: 'Tonight' });
    } finally {
      finishing.current = false;
      setBusy(false);
    }
  };

  const voiceOnly = moment ? moment.source === 'audio' && !moment.body.trim() : false;
  const words = !moment ? '' : voiceOnly ? `${t({ en: 'Voice note', nl: 'Spraaknotitie' })} · ${formatClip(audio?.durationMs)}` : moment.body;

  const footer = <>
    <Button label={t({ en: 'Finish', nl: 'Afronden' })} loading={busy} onPress={() => { void onFinish(); }} />
    <Button variant="quiet" label={t({ en: 'Keep another moment', nl: 'Bewaar nog een moment' })}
      onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'Tonight' }))} />
  </>;

  const rise = settle.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return <Screen footer={footer}>
    <View style={{ marginTop: spacing.page }}>
      {topic ? <StoryArt topic={topic} position={5} height={250} still /> : null}
    </View>
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <TextBlock variant="display" center>{t({ en: 'A little piece of us.', nl: 'Een klein stukje van ons.' })}</TextBlock>
      <View style={{ width: 28, height: 1, backgroundColor: palette.accent }} />
      {topic ? <TextBlock variant="eyebrow" secondary center>{topic.title[language]}</TextBlock> : null}
    </View>
    {moment ? <Animated.View style={{ opacity: settle, transform: [{ translateY: rise }] }}>
      <View accessible accessibilityLabel={words}
        style={[{
          backgroundColor: palette.raised, borderWidth: 1, borderColor: palette.divider, borderRadius: radius.control / 2,
          paddingVertical: spacing.page, paddingHorizontal: spacing.page, marginHorizontal: spacing.xs, transform: [{ rotate: '-1deg' }],
        }, shadow(scheme)]}>
        <TextBlock variant="voice" center style={{ fontSize: 19, lineHeight: 28 }}>{words}</TextBlock>
      </View>
    </Animated.View> : null}
    {moment ? <View style={{ alignItems: 'center' }}>
      <StatusLine icon="device" text={savedOnDeviceText(t)} />
    </View> : null}
  </Screen>;
}
