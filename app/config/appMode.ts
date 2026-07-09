export type AppMode = "web3" | "web2";

export const DEFAULT_APP_MODE: AppMode = "web3";

/** localStorage key for the web3/web2 mode toggle (must match `setAppMode`). */
export const APP_MODE_STORAGE_KEY = "void-tactics.appMode";

/** Dispatched when the app-selected mode in localStorage changes (see `setAppMode`). */
export const VOID_TACTICS_APP_MODE_CHANGED_EVENT = "void-tactics-app-mode-changed";

function isAppMode(value: string | null): value is AppMode {
  return value === "web3" || value === "web2";
}

export function getAppMode(): AppMode {
  if (typeof window === "undefined") return DEFAULT_APP_MODE;
  const raw = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
  return isAppMode(raw) ? raw : DEFAULT_APP_MODE;
}

export function setAppMode(mode: AppMode) {
  if (typeof window === "undefined") return;
  const prev = window.localStorage.getItem(APP_MODE_STORAGE_KEY);
  window.localStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  if (prev !== mode) {
    window.dispatchEvent(
      new CustomEvent(VOID_TACTICS_APP_MODE_CHANGED_EVENT, {
        detail: { mode },
      }),
    );
  }
}
