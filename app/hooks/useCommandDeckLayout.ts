"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

export type CommandDeckLayout = "A" | "B";

/** PostHog feature flag for the hub A/B test; variant "b" shows layout B. */
export const COMMAND_DECK_LAYOUT_FLAG = "command-deck-layout";

/** Local override for trying a layout: localStorage["vt-command-deck-layout"] = "A" | "B". */
const OVERRIDE_STORAGE_KEY = "vt-command-deck-layout";

function readOverride(): CommandDeckLayout | null {
  try {
    const value = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return value === "A" || value === "B" ? value : null;
  } catch {
    return null;
  }
}

function readFlag(): CommandDeckLayout | null {
  const variant = posthog.getFeatureFlag?.(COMMAND_DECK_LAYOUT_FLAG);
  if (typeof variant !== "string") return null;
  return variant.toLowerCase() === "b" ? "B" : "A";
}

/** Which Command Deck layout to show: local override, then the PostHog flag, then A. */
export function useCommandDeckLayout(): CommandDeckLayout {
  const [layout, setLayout] = useState<CommandDeckLayout>("A");

  useEffect(() => {
    const override = readOverride();
    if (override) {
      setLayout(override);
      return;
    }
    const apply = () => setLayout(readFlag() ?? "A");
    apply();
    // Flags load asynchronously after PostHog initializes.
    return posthog.onFeatureFlags?.(apply);
  }, []);

  return layout;
}
