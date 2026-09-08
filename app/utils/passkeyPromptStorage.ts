/** Persists a per-user "don't ask about passkeys again" choice for PasskeyEnablePrompt.tsx. */
const PASSKEY_PROMPT_DISMISS_FOREVER_KEY =
  "void-tactics-passkey-prompt-dismiss-forever-v1";

export function isPasskeyPromptPermanentlyDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(PASSKEY_PROMPT_DISMISS_FOREVER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed[userId] === true;
  } catch {
    return false;
  }
}

export function persistPasskeyPromptPermanentlyDismissed(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PASSKEY_PROMPT_DISMISS_FOREVER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    parsed[userId] = true;
    localStorage.setItem(
      PASSKEY_PROMPT_DISMISS_FOREVER_KEY,
      JSON.stringify(parsed),
    );
  } catch {
    // Quota or disabled storage
  }
}
