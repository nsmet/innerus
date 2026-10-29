import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Language } from '../content/types';

/**
 * Optional local weekly reminder (spec 22). Permission is asked only after the person turns reminders on.
 * The text is always neutral: never a topic, answer or summary (spec 36). No streaks, no escalation.
 * The app keeps the default notification handler, so a reminder does not appear while InnerUs is open.
 *
 * `weekday` follows JavaScript's Date#getDay (0 = Sunday … 6 = Saturday); the stored default 5 is Friday.
 */
export type ReminderSchedule = { weekday: number; hour: number; minute: number };
export type ReminderResult = 'scheduled' | 'denied' | 'failed';

const CHANNEL_ID = 'innerus-reminders';

const reminderText = {
  en: { title: 'InnerUs', body: 'A little time for each other?' },
  nl: { title: 'InnerUs', body: 'Even tijd voor elkaar?' },
} as const;

/**
 * Where notification permission stands, without asking:
 * - 'granted'  — reminders can be scheduled straight away.
 * - 'ask'      — the system prompt can still be shown (first time, or Android before the second denial).
 * - 'blocked'  — the person declined; only the system settings can change it now.
 */
export type ReminderPermission = 'granted' | 'ask' | 'blocked';

export async function getReminderPermission(): Promise<ReminderPermission> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return current.canAskAgain ? 'ask' : 'blocked';
  } catch {
    return 'ask';
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
}

/** Turns the reminder on (or moves it): asks permission if needed, then replaces any earlier schedule. */
export async function scheduleReminder(schedule: ReminderSchedule, language: Language): Promise<ReminderResult> {
  try {
    if (!(await ensurePermission())) return 'denied';
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: language === 'nl' ? 'Herinneringen' : 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    const text = reminderText[language];
    await Notifications.scheduleNotificationAsync({
      content: { title: text.title, body: text.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: schedule.weekday + 1, // expo: 1 = Sunday … 7 = Saturday
        hour: schedule.hour,
        minute: schedule.minute,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
    return 'scheduled';
  } catch {
    return 'failed';
  }
}

/** Turns reminders off. InnerUs schedules nothing else, so every scheduled notification is cancelled. */
export async function cancelReminders(): Promise<void> {
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch { /* nothing scheduled */ }
}

export const reminderWeekdays: readonly { value: number; en: string; nl: string }[] = [
  { value: 1, en: 'Monday', nl: 'Maandag' },
  { value: 2, en: 'Tuesday', nl: 'Dinsdag' },
  { value: 3, en: 'Wednesday', nl: 'Woensdag' },
  { value: 4, en: 'Thursday', nl: 'Donderdag' },
  { value: 5, en: 'Friday', nl: 'Vrijdag' },
  { value: 6, en: 'Saturday', nl: 'Zaterdag' },
  { value: 0, en: 'Sunday', nl: 'Zondag' },
];

/** A handful of evening times, as minutes after midnight. */
export const reminderTimes: readonly number[] = [19 * 60, 20 * 60, 20 * 60 + 30, 21 * 60, 21 * 60 + 30];

export function formatReminderTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
