import { packs, packTopics, type Pack } from './packs';
import type { Topic } from './types';

/** Local calendar day as YYYY-MM-DD. Releases count days, not hours, so a pack arrives in the morning. */
export type Day = string;

export function toDay(date: Date): Day {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(day: Day, days: number): Day {
  const [y, m, d] = day.split('-').map(Number);
  return toDay(new Date(y, m - 1, d + days)); // Date normalises month and year overflow
}

export function daysBetween(from: Day, to: Day): number {
  const [a, b] = [from, to].map(day => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); });
  return Math.round((b - a) / 86_400_000);
}

export type PackState = Readonly<{
  pack: Pack;
  unlockDay: Day;
  /** Which part of the rule decided the day. */
  decidedBy: 'release date' | 'journey start';
  released: boolean;
  forced: boolean;
  /** Released, not yet opened, and arrived less than a week ago: worth a quiet mention on Tonight. */
  fresh: boolean;
  unseenTopicIds: readonly string[];
}>;

export type ReleaseInput = Readonly<{ today: Day; start: Day; seen: readonly string[]; forced: readonly string[] }>;

/** available when today ≥ max(releaseDate, start + weekOffset × 7) — or forced in a development build. */
export function packStates({ today, start, seen, forced }: ReleaseInput): PackState[] {
  return packs.map(pack => {
    const fromStart = addDays(start, pack.weekOffset * 7);
    const unlockDay = fromStart > pack.releaseDate ? fromStart : pack.releaseDate;
    const isForced = forced.includes(pack.id);
    const released = isForced || today >= unlockDay;
    const unseenTopicIds = pack.topicIds.filter(id => !seen.includes(id));
    const age = isForced && today < unlockDay ? 0 : daysBetween(unlockDay, today);
    return {
      pack, unlockDay, decidedBy: fromStart > pack.releaseDate ? 'journey start' : 'release date',
      released, forced: isForced, unseenTopicIds, fresh: released && unseenTopicIds.length > 0 && age < 7,
    };
  });
}

export function releasedTopics(states: readonly PackState[]): Topic[] {
  const ids = new Set(states.filter(s => s.released).flatMap(s => s.pack.topicIds));
  return packTopics.filter(topic => ids.has(topic.id));
}
