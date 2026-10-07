"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import Header from "../components/Header";
import Maps from "../components/Maps";
import MapsWeb2 from "../components/MapsWeb2";
import Admin from "../components/Admin";
import AdminWeb2 from "../components/AdminWeb2";
import ShipAttributes from "../components/ShipAttributes";
import EligibilityControls from "../components/EligibilityControls";
import ShipAttributesWeb2 from "../components/ShipAttributesWeb2";
import ShipPurchasePrices from "../components/ShipPurchasePrices";
import ShipPurchasePricesWeb2 from "../components/ShipPurchasePricesWeb2";
import { useAppMode } from "../hooks/useAppMode";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  OPS_CONSOLE_TABS,
  useOpsConsoleAccess,
  type OpsConsoleTab,
} from "../hooks/useOpsConsoleAccess";
import { PLAY_PATH } from "../config/routes";
import posthog from "posthog-js";

const ACTIVE_TAB_STORAGE_KEY = "void-tactics-ops-console-tab";

const panelBorderStyle = {
  borderColor: "var(--color-gunmetal)",
  borderTopColor: "var(--color-steel)",
  borderLeftColor: "var(--color-steel)",
} as const;

const panelStyle = { ...panelBorderStyle, backgroundColor: "var(--color-slate)" } as const;

function ConsoleMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl border border-solid p-6 text-center" style={panelStyle}>
      <div
        className="text-sm uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          color: "var(--color-text-secondary)",
        }}
      >
        {children}
      </div>
      <Link
        href={PLAY_PATH}
        className="mt-4 inline-block border-2 border-solid border-cyan bg-steel px-4 py-2 text-sm font-semibold uppercase tracking-wider text-cyan"
        style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
      >
        [BACK TO GAME]
      </Link>
    </div>
  );
}

/**
 * Ops Console: the admin tools that used to sit in the player tab bar (maps,
 * AI encounters and missions, ship attributes, purchase prices). Reached
 * from the header [MENU] for admin roles.
 */
export default function OpsConsolePage() {
  const appMode = useAppMode();
  const { status } = useAccount();
  const { isLoggedIn, isLoading: isUserLoading } = useCurrentUser();
  const { tabs, hasAccess, isLoading: isAccessLoading } = useOpsConsoleAccess();
  const [savedTab, setSavedTab] = useState<OpsConsoleTab | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (saved && OPS_CONSOLE_TABS.includes(saved as OpsConsoleTab)) {
      setSavedTab(saved as OpsConsoleTab);
    }
  }, []);

  const activeTab = savedTab && tabs.includes(savedTab) ? savedTab : tabs[0];

  const selectTab = (tab: OpsConsoleTab) => {
    setSavedTab(tab);
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
    posthog.capture("tab_navigated", { tab_name: tab, surface: "ops_console" });
  };

  const isSignedIn = appMode === "web2" ? isLoggedIn : status === "connected";
  const isCheckingSignIn =
    appMode === "web2"
      ? isUserLoading
      : status === "connecting" || status === "reconnecting";

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-near-black)" }}>
      <div className="shrink-0">
        <Header />
      </div>
      <main className="flex min-h-0 w-full flex-1 flex-col gap-4 px-2 pb-8 pt-4 md:gap-8 md:px-10 sm:pb-16 md:pb-20 lg:px-20">
        {isCheckingSignIn || (isSignedIn && !hasAccess && isAccessLoading) ? (
          <ConsoleMessage>Checking access…</ConsoleMessage>
        ) : !isSignedIn ? (
          <ConsoleMessage>Sign in with an admin account to use the Ops Console.</ConsoleMessage>
        ) : !hasAccess || !activeTab ? (
          <ConsoleMessage>This account doesn&apos;t have access to the Ops Console.</ConsoleMessage>
        ) : (
          <div className="w-full">
            <h1
              className="mb-4 text-center text-xl font-bold uppercase tracking-widest md:text-2xl"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                color: "var(--color-amber)",
              }}
            >
              Ops Console
            </h1>
            <div
              className="mb-4 flex flex-wrap justify-center gap-2 md:mb-8"
              role="tablist"
              aria-label="Ops Console sections"
            >
              {tabs.map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectTab(tab)}
                    className={`min-h-11 border-2 border-solid px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150 sm:px-5 sm:text-sm md:min-h-0 md:px-6 md:py-3 md:text-base ${
                      isActive
                        ? "border-cyan bg-steel text-cyan"
                        : "border-gunmetal border-l-steel border-t-steel bg-slate text-text-secondary hover:border-cyan hover:bg-steel hover:text-cyan"
                    }`}
                    style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
                  >
                    [{tab.toUpperCase()}]
                  </button>
                );
              })}
            </div>

            {activeTab === "Maps" || activeTab === "Admin" ? (
              <div className="border border-solid p-1" style={panelStyle}>
                {activeTab === "Maps" &&
                  (appMode === "web2" ? <MapsWeb2 /> : <Maps />)}
                {activeTab === "Admin" &&
                  (appMode === "web2" ? <AdminWeb2 /> : <Admin />)}
              </div>
            ) : (
              <div className="mx-auto max-w-7xl border-0 bg-transparent p-0 md:border md:border-solid md:bg-[var(--color-slate)] md:p-8" style={panelBorderStyle}>
                {activeTab === "Ship Attributes" &&
                  (appMode === "web2" ? (
                    <ShipAttributesWeb2 />
                  ) : (
                    <div className="space-y-6">
                      <ShipAttributes />
                      <EligibilityControls />
                    </div>
                  ))}
                {activeTab === "Purchase Prices" &&
                  (appMode === "web2" ? <ShipPurchasePricesWeb2 /> : <ShipPurchasePrices />)}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
