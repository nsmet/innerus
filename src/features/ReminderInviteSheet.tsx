import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import { Icon } from '../design/Icon';
import { Button, ListGroup, ListRow, Sheet, SheetBadge, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing } from '../design/tokens';
import {
  formatReminderTime, getReminderPermission, reminderTimes, reminderWeekdays,
  type ReminderPermission, type ReminderResult, type ReminderSchedule,
} from './reminders';

/**
 * One-time invitation after the first finished conversation: "Same time next week?"
 * Shown once, never repeated (spec 22: no escalating nudges). Notification permission is asked only after
 * the person taps "Remind us", so the system prompt follows a deliberate choice (spec 9).
 *
 * Permission-aware: the sheet reads the current permission before anything is tapped.
 * - granted / not yet asked → "Remind us" (the system prompt appears only when needed).
 * - blocked (declined earlier, or declined just now) → explains how to allow notifications and offers
 *   "Open Settings". When the person comes back with notifications allowed, the reminder is set right away.
 */

/** Today's weekday and the evening slot closest to now; outside the evening, 20:30. */
export function suggestedSchedule(now = new Date()): ReminderSchedule {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const evening = minutes >= 18 * 60 + 30 && minutes <= 22 * 60;
  const slot = evening
    ? reminderTimes.reduce((best, m) => (Math.abs(m - minutes) < Math.abs(best - minutes) ? m : best), reminderTimes[0])
    : 20 * 60 + 30;
  return { weekday: now.getDay(), hour: Math.floor(slot / 60), minute: slot % 60 };
}

export function ReminderInviteSheet({ visible, onConfirm, onClose }: {
  visible: boolean;
  onConfirm: (schedule: ReminderSchedule) => Promise<ReminderResult>;
  onClose: () => void;
}) {
  const { palette, t } = useDesign();
  const [schedule, setSchedule] = useState<ReminderSchedule>(() => suggestedSchedule());
  const [picking, setPicking] = useState<'day' | 'time' | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>('ask');
  const sentToSettings = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setSchedule(suggestedSchedule());
    setPicking(null);
    setFailed(false);
    sentToSettings.current = false;
    void getReminderPermission().then(setPermission);
  }, [visible]);

  const day = reminderWeekdays.find(d => d.value === schedule.weekday);
  const time = formatReminderTime(schedule.hour, schedule.minute);

  const confirm = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const outcome: ReminderResult = await onConfirm(schedule);
    setBusy(false);
    if (outcome === 'scheduled') onClose();
    else if (outcome === 'denied') setPermission('blocked');
    else setFailed(true);
  }, [onConfirm, onClose, schedule]);

  // Back from the system settings: read the permission again. Allowed after we sent them there → set it now.
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      void getReminderPermission().then(next => {
        setPermission(next);
        if (next === 'granted' && sentToSettings.current) {
          sentToSettings.current = false;
          void confirm();
        }
      });
    });
    return () => sub.remove();
  }, [visible, confirm]);

  const openSettings = () => {
    sentToSettings.current = true;
    void Linking.openSettings();
  };
  const blocked = permission === 'blocked';

  if (picking) {
    const options = picking === 'day'
      ? reminderWeekdays.map(d => ({ key: d.value, label: t(d), selected: d.value === schedule.weekday, pick: () => setSchedule(s => ({ ...s, weekday: d.value })) }))
      : reminderTimes.map(m => ({
        key: m, label: formatReminderTime(Math.floor(m / 60), m % 60), selected: m === schedule.hour * 60 + schedule.minute,
        pick: () => setSchedule(s => ({ ...s, hour: Math.floor(m / 60), minute: m % 60 })),
      }));
    return <Sheet visible={visible} onClose={() => setPicking(null)}>
      <TextBlock variant="heading">{picking === 'day' ? t({ en: 'Which day?', nl: 'Welke dag?' }) : t({ en: 'What time?', nl: 'Hoe laat?' })}</TextBlock>
      <View>
        {options.map((o, i) => <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: o.selected }} accessibilityLabel={o.label}
          onPress={() => { o.pick(); setPicking(null); }}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', minHeight: geometry.touch + 8, paddingVertical: spacing.sm,
            borderTopWidth: i > 0 ? 1 : 0, borderTopColor: palette.divider, opacity: pressed ? 0.7 : 1,
          })}>
          <TextBlock variant="body" style={[{ flex: 1 }, o.selected ? { fontWeight: '600' } : undefined]}>{o.label}</TextBlock>
          {o.selected ? <Icon name="check" color={palette.text} /> : null}
        </Pressable>)}
      </View>
      <Button variant="secondary" label={t({ en: 'Back', nl: 'Terug' })} onPress={() => setPicking(null)} />
    </Sheet>;
  }

  return <Sheet visible={visible} onClose={onClose}>
    <SheetBadge icon="bell" />
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="title">{blocked
        ? t({ en: 'Notifications are off for InnerUs.', nl: 'Meldingen staan uit voor InnerUs.' })
        : t({ en: 'Same time next week?', nl: 'Volgende week zelfde moment?' })}</TextBlock>
      <TextBlock variant="meta" secondary>{blocked
        ? Platform.OS === 'ios'
          ? t({
            en: 'To get your weekly reminder, allow notifications: open Settings, tap Notifications and turn on Allow Notifications. Then come back here.',
            nl: 'Sta meldingen toe om je wekelijkse herinnering te krijgen: open Instellingen, tik op Meldingen en zet Sta meldingen toe aan. Kom daarna hier terug.',
          })
          : t({
            en: 'To get your weekly reminder, allow notifications: open Settings, tap Notifications and turn them on. Then come back here.',
            nl: 'Sta meldingen toe om je wekelijkse herinnering te krijgen: open Instellingen, tik op Meldingen en zet ze aan. Kom daarna hier terug.',
          })
        : t({
          en: 'Couples who pick a fixed moment keep talking. We send one quiet reminder a week. It never mentions what you talked about.',
          nl: 'Koppels die een vast moment kiezen, blijven praten. We sturen één rustige herinnering per week. Die zegt nooit waarover jullie praatten.',
        })}</TextBlock>
    </View>
    <ListGroup>
      <ListRow icon="clock" title={t({ en: 'Day', nl: 'Dag' })} value={day ? t(day) : ''} onPress={() => setPicking('day')} />
      <ListRow icon="clock" title={t({ en: 'Time', nl: 'Tijd' })} value={time} onPress={() => setPicking('time')} />
    </ListGroup>
    {failed ? <StatusLine icon="warning" text={t({ en: 'The reminder could not be set. Try again.', nl: 'De herinnering kon niet worden ingesteld. Probeer het opnieuw.' })} /> : null}
    <View style={{ gap: spacing.md }}>
      {blocked
        ? <Button label={t({ en: 'Open Settings', nl: 'Open Instellingen' })} loading={busy} onPress={openSettings} />
        : <Button label={t({ en: 'Remind us', nl: 'Herinner ons' })} loading={busy} onPress={() => { void confirm(); }} />}
      <Button variant="quiet" label={t({ en: 'Not now', nl: 'Nu niet' })} onPress={onClose} disabled={busy} />
    </View>
    <TextBlock variant="supporting" secondary center>{t({ en: 'You can change or stop it in Settings.', nl: 'Je kunt dit aanpassen of stoppen in Instellingen.' })}</TextBlock>
  </Sheet>;
}
