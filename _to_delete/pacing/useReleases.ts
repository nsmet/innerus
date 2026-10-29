import { useCallback, useMemo } from 'react';
import { topics } from '../content/catalogue';
import { packOf } from '../content/packs';
import { packStates, releasedTopics, toDay } from '../content/releases';
import type { Topic } from '../content/types';
import { useAppStore } from './AppStore';

const NONE: readonly string[] = [];

/**
 * Which post-launch conversations this couple has, and which are new (docs/RELEASES.md).
 * Pure local calculation: no network, no countdown shown anywhere.
 */
export function useReleases() {
  const { prefs, setPref } = useAppStore();
  const realToday = toDay(new Date());
  const today = __DEV__ && prefs['releases.devToday'] ? prefs['releases.devToday'] : realToday;
  const start = prefs['releases.start'] ?? realToday;
  const seen = prefs['releases.seen'];
  const forced = __DEV__ ? prefs['releases.devForced'] : NONE;

  const states = useMemo(() => packStates({ today, start, seen, forced }), [today, start, seen, forced]);
  const released = useMemo(() => releasedTopics(states), [states]);
  /** Launch catalogue plus every released pack conversation, for Explore and Tonight. */
  const catalogue = useMemo<readonly Topic[]>(() => [...topics, ...released], [released]);
  const newTopicIds = useMemo(() => new Set(states.filter(s => s.released).flatMap(s => s.unseenTopicIds)), [states]);
  /** The newest arrival still worth a quiet card on Tonight. */
  const arrival = useMemo(() => {
    const fresh = states.filter(s => s.fresh).sort((a, b) => (a.unlockDay < b.unlockDay ? 1 : -1))[0];
    return fresh ? released.find(topic => topic.id === fresh.unseenTopicIds[0]) ?? null : null;
  }, [states, released]);
  const moreComing = states.some(s => !s.released);

  const markSeen = useCallback(async (topicIds: readonly string[]) => {
    const ids = topicIds.filter(id => packOf(id) && !seen.includes(id));
    if (ids.length) await setPref('releases.seen', [...seen, ...ids]);
  }, [seen, setPref]);

  return { today, start, states, catalogue, released, newTopicIds, arrival, moreComing, markSeen };
}
