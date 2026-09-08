"use client";

import React from "react";
import {
  useDynamicContext,
  useRefreshUser,
  useStepUpAuthentication,
} from "@dynamic-labs/sdk-react-core";
import { TokenScope } from "@dynamic-labs/sdk-api-core";
import { registerPasskey, NoWebAuthNSupportError } from "@dynamic-labs-sdk/client";
import { toast } from "react-hot-toast";
import {
  isPasskeyPromptPermanentlyDismissed,
  persistPasskeyPromptPermanentlyDismissed,
} from "../utils/passkeyPromptStorage";

function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

// Nudges a user who just authenticated with a non-passkey method (email,
// social, wallet) to also register a passkey for faster sign-in next time.
//
// [ENABLE PASSKEY] calls registerPasskey() from @dynamic-labs-sdk/client
// directly — NOT the legacy @dynamic-labs/sdk-react-core useRegisterPasskey
// hook. That hook wraps the same underlying call in Dynamic's internal
// completeAuth()/view-state machinery (pushView, setShowAuthFlow, etc.),
// which swallows any error and never rethrows — so when called from custom
// UI outside Dynamic's own widget flow, it silently no-ops (no browser
// passkey dialog, no error, nothing). Calling registerPasskey() from the new
// SDK package directly skips that machinery: it goes straight to
// core.passkey.register(...), the actual WebAuthn call, and real
// errors/successes propagate normally. The two SDKs share one underlying
// client (DynamicContextProvider bootstraps it via useInitializeSdkClient),
// so this still operates on the same authenticated session as the rest of
// the app — useRefreshUser() afterward syncs the legacy user object's
// verifiedCredentials so alreadyHasPasskey below sees it without a reload.
//
// Registering a passkey is server-gated behind an elevated access token
// (TokenScope.Credentiallink — same scope "register a passkey MFA device"
// needs per Dynamic's step-up docs), so a plain sign-in session isn't enough;
// registerPasskey() alone fails with APIError "Elevated access token
// required". useStepUpAuthentication's promptStepUpAuth shows Dynamic's own
// re-auth UI (whatever the user already has — email/SMS OTP, wallet, social)
// to mint that token first. Our own modal closes while that's on screen to
// avoid stacking two overlays.
//
// Evaluated once per mount (Header.tsx renders this once, high in the tree);
// skipped entirely if the user already has a passkey, just signed in with
// one, the browser doesn't support WebAuthn, or they previously checked
// "don't show this again" (persisted per Dynamic userId via
// passkeyPromptStorage.ts).
export function PasskeyEnablePrompt() {
  const { user } = useDynamicContext();
  const refreshUser = useRefreshUser();
  const { checkStepUpAuth, promptStepUpAuth } = useStepUpAuthentication();
  const [isOpen, setIsOpen] = React.useState(false);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [isRegistering, setIsRegistering] = React.useState(false);
  const hasEvaluatedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasEvaluatedRef.current) return;
    if (!user?.userId) return;
    hasEvaluatedRef.current = true;

    if (!isWebAuthnSupported()) return;
    if (isPasskeyPromptPermanentlyDismissed(user.userId)) return;

    const lastCredential = user.verifiedCredentials?.find(
      (vc) => vc.id === user.lastVerifiedCredentialId,
    );
    const justUsedPasskey = lastCredential?.format === "passkey";
    const alreadyHasPasskey = user.verifiedCredentials?.some(
      (vc) => vc.format === "passkey",
    );
    if (justUsedPasskey || alreadyHasPasskey) return;

    setIsOpen(true);
  }, [user]);

  const dismiss = () => {
    if (dontShowAgain && user?.userId) {
      persistPasskeyPromptPermanentlyDismissed(user.userId);
    }
    setIsOpen(false);
  };

  const handleEnable = async () => {
    setIsRegistering(true);
    try {
      const { isRequired } = await checkStepUpAuth({
        scope: TokenScope.Credentiallink,
      });
      if (isRequired) {
        setIsOpen(false);
        // Resolves with undefined on a *successful* verification (see
        // Dynamic's useStepUpPromptReauth: onSuccess calls
        // deferred.resolve(undefined)) — cancellation/failure rejects the
        // promise instead, which the outer catch below handles. There's no
        // truthy value to check here; reaching this line without throwing
        // means the elevated token is already stored.
        await promptStepUpAuth({
          requestedScopes: [TokenScope.Credentiallink],
        });
      }

      await registerPasskey();
      try {
        await refreshUser();
      } catch (refreshError) {
        // The passkey itself registered fine — a failed resync here just
        // means the legacy `user` object stays stale until next reload, not
        // that anything actually failed.
        console.error("Failed to refresh user after registering passkey:", refreshError);
      }
      toast.success("Passkey added — you can use it to sign in next time.");
      if (dontShowAgain && user?.userId) {
        persistPasskeyPromptPermanentlyDismissed(user.userId);
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to register passkey:", error);
      const isCancelledReauth =
        error instanceof Error && error.message === "Reauthentication flow closed";
      const message = isCancelledReauth
        ? "Verification was cancelled — passkey wasn't set up."
        : error instanceof NoWebAuthNSupportError
          ? "This browser or device doesn't support passkeys."
          : "Couldn't set up a passkey. You can try again anytime from My Account.";
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div
        className="bg-near-black border-2 p-6 max-w-md w-full rounded-none font-mono"
        style={{ borderColor: "var(--color-cyan)" }}
      >
        <div className="flex justify-between items-start gap-4 mb-3">
          <h2 className="text-lg font-bold text-cyan tracking-wider">
            [ENABLE FASTER SIGN-IN?]
          </h2>
          <button
            type="button"
            onClick={dismiss}
            className="text-cyan hover:text-cyan/80 transition-all duration-200 text-2xl font-bold leading-none shrink-0"
            aria-label="Close"
            disabled={isRegistering}
          >
            ×
          </button>
        </div>

        <p className="text-sm text-text-secondary leading-relaxed">
          Set up a passkey to sign in next time with Face ID, a fingerprint,
          or your device PIN — no code to type or wait for.
        </p>

        <label className="mt-4 flex items-center gap-2 text-xs text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don&apos;t show this again
        </label>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={dismiss}
            disabled={isRegistering}
            className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider text-xs disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--color-gunmetal)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-steel)",
            }}
          >
            [NOT NOW]
          </button>
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={isRegistering}
            className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider text-xs disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: "var(--color-phosphor-green)",
              color: "var(--color-phosphor-green)",
              backgroundColor: "var(--color-steel)",
            }}
          >
            {isRegistering ? "[FOLLOW THE PROMPT...]" : "[ENABLE PASSKEY]"}
          </button>
        </div>
      </div>
    </div>
  );
}
