import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Icon } from '../design/Icon';
import { TextBlock } from '../design/primitives';
import { formatClip } from '../design/patterns';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';

/**
 * Small local player for one file uri (DS: Moment detail voice note card).
 * Labelled play/pause, a progress bar and elapsed/duration. Stops when unmounted.
 */
export function AudioPlayer({ uri, durationMs, title }: { uri: string; durationMs?: number | null; title?: string }) {
  const { palette, t } = useDesign();
  const player = useAudioPlayer({ uri }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  const totalSeconds = status.duration > 0 ? status.duration : (durationMs ?? 0) / 1000;
  const elapsed = Math.min(status.currentTime, totalSeconds || status.currentTime);
  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
  const playing = status.playing;

  // Back to the start when the clip ends, so Play starts it again.
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  // The hook releases the player on unmount; pausing first stops sound immediately.
  useEffect(() => () => {
    try { player.pause(); } catch { /* already released */ }
  }, [player]);

  const toggle = async () => {
    if (playing) {
      player.pause();
      return;
    }
    try { await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }); } catch { /* playback still works */ }
    if (totalSeconds > 0 && elapsed >= totalSeconds - 0.05) await player.seekTo(0);
    player.play();
  };

  const name = title ?? t({ en: 'Voice note', nl: 'Spraaknotitie' });
  const playLabel = playing
    ? t({ en: `Pause ${name}`, nl: `${name} pauzeren` })
    : t({ en: `Play ${name}`, nl: `${name} afspelen` });

  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.group }}>
    <Pressable accessibilityRole="button" accessibilityLabel={playLabel} onPress={() => void toggle()} disabled={!status.isLoaded && !totalSeconds}
      style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Icon name={playing ? 'pause' : 'play'} color={palette.actionText} filled={!playing} size={20} />
    </Pressable>
    <View style={{ flex: 1, gap: 6 }}>
      <TextBlock variant="label">{name}</TextBlock>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t({ en: 'Playback position', nl: 'Afspeelpositie' })}
        accessibilityValue={{ min: 0, max: Math.round(totalSeconds), now: Math.round(elapsed), text: `${formatClip(elapsed * 1000)} / ${formatClip(totalSeconds * 1000)}` }}
        style={{ height: 4, borderRadius: 2, backgroundColor: palette.divider, overflow: 'hidden' }}>
        <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: palette.text }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextBlock variant="supporting" secondary>{formatClip(elapsed * 1000)}</TextBlock>
        <TextBlock variant="supporting" secondary>{formatClip(totalSeconds * 1000)}</TextBlock>
      </View>
    </View>
  </View>;
}
