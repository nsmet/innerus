import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Topic } from '../content/types';
import type { ActiveSession } from '../data/repository';
import { useAppStore } from '../state/AppStore';
import {
  STORE_TRIAL, fetchStoreProduct, purchaseProduct, readStoreAccess, restoreFromStore, setPurchaseHandler,
  type PurchaseOutcome, type StoreAccess, type StoreProduct,
} from './store';

/**
 * Access to the paid collection (D28): a one-time purchase, with a free first week before it.
 *
 *   new      → the free week has not been started (the free conversations, quick mode, Moments)
 *   trial    → every conversation is open for 7 days
 *   ended    → back to the free conversations; the person is asked, once in a while, to buy the collection
 *   owned    → the one-time purchase (or any v1 purchase, D48) opens everything, for good
 *
 * Ownership and the iOS trial start come from the store's own records. Device-local keys in the private
 * store (never synced) only cover what the store cannot: the Android trial clock, an offline fallback for a
 * previously verified result, when the "trial ended" invitation was last shown, and that this device once saw a
 * v1 purchase (Play only reports active subscriptions, so a lapsed v1 subscriber would otherwise lose access).
 */
export const TRIAL_DAYS = 7;
/** How often the full "your week has ended" invitation may reappear on Tonight. */
export const TRIAL_ENDED_REMINDER_DAYS = 3;
const DAY = 86_400_000;

const KEYS = {
  trialStartedAt: 'access.trialStartedAt',
  verified: 'access.verified',
  endedPromptAt: 'access.endedPromptAt',
  /** Set once a v1 purchase was seen on this device; v1 buyers keep the collection for good (D48). */
  legacy: 'access.legacy',
} as const;
/** Every key starting with this survives "Delete all private app content" (it is not content). */
export const ACCESS_KEY_PREFIX = 'access.';

export type Entitlement = {
  checked: boolean;
  owned: boolean;
  source: 'purchase' | 'legacy' | null;
  trialStartedAt: number | null;
};

export type Access =
  | { state: 'checking' }
  | { state: 'new' }
  | { state: 'trial'; startedAt: number; endsAt: number; daysLeft: number; day: number }
  | { state: 'ended'; endsAt: number }
  | { state: 'owned'; source: 'purchase' | 'legacy' };

/** Pure: what the person can open right now. */
export function deriveAccess(entitlement: Entitlement, now: number): Access {
  if (entitlement.owned) return { state: 'owned', source: entitlement.source ?? 'purchase' };
  const started = entitlement.trialStartedAt;
  if (started !== null) {
    const endsAt = started + TRIAL_DAYS * DAY;
    if (now < endsAt) {
      const daysLeft = Math.max(1, Math.ceil((endsAt - now) / DAY));
      return { state: 'trial', startedAt: started, endsAt, daysLeft, day: TRIAL_DAYS - daysLeft + 1 };
    }
    return { state: 'ended', endsAt };
  }
  return entitlement.checked ? { state: 'new' } : { state: 'checking' };
}

/** What opens the collection right now: the trial or a purchase. */
export function unlockedBy(access: Access): 'trial' | 'owned' | null {
  return access.state === 'owned' ? 'owned' : access.state === 'trial' ? 'trial' : null;
}

/**
 * A conversation can open when it is free, the collection is open, or it was already under way before
 * the trial ended: the free week never cuts a conversation off halfway (spec 38: no interruption).
 */
export function canOpenTopic(topic: Topic, access: Access, activeSession: ActiveSession | null): boolean {
  if (topic.access === 'free' || unlockedBy(access)) return true;
  if (access.state !== 'ended' || activeSession?.topicId !== topic.id) return false;
  return Date.parse(activeSession.startedAt) < access.endsAt;
}

export type TrialOutcome = 'started' | 'already-used' | 'pending' | 'cancelled' | 'failed' | 'unavailable';
export type RestoreOutcome = 'restored' | 'trial-restored' | 'nothing' | 'error';
export type Offer = { collection: StoreProduct | 'loading'; trial: StoreProduct | 'loading' };

type AccessStore = {
  entitlement: Entitlement;
  access: Access;
  unlocked: 'trial' | 'owned' | null;
  /** Store prices; loaded on demand by the screens that show them. */
  offer: Offer;
  loadOffer: () => void;
  startTrial: () => Promise<TrialOutcome>;
  buy: () => Promise<PurchaseOutcome>;
  restore: () => Promise<RestoreOutcome>;
  /** The "your week has ended" invitation is due on Tonight (first time, then every few days). */
  endedInvitationDue: boolean;
  markEndedInvitationShown: () => void;
};

const Context = createContext<AccessStore | null>(null);

/** Development builds only: EXPO_PUBLIC_INNERUS_TRIAL_DAY=1..7 (in trial), 8 (ended) or 0 (not started). */
function devTrialOverride(): number | null | undefined {
  if (!__DEV__) return undefined;
  const raw = process.env.EXPO_PUBLIC_INNERUS_TRIAL_DAY;
  if (raw === undefined || raw === '') return undefined;
  const day = Number(raw);
  if (!Number.isFinite(day)) return undefined;
  return day <= 0 ? null : Date.now() - (day - 1) * DAY - DAY / 2;
}

export function AccessProvider({ children }: React.PropsWithChildren) {
  const { repository } = useAppStore();
  const [entitlement, setEntitlement] = useState<Entitlement>({ checked: false, owned: false, source: null, trialStartedAt: null });
  const [now, setNow] = useState(Date.now);
  const [offer, setOffer] = useState<Offer>({ collection: 'loading', trial: 'loading' });
  const [endedPromptAt, setEndedPromptAt] = useState<number | null>(null);
  const started = useRef(false);

  const read = useCallback(async (key: string) => {
    try { return repository ? await repository.getPreference(key) : null; } catch { return null; }
  }, [repository]);
  const write = useCallback(async (key: string, value: string) => {
    try { if (repository) await repository.setPreference(key, value); } catch { /* best effort */ }
  }, [repository]);

  /** Applies what the store reported, caches it for offline starts, and keeps the earliest trial start. */
  const apply = useCallback(async (store: StoreAccess) => {
    const localTrial = Number(await read(KEYS.trialStartedAt)) || null;
    const trialStartedAt = STORE_TRIAL ? store.trialStartedAt ?? localTrial : localTrial;
    const legacy = store.legacy || (await read(KEYS.legacy)) === '1';
    const owned = store.collection || legacy;
    const source = store.collection ? 'purchase' : legacy ? 'legacy' : null;
    setEntitlement({ checked: true, owned, source, trialStartedAt });
    await write(KEYS.verified, JSON.stringify({ owned, source, at: Date.now() }));
    if (store.legacy) await write(KEYS.legacy, '1');
    if (trialStartedAt) await write(KEYS.trialStartedAt, String(trialStartedAt));
  }, [read, write]);

  // Resolve quietly once per app start; never blocks the UI (spec 11/38).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setPurchaseHandler(event => {
      if (event.product === 'collection') setEntitlement(e => ({ ...e, checked: true, owned: true, source: 'purchase' }));
      else {
        setEntitlement(e => ({ ...e, checked: true, trialStartedAt: e.trialStartedAt ?? event.transactionDate }));
        void write(KEYS.trialStartedAt, String(event.transactionDate));
      }
    });
    void (async () => {
      const shown = Number(await read(KEYS.endedPromptAt)) || null;
      setEndedPromptAt(shown);
      const store = await readStoreAccess();
      if (store !== 'error') { await apply(store); }
      else {
        // Offline or store unavailable: fall back to this device's last verified result (spec AC41).
        let cached: { owned?: boolean; source?: Entitlement['source'] } = {};
        try { cached = JSON.parse((await read(KEYS.verified)) ?? '{}'); } catch { /* none */ }
        const localTrial = Number(await read(KEYS.trialStartedAt)) || null;
        setEntitlement({ checked: true, owned: !!cached.owned, source: cached.owned ? cached.source ?? 'purchase' : null, trialStartedAt: localTrial });
      }
      const override = devTrialOverride();
      if (override !== undefined) setEntitlement(e => ({ ...e, owned: false, source: null, trialStartedAt: override }));
    })();
  }, [apply, read, write]);

  // Day counts move on when the app comes back and when the trial ends while it is open.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => sub.remove();
  }, []);
  const access = useMemo(() => deriveAccess(entitlement, now), [entitlement, now]);
  useEffect(() => {
    if (access.state !== 'trial') return;
    const untilNextDay = (access.endsAt - now) % DAY || DAY;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(untilNextDay + 1000, 2_000_000_000));
    return () => clearTimeout(timer);
  }, [access, now]);

  const loadOffer = useCallback(() => {
    setOffer({ collection: 'loading', trial: STORE_TRIAL ? 'loading' : { status: 'unavailable' } });
    void fetchStoreProduct('collection').then(collection => setOffer(o => ({ ...o, collection })));
    if (STORE_TRIAL) void fetchStoreProduct('trial').then(trial => setOffer(o => ({ ...o, trial })));
  }, []);

  const startTrial = useCallback(async (): Promise<TrialOutcome> => {
    if (entitlement.trialStartedAt) return 'already-used';
    if (!STORE_TRIAL) {
      // Android: Play has no free in-app items, so the week is counted on this device.
      const at = Date.now();
      await write(KEYS.trialStartedAt, String(at));
      setEntitlement(e => ({ ...e, checked: true, trialStartedAt: at }));
      setNow(at);
      return 'started';
    }
    const outcome = await purchaseProduct('trial');
    setNow(Date.now());
    if (outcome === 'purchased') return 'started';
    if (outcome === 'owned') {
      // This Apple Account already had its free week (another device, or a reinstall).
      const store = await readStoreAccess();
      if (store !== 'error') await apply(store);
      return 'already-used';
    }
    return outcome === 'pending' ? 'pending' : outcome === 'cancelled' ? 'cancelled' : outcome === 'unavailable' ? 'unavailable' : 'failed';
  }, [entitlement.trialStartedAt, write, apply]);

  const buy = useCallback(async () => {
    const outcome = await purchaseProduct('collection');
    if (outcome === 'owned') {
      // The store says this account already owns it: confirm from the store's own records before unlocking.
      const store = await readStoreAccess();
      if (store !== 'error') await apply(store);
      return store !== 'error' && (store.collection || store.legacy) ? 'owned' : 'failed';
    }
    return outcome;
  }, [apply]);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    const hadTrial = !!entitlement.trialStartedAt;
    const store = await restoreFromStore();
    if (store === 'error') return 'error';
    await apply(store);
    setNow(Date.now());
    if (store.collection || store.legacy) return 'restored';
    if (store.trialStartedAt && !hadTrial) return 'trial-restored';
    return 'nothing';
  }, [apply, entitlement.trialStartedAt]);

  const endedInvitationDue = access.state === 'ended' && (endedPromptAt === null || now - endedPromptAt > TRIAL_ENDED_REMINDER_DAYS * DAY);
  const markEndedInvitationShown = useCallback(() => {
    const at = Date.now();
    setEndedPromptAt(at);
    void write(KEYS.endedPromptAt, String(at));
  }, [write]);

  const value = useMemo<AccessStore>(() => ({
    entitlement, access, unlocked: unlockedBy(access), offer, loadOffer, startTrial, buy, restore, endedInvitationDue, markEndedInvitationShown,
  }), [entitlement, access, offer, loadOffer, startTrial, buy, restore, endedInvitationDue, markEndedInvitationShown]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAccess() {
  const value = useContext(Context);
  if (!value) throw new Error('useAccess requires AccessProvider');
  return value;
}

/** "Thursday 30 October" in the app language. */
export function formatTrialEnd(at: number, language: 'en' | 'nl') {
  return new Date(at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
