/**
 * Web2 counterpart to freeShipClaimTutorialStorage.ts — same Manage Navy
 * tutorial series (drone/claim, construct delivery, buy ships), keyed by
 * userId instead of chainId+walletAddress (web2 has no chain concept).
 */
const FREE_SHIP_CLAIM_CLICKED_KEY = "void-tactics-free-ship-claim-clicked-web2";

const DRONE_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-drone-tutorial-dismiss-session-web2";
const DRONE_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-drone-tutorial-dismiss-forever-web2-v1";

const CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-done-web2-v1";
const CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-dismiss-session-web2";
const CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-construct-delivery-tutorial-dismiss-forever-web2-v1";

const BUY_SHIPS_TUTORIAL_DONE_KEY = "void-tactics-manage-navy-buy-ships-tutorial-done-web2-v1";
const BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY =
  "void-tactics-manage-navy-buy-ships-tutorial-dismiss-session-web2";
const BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY =
  "void-tactics-manage-navy-buy-ships-tutorial-dismiss-forever-web2-v1";

function readScopedBoolean(storageKeyName: string, userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(storageKeyName);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[userId] === true;
  } catch {
    return false;
  }
}

function writeScopedBoolean(storageKeyName: string, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(storageKeyName);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[userId] = true;
    localStorage.setItem(storageKeyName, JSON.stringify(parsed));
  } catch {
    // Quota or disabled storage
  }
}

function removeScopedBoolean(storageKeyName: string, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(storageKeyName);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    delete parsed[userId];
    if (Object.keys(parsed).length === 0) {
      localStorage.removeItem(storageKeyName);
      return;
    }
    localStorage.setItem(storageKeyName, JSON.stringify(parsed));
  } catch {
    // Ignore storage parse failures
  }
}

export function hasEverClickedFreeShipClaimWeb2(userId: string): boolean {
  return readScopedBoolean(FREE_SHIP_CLAIM_CLICKED_KEY, userId);
}
export function persistFreeShipClaimClickedWeb2(userId: string): void {
  writeScopedBoolean(FREE_SHIP_CLAIM_CLICKED_KEY, userId);
}

export function isDroneFactoryTutorialSessionDismissedWeb2(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY) === "1";
}
export function dismissDroneFactoryTutorialForSessionWeb2(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY, "1");
}
export function isDroneFactoryTutorialPermanentlyDismissedWeb2(userId: string): boolean {
  return readScopedBoolean(DRONE_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}
export function persistDroneFactoryTutorialPermanentlyDismissedWeb2(userId: string): void {
  writeScopedBoolean(DRONE_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}

export function hasCompletedConstructDeliveryTutorialWeb2(userId: string): boolean {
  return readScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY, userId);
}
export function persistConstructDeliveryTutorialCompletedWeb2(userId: string): void {
  writeScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY, userId);
}
export function isConstructDeliveryTutorialSessionDismissedWeb2(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY) === "1";
}
export function dismissConstructDeliveryTutorialForSessionWeb2(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY, "1");
}
export function isConstructDeliveryTutorialPermanentlyDismissedWeb2(userId: string): boolean {
  return readScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}
export function persistConstructDeliveryTutorialPermanentlyDismissedWeb2(userId: string): void {
  writeScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}

export function hasCompletedBuyShipsTutorialWeb2(userId: string): boolean {
  return readScopedBoolean(BUY_SHIPS_TUTORIAL_DONE_KEY, userId);
}
export function persistBuyShipsTutorialCompletedWeb2(userId: string): void {
  writeScopedBoolean(BUY_SHIPS_TUTORIAL_DONE_KEY, userId);
}
export function isBuyShipsTutorialSessionDismissedWeb2(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY) === "1";
}
export function dismissBuyShipsTutorialForSessionWeb2(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY, "1");
}
export function isBuyShipsTutorialPermanentlyDismissedWeb2(userId: string): boolean {
  return readScopedBoolean(BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}
export function persistBuyShipsTutorialPermanentlyDismissedWeb2(userId: string): void {
  writeScopedBoolean(BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY, userId);
}

/** Debug utility: clear all Manage Navy tutorial progress for a user. */
export function clearManageNavyTutorialCacheWeb2(userId: string): void {
  if (typeof window === "undefined") return;
  removeScopedBoolean(FREE_SHIP_CLAIM_CLICKED_KEY, userId);
  removeScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DONE_KEY, userId);
  removeScopedBoolean(BUY_SHIPS_TUTORIAL_DONE_KEY, userId);
  removeScopedBoolean(DRONE_TUTORIAL_DISMISS_FOREVER_KEY, userId);
  removeScopedBoolean(CONSTRUCT_DELIVERY_TUTORIAL_DISMISS_FOREVER_KEY, userId);
  removeScopedBoolean(BUY_SHIPS_TUTORIAL_DISMISS_FOREVER_KEY, userId);
  sessionStorage.removeItem(DRONE_TUTORIAL_SESSION_DISMISS_KEY);
  sessionStorage.removeItem(CONSTRUCT_DELIVERY_TUTORIAL_SESSION_DISMISS_KEY);
  sessionStorage.removeItem(BUY_SHIPS_TUTORIAL_SESSION_DISMISS_KEY);
}
