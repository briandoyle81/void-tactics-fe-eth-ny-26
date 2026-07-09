"use client";

import { useSyncExternalStore } from "react";
import {
  AppMode,
  APP_MODE_STORAGE_KEY,
  DEFAULT_APP_MODE,
  getAppMode,
  VOID_TACTICS_APP_MODE_CHANGED_EVENT,
} from "../config/appMode";

function subscribeAppMode(onStoreChange: () => void) {
  const onCustom = () => onStoreChange();
  const onStorage = (e: StorageEvent) => {
    if (
      e.storageArea === window.localStorage &&
      e.key === APP_MODE_STORAGE_KEY
    ) {
      onStoreChange();
    }
  };
  window.addEventListener(VOID_TACTICS_APP_MODE_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(VOID_TACTICS_APP_MODE_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** Subscribes to the in-app web3/web2 mode toggle (localStorage + same-tab change events). */
export function useAppMode(): AppMode {
  return useSyncExternalStore(
    subscribeAppMode,
    getAppMode,
    () => DEFAULT_APP_MODE,
  );
}
