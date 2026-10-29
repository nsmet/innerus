import { Platform } from 'react-native';
import {
  ErrorCode, endConnection, fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseErrorListener, purchaseUpdatedListener, requestPurchase, restorePurchases,
  type Purchase,
} from 'expo-iap';

/**
 * Direct platform store adapter (StoreKit 2 / Google Play Billing via expo-iap). No InnerUs server,
 * no third-party customer service, no entitlement from synced flags (handoff §35/§38, D19, D28).
 *
 * Two products, both non-consumable:
 *   - the collection: the one-time purchase that keeps every conversation;
 *   - the trial (iOS only): Apple's €0 "7-day Trial" item (App Review 3.1.1). Its transaction date is the
 *     trial's start, so the trial survives reinstalls and restores without any InnerUs server.
 * Android has no free in-app items, so its trial clock is local (src/platform/access.tsx).
 * Any other product this app sold earlier (v1 subscriptions or lifetime items) counts as legacy access, for good
 * (owner decision D48): on iOS the full StoreKit history is read, so a v1 subscriber who cancels keeps the collection.
 * Errors are swallowed into typed results; nothing is logged.
 */

/**
 * Product IDs per build variant (D39). EAS production builds set EXPO_PUBLIC_INNERUS_VARIANT=production
 * (eas.json), which Metro inlines at bundle time. Everything else uses the local StoreKit development IDs.
 * The production IDs must exist in App Store Connect / Play Console exactly as written (docs/RELEASE_RUNBOOK.md).
 */
const LIVE_PRODUCTS = process.env.EXPO_PUBLIC_INNERUS_VARIANT === 'production';
export const PRODUCT_IDS = LIVE_PRODUCTS
  ? { collection: 'com.nicksmet.innerus.collection', trial: 'com.nicksmet.innerus.trial7' }
  : { collection: 'local.innerus.development.collection', trial: 'local.innerus.development.trial7' };
export const COLLECTION_PRODUCT_ID = PRODUCT_IDS.collection;
export const TRIAL_PRODUCT_ID = PRODUCT_IDS.trial;
/** Only iOS sells the €0 trial item. */
export const STORE_TRIAL = Platform.OS === 'ios';

export type StoreProbe = { state: 'connected' | 'unavailable'; productsFound: number; detail: string };

/** Connects, asks the store for the development products, disconnects. Never purchases. (Dev probe screen only.) */
export async function probeStore(): Promise<StoreProbe> {
  try {
    const connected = await initConnection();
    if (!connected) return { state: 'unavailable', productsFound: 0, detail: 'initConnection returned false' };
    const products = (await fetchProducts({ skus: [...Object.values(PRODUCT_IDS)], type: 'in-app' })) ?? [];
    return { state: 'connected', productsFound: products.length, detail: products.length ? 'product metadata returned by the store' : 'connected; development products not configured in the store (expected)' };
  } catch (error) {
    return { state: 'unavailable', productsFound: 0, detail: error instanceof Error ? error.message.slice(0, 160) : 'store error' };
  } finally {
    try { await endConnection(); } catch { /* ignore */ }
    connection = null;
  }
}

// ---------------------------------------------------------------------------------------------
// Connection and the single purchase observer
// ---------------------------------------------------------------------------------------------
let connection: Promise<boolean> | null = null;

/** One shared store connection for the app's lifetime. Resolves false when the store is unavailable. */
async function connect(): Promise<boolean> {
  if (!connection) connection = initConnection().then(ok => !!ok).catch(() => false);
  const ok = await connection;
  if (!ok) connection = null; // allow a later retry
  else ensureListeners();
  return ok;
}

export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled' | 'failed' | 'owned' | 'unavailable';
type ProductKey = keyof typeof PRODUCT_IDS;

/** Completed store purchases, also late ones (Ask to Buy approvals, a purchase replayed at launch). */
export type PurchaseEvent = { product: ProductKey; transactionDate: number };

let listening = false;
const waiters = new Map<string, (outcome: PurchaseOutcome) => void>();
let lastRequested: string | null = null;
let purchaseHandler: ((event: PurchaseEvent) => void) | null = null;

function settle(productId: string | null, outcome: PurchaseOutcome) {
  if (!productId) return;
  const resolve = waiters.get(productId);
  waiters.delete(productId);
  resolve?.(outcome);
}

function keyFor(productId: string): ProductKey | null {
  if (productId === PRODUCT_IDS.collection) return 'collection';
  if (productId === PRODUCT_IDS.trial) return 'trial';
  return null;
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  purchaseUpdatedListener(purchase => { void handlePurchase(purchase); });
  // Error events carry no reliable product ID: they answer the most recent request.
  purchaseErrorListener(error => { settle(lastRequested, outcomeForError(error)); });
}

async function handlePurchase(purchase: Purchase) {
  const product = keyFor(purchase.productId);
  if (!product) return;
  if (purchase.purchaseState === 'pending') { settle(purchase.productId, 'pending'); return; }
  if (purchase.purchaseState !== 'purchased') return;
  // Non-consumable: finishing acknowledges on Android and clears the StoreKit queue on iOS.
  try { await finishTransaction({ purchase, isConsumable: false }); } catch { /* replays next launch */ }
  purchaseHandler?.({ product, transactionDate: purchase.transactionDate || Date.now() });
  settle(purchase.productId, 'purchased');
}

function outcomeForError(error: { code?: unknown } | null | undefined): PurchaseOutcome {
  switch (error?.code) {
    case ErrorCode.UserCancelled: return 'cancelled';
    case ErrorCode.Pending:
    case ErrorCode.DeferredPayment: return 'pending';
    case ErrorCode.AlreadyOwned: return 'owned';
    case ErrorCode.ItemUnavailable:
    case ErrorCode.IapNotAvailable:
    case ErrorCode.BillingUnavailable: return 'unavailable';
    default: return 'failed';
  }
}

/** Called whenever a store purchase of one of our products completes. */
export function setPurchaseHandler(handler: ((event: PurchaseEvent) => void) | null) {
  purchaseHandler = handler;
  void connect();
}

// ---------------------------------------------------------------------------------------------
// Products, what the store says this account holds, purchase, restore
// ---------------------------------------------------------------------------------------------
export type StoreProduct =
  | { status: 'ready'; displayPrice: string; title: string; description: string }
  | { status: 'unavailable' };

/** The store's localized product details. Unavailable in development when the product is not configured. */
export async function fetchStoreProduct(product: ProductKey): Promise<StoreProduct> {
  try {
    if (product === 'trial' && !STORE_TRIAL) return { status: 'unavailable' };
    if (!(await connect())) return { status: 'unavailable' };
    const id = PRODUCT_IDS[product];
    const products = (await fetchProducts({ skus: [id], type: 'in-app' })) ?? [];
    const found = products.find(p => p.id === id);
    if (!found || !found.displayPrice) return { status: 'unavailable' };
    return { status: 'ready', displayPrice: found.displayPrice, title: found.title, description: found.description };
  } catch {
    return { status: 'unavailable' };
  }
}

export type StoreAccess = {
  /** The one-time collection purchase. */
  collection: boolean;
  /**
   * Another product this app sold earlier (v1 subscription or lifetime item), D48: paid for at least once and never
   * refunded, or still active (e.g. a v1 free trial that is running). Expired subscriptions still count on iOS.
   */
  legacy: boolean;
  /** iOS: when the €0 trial item was obtained (ms). Null when never started on this Apple Account. */
  trialStartedAt: number | null;
};

/** StoreKit fields that only exist on iOS purchases; absent (undefined) on Android. */
type IosHistoryFields = { revocationDateIOS?: number | null; expirationDateIOS?: number | null; offerIOS?: { paymentMode?: string } | null };

/**
 * Whether an earlier-product transaction earns legacy access (D48). On iOS the list is the full history
 * (`Transaction.all`), so refunds are skipped, and a transaction that was only a v1 free trial counts while it runs
 * but not after it ended unpaid. Android only returns what is active, which always counts.
 */
function earnsLegacy(purchase: Purchase, now: number): boolean {
  const ios = purchase as Purchase & IosHistoryFields;
  if (ios.revocationDateIOS) return false;
  const active = !ios.expirationDateIOS || ios.expirationDateIOS > now;
  const freeTrialOnly = ios.offerIOS?.paymentMode === 'free-trial';
  return active || !freeTrialOnly;
}

/** Reads the store's own records for this store account. 'error' when the store cannot be asked. */
export async function readStoreAccess(): Promise<StoreAccess | 'error'> {
  try {
    if (!(await connect())) return 'error';
    // iOS: the full history (Transaction.all), so expired v1 subscriptions are still seen (D48). Revoked
    // transactions are in that list too and are skipped below. Android: what Play reports as owned/active.
    const purchases = (await getAvailablePurchases({ onlyIncludeActiveItemsIOS: false })) ?? [];
    const access: StoreAccess = { collection: false, legacy: false, trialStartedAt: null };
    const now = Date.now();
    for (const purchase of purchases) {
      if (purchase.purchaseState !== 'purchased') continue;
      if ((purchase as Purchase & IosHistoryFields).revocationDateIOS) continue; // refunded or revoked
      const product = keyFor(purchase.productId);
      if (product === 'trial') {
        const at = purchase.transactionDate || null;
        if (at && (access.trialStartedAt === null || at < access.trialStartedAt)) access.trialStartedAt = at;
        continue;
      }
      if (product === 'collection') access.collection = true;
      else if (earnsLegacy(purchase, now)) access.legacy = true;
      if (Platform.OS === 'android' && 'isAcknowledgedAndroid' in purchase && purchase.isAcknowledgedAndroid === false && product) {
        try { await finishTransaction({ purchase, isConsumable: false }); } catch { /* retried next launch */ }
      }
    }
    return access;
  } catch {
    return 'error';
  }
}

/**
 * Starts the platform purchase sheet for one product. Resolves with the first store outcome.
 * Never grants anything itself; a `purchased` outcome means the store reported a completed purchase.
 */
export async function purchaseProduct(product: ProductKey): Promise<PurchaseOutcome> {
  if (product === 'trial' && !STORE_TRIAL) return 'unavailable';
  if (!(await connect())) return 'unavailable';
  const id = PRODUCT_IDS[product];
  settle(id, 'cancelled'); // a previous unanswered request is superseded
  lastRequested = id;
  const result = new Promise<PurchaseOutcome>(resolve => { waiters.set(id, resolve); });
  try {
    const dispatched = await requestPurchase({ type: 'in-app', request: { apple: { sku: id }, google: { skus: [id] } } });
    // The outcome normally arrives through the listeners. If the store already handed back a pending
    // transaction (Ask to Buy, deferred payment), settle on it so the button never waits forever.
    const list = Array.isArray(dispatched) ? dispatched : dispatched ? [dispatched] : [];
    const ours = list.find(p => p.productId === id);
    if (ours?.purchaseState === 'pending') settle(id, 'pending');
    else if (ours?.purchaseState === 'purchased') void handlePurchase(ours);
  } catch (error) {
    settle(id, outcomeForError(error as { code?: unknown } | null));
  }
  return result;
}

/** Explicit Restore Purchases: syncs with the store, then reads what this account holds. */
export async function restoreFromStore(): Promise<StoreAccess | 'error'> {
  try {
    if (!(await connect())) return 'error';
    try { await restorePurchases(); } catch { /* fall through to the read */ }
    return await readStoreAccess();
  } catch {
    return 'error';
  }
}
