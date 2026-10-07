"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import Header from "../components/Header";
import { GameNav, type GameSection } from "../components/GameNav";
import { BootScreen } from "../components/BootScreen";
import { CommandDeckWeb3 } from "../components/commandDeck/CommandDeckWeb3";
import { CommandDeckWeb2 } from "../components/commandDeck/CommandDeckWeb2";
import type { CommandDeckDestination } from "../components/commandDeck/CommandDeck";
import { OnboardingTutorial } from "../components/OnboardingTutorial";
import { FleetHangar, FLEET_SECTIONS, type FleetSection } from "../components/fleet/FleetHangar";
import { StoreScreen, STORE_SECTIONS, type StoreSection } from "../components/StoreScreen";
import Lobbies from "../components/Lobbies";
import LobbiesWeb2 from "../components/LobbiesWeb2";
import { RoguelikeCampaign } from "../components/RoguelikeCampaign";
import { RoguelikeCampaignWeb2 } from "../components/RoguelikeCampaignWeb2";
import Games from "../components/Games";
import GamesWeb2 from "../components/GamesWeb2";
import Profile from "../components/Profile";
import ProfileWeb2 from "../components/ProfileWeb2";
import { Tournaments } from "../components/Tournaments";
import { TournamentsWeb2 } from "../components/TournamentsWeb2";
import { usePlayerGames } from "../hooks/usePlayerGames";
import { usePlayerGamesWeb2 } from "../hooks/usePlayerGamesWeb2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useCommandDeckLayout } from "../hooks/useCommandDeckLayout";
import { TUTORIAL_COMPLETED_STEPS_KEY, TUTORIAL_STEP_STORAGE_KEY } from "../types/onboarding";
import { useAppMode } from "../hooks/useAppMode";
import { OPS_CONSOLE_TABS, type OpsConsoleTab } from "../hooks/useOpsConsoleAccess";
import { PENDING_CLIENT_DETAIL_STORAGE_KEY, setGameClientMounted } from "../utils/clientNavigation";
import posthog from "posthog-js";

type ClientTab =
  | "Command Deck"
  | "Mission"
  | "Lobbies"
  | "Tournaments"
  | "Games"
  | "Manage Navy"
  | "Store"
  | "Profile";

const CLIENT_TABS = new Set<string>([
  "Command Deck",
  "Mission",
  "Lobbies",
  "Tournaments",
  "Games",
  "Manage Navy",
  "Store",
  "Profile",
]);

/** Which nav section highlights for each screen; Play covers the hub and its modes. */
const SECTION_FOR_TAB: Record<ClientTab, GameSection> = {
  "Command Deck": "Play",
  Mission: "Play",
  Lobbies: "Play",
  Tournaments: "Play",
  Games: "Battles",
  "Manage Navy": "Fleet",
  Store: "Store",
  Profile: "Profile",
};

const TAB_FOR_SECTION: Record<GameSection, ClientTab> = {
  Play: "Command Deck",
  Fleet: "Manage Navy",
  Store: "Store",
  Battles: "Games",
  Profile: "Profile",
};

const TAB_FOR_DESTINATION: Record<CommandDeckDestination, ClientTab> = {
  operations: "Mission",
  skirmish: "Lobbies",
  battles: "Games",
  tournaments: "Tournaments",
  store: "Store",
};

/** Hub modes reached from the Command Deck, with the title on their back bar. */
const MODE_TITLES: Partial<Record<ClientTab, string>> = {
  Mission: "Operations",
  Lobbies: "Skirmish",
  Tournaments: "Tournaments",
};

/** Tabs saved by older versions of the client. */
function migrateSavedTab(saved: string | null): ClientTab {
  if (!saved) return "Command Deck";
  if (saved === "Roguelike") return "Mission";
  if (saved === "Customize Ship") return "Manage Navy";
  // Info moved to the website; admin tabs to the Ops Console (/admin).
  if (saved === "Info" || saved === "Campaign" || OPS_CONSOLE_TABS.includes(saved as OpsConsoleTab)) {
    return "Command Deck";
  }
  return CLIENT_TABS.has(saved) ? (saved as ClientTab) : "Command Deck";
}

function hasCompletedFirstBattle(): boolean {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(TUTORIAL_COMPLETED_STEPS_KEY) ?? "[]");
    return ids.includes("completion-retreat") || ids.includes("completion-sniper");
  } catch {
    return false;
  }
}

function sectionFromEvent<T extends string>(event: Event, allowed: readonly T[]): T | null {
  const section = (event as CustomEvent<{ section?: string } | undefined>).detail?.section;
  return section && allowed.includes(section as T) ? (section as T) : null;
}

/** How long to wait on a wallet session restore before showing the boot screen. */
const SESSION_RESTORE_TIMEOUT_MS = 5000;

/**
 * Whether the wallet SDK saved a connected wallet last visit. Read from its
 * persisted store because the SDK can take a while to report it has loaded
 * (or never does, if it can't reach its API), and a signed-out player
 * shouldn't wait on that.
 */
function hasSavedWalletSession(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem("dynamic_store") ?? "null");
    return (saved?.state?.connectedWalletsInfo?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * True while a signed-in wallet session is still coming back after a load
 * (see RestoreWalletConnection): the SDK has a user, or saved a wallet and
 * hasn't loaded yet, but wagmi isn't connected. Bounded so a locked wallet
 * doesn't hold the player on a loading screen.
 */
function useIsRestoringSession(isConnected: boolean): boolean {
  const { sdkHasLoaded, user } = useDynamicContext();
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setHasSavedSession(hasSavedWalletSession());
    const timer = setTimeout(() => setTimedOut(true), SESSION_RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (timedOut || isConnected) return false;
  return Boolean(user) || (!sdkHasLoaded && hasSavedSession);
}

const panelBorderStyle: CSSProperties = {
  borderColor: "var(--color-gunmetal)",
  borderTopColor: "var(--color-steel)",
  borderLeftColor: "var(--color-steel)",
};

function ScreenPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-0 bg-transparent p-0 md:border md:border-solid md:bg-[var(--color-slate)] md:p-8"
      style={panelBorderStyle}
    >
      {children}
    </div>
  );
}

function ModeBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-3 md:mb-4">
      <button
        type="button"
        onClick={onBack}
        className="border border-solid px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan transition-colors duration-150 hover:bg-steel"
        style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", borderColor: "var(--color-gunmetal)" }}
      >
        ‹ Command Deck
      </button>
      <h2
        className="text-xl font-bold uppercase tracking-widest text-text-primary md:text-2xl"
        style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
      >
        {title}
      </h2>
    </div>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto mt-16 text-center uppercase"
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        color: "var(--color-cyan)",
      }}
    >
      <div className="mb-4 text-2xl font-bold tracking-wider">VOID TACTICS</div>
      <div className="text-lg">{children}</div>
    </div>
  );
}

/**
 * The game client: boot screen when signed out, otherwise the HUD, the
 * section nav and the Command Deck with the screens it leads to. The admin
 * tabs live in the Ops Console (/admin).
 */
export default function GameClient() {
  const { status, address, isConnected } = useAccount();
  const [isGamesDetailActive, setIsGamesDetailActive] = useState(false);
  const { games: playerGames, refetch: refetchPlayerGames } = usePlayerGames({
    enabled: !isGamesDetailActive,
  });
  const { games: playerGamesWeb2, refetch: refetchPlayerGamesWeb2 } = usePlayerGamesWeb2({
    pausePolling: isGamesDetailActive,
  });
  const refetchPlayerGamesRef = useRef(refetchPlayerGames);
  refetchPlayerGamesRef.current = refetchPlayerGames;
  const refetchPlayerGamesWeb2Ref = useRef(refetchPlayerGamesWeb2);
  refetchPlayerGamesWeb2Ref.current = refetchPlayerGamesWeb2;
  const { userId: currentUserId, isLoggedIn, isLoading: isUserLoading } = useCurrentUser();
  const appMode = useAppMode();
  const commandDeckLayout = useCommandDeckLayout();
  const isRestoringSession = useIsRestoringSession(isConnected);

  const [activeTab, setActiveTab] = useState<ClientTab>("Command Deck");
  const [isHydrated, setIsHydrated] = useState(false);
  // Keep the Mission graph mounted after the first visit so leaving the tab
  // (e.g. Games) and coming back restores edit mode, selection, and drafts.
  const [missionKeepAlive, setMissionKeepAlive] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [firstBattleCompleted, setFirstBattleCompleted] = useState(false);
  const [isManageNavyPurchaseActive, setIsManageNavyPurchaseActive] = useState(false);
  const [storeSection, setStoreSection] = useState<StoreSection>("packs");
  const [fleetSection, setFleetSection] = useState<FleetSection>("ships");

  const openTab = useCallback((tab: ClientTab) => {
    setActiveTab(tab);
    posthog.capture("tab_navigated", { tab_name: tab });
  }, []);

  // Lets shared chrome (Header) switch tabs with events while the client is
  // on screen, and navigate here from other pages (see clientNavigation.ts).
  useEffect(() => {
    setGameClientMounted(true);
    return () => setGameClientMounted(false);
  }, []);

  // Restore the tab once on mount; resume a first battle left in progress.
  useLayoutEffect(() => {
    setIsHydrated(true);
    const forceGamesTab = localStorage.getItem("void-tactics-force-games-tab") === "true";
    let nextTab: ClientTab;
    if (forceGamesTab) {
      nextTab = "Games";
      localStorage.removeItem("void-tactics-force-games-tab");
    } else if (localStorage.getItem("selectedGameId")) {
      nextTab = "Games";
    } else {
      nextTab = migrateSavedTab(localStorage.getItem("void-tactics-active-tab"));
    }
    setActiveTab(nextTab);
    if (nextTab === "Mission") setMissionKeepAlive(true);
    // A sub-tab requested from another page (clientNavigation.ts).
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_CLIENT_DETAIL_STORAGE_KEY) ?? "null");
      localStorage.removeItem(PENDING_CLIENT_DETAIL_STORAGE_KEY);
      const section = typeof pending?.section === "string" ? pending.section : null;
      if (nextTab === "Store" && STORE_SECTIONS.includes(section)) setStoreSection(section);
      if (nextTab === "Manage Navy" && FLEET_SECTIONS.includes(section)) setFleetSection(section);
    } catch {
      // ignore a malformed request
    }
    setIsTutorialOpen(localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY) !== null);
    setFirstBattleCompleted(hasCompletedFirstBattle());
  }, []);

  useLayoutEffect(() => {
    if (activeTab === "Mission") setMissionKeepAlive(true);
  }, [activeTab]);

  // Navigation events from components and the HUD. Fresh listeners on both
  // window and document, matching how the events are dispatched.
  useEffect(() => {
    const routes: Record<string, (event: Event) => void> = {
      "void-tactics-navigate-to-games": () => {
        setActiveTab("Games");
        // Lobbies.tsx refetches its own usePlayerGames() instance before
        // firing this event, but that's a separate hook instance — this
        // component's playerGames drive the Battles badge and tab.
        void refetchPlayerGamesRef.current();
        void refetchPlayerGamesWeb2Ref.current();
      },
      // The old campaign's "return to campaign" (GameResultModal).
      "void-tactics-navigate-to-campaign": () => setActiveTab("Command Deck"),
      "void-tactics-navigate-to-roguelike": () => setActiveTab("Mission"),
      "void-tactics-navigate-to-lobbies": () => setActiveTab("Lobbies"),
      "void-tactics-navigate-to-manage-navy": (event) => {
        setFleetSection(sectionFromEvent(event, FLEET_SECTIONS) ?? "ships");
        setActiveTab("Manage Navy");
      },
      // The HUD's + buttons pass the Store sub-tab to open.
      "void-tactics-navigate-to-store": (event) => {
        setStoreSection(sectionFromEvent(event, STORE_SECTIONS) ?? "packs");
        setActiveTab("Store");
      },
      "void-tactics-navigate-to-info": () => setActiveTab("Command Deck"),
      "void-tactics-navigate-to-profile": () => openTab("Profile"),
      "void-tactics-start-tutorial": () => setIsTutorialOpen(true),
    };
    const entries = Object.entries(routes);
    for (const [name, handler] of entries) {
      window.addEventListener(name, handler);
      document.addEventListener(name, handler);
    }
    return () => {
      for (const [name, handler] of entries) {
        window.removeEventListener(name, handler);
        document.removeEventListener(name, handler);
      }
    };
  }, [openTab]);

  // Games detail view (a match on screen) hides the HUD and nav.
  useEffect(() => {
    const handleGamesDetailActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsGamesDetailActive(Boolean(custom.detail?.active));
    };
    window.addEventListener("void-tactics-games-detail-active", handleGamesDetailActive as EventListener);
    return () => {
      window.removeEventListener("void-tactics-games-detail-active", handleGamesDetailActive as EventListener);
    };
  }, []);

  // Manage Navy's mobile purchase takeover hides them too.
  useEffect(() => {
    const handleManageNavyPurchaseActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsManageNavyPurchaseActive(Boolean(custom.detail?.active));
    };
    window.addEventListener(
      "void-tactics-manage-navy-purchase-active",
      handleManageNavyPurchaseActive as EventListener,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-manage-navy-purchase-active",
        handleManageNavyPurchaseActive as EventListener,
      );
    };
  }, []);

  // Once both identities are definitively logged out, return to the
  // Command Deck so the next sign-in doesn't land on a stale screen.
  useEffect(() => {
    if (status === "connecting" || status === "reconnecting" || isUserLoading) return;
    if (!isConnected && !isLoggedIn && activeTab !== "Command Deck") {
      setActiveTab("Command Deck");
    }
  }, [status, isConnected, isLoggedIn, isUserLoading, activeTab]);

  useEffect(() => {
    if (isHydrated) localStorage.setItem("void-tactics-active-tab", activeTab);
  }, [activeTab, isHydrated]);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
    setFirstBattleCompleted(hasCompletedFirstBattle());
    setActiveTab("Command Deck");
  }, []);

  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const yourTurnCount =
    appMode === "web2"
      ? playerGamesWeb2.filter(
          (g) => g.metadata.winner === "" && g.turnState.currentTurn === currentUserId,
        ).length
      : isConnected
        ? playerGames.filter(
            (g) => g.metadata.winner === ZERO_ADDR && g.turnState.currentTurn === address,
          ).length
        : 0;
  // Web2 mode signs in via NextAuth, never connects a wallet — `status`
  // (wagmi) would stay "disconnected" forever for those users.
  const isSignedIn = appMode === "web2" ? isLoggedIn : status === "connected";
  const isCheckingSignIn =
    status === "connecting" ||
    status === "reconnecting" ||
    isUserLoading ||
    (appMode !== "web2" && !isLoggedIn && isRestoringSession);

  const hideGlobalChrome = isTutorialOpen || isGamesDetailActive || isManageNavyPurchaseActive;
  const showNav = isHydrated && isSignedIn && !hideGlobalChrome;
  const isFullWidth = isTutorialOpen || activeTab === "Games";

  // Collapse (rather than unmount) the HUD while hidden: it owns the
  // network/app-mode sync effects, which must keep running in a match.
  const hudRowStyle: CSSProperties = hideGlobalChrome
    ? { height: 0, minHeight: 0, maxHeight: 0, overflow: "hidden", pointerEvents: "none" }
    : {};

  const goToCommandDeck = () => openTab("Command Deck");
  const modeTitle = MODE_TITLES[activeTab];

  let content: ReactNode;
  if (!isHydrated) {
    // The saved tab is only known after hydration; render nothing for this
    // one frame rather than flashing the wrong screen.
    content = null;
  } else if (isTutorialOpen) {
    content = <OnboardingTutorial onComplete={closeTutorial} onSkip={closeTutorial} />;
  } else if (isCheckingSignIn) {
    content = <CenteredMessage>Connecting...</CenteredMessage>;
  } else if (!isSignedIn) {
    content = <BootScreen onStartFirstBattle={() => setIsTutorialOpen(true)} />;
  } else {
    content = (
      <>
        {modeTitle && <ModeBar title={modeTitle} onBack={goToCommandDeck} />}
        {missionKeepAlive && (
          <div className={activeTab === "Mission" ? "w-full" : "hidden"} aria-hidden={activeTab !== "Mission"}>
            <ScreenPanel>{appMode === "web2" ? <RoguelikeCampaignWeb2 /> : <RoguelikeCampaign />}</ScreenPanel>
          </div>
        )}
        {activeTab === "Command Deck" &&
          (appMode === "web2" ? (
            <CommandDeckWeb2
              layout={commandDeckLayout}
              yourTurnCount={yourTurnCount}
              onOpen={(destination) => openTab(TAB_FOR_DESTINATION[destination])}
            />
          ) : (
            <CommandDeckWeb3
              layout={commandDeckLayout}
              yourTurnCount={yourTurnCount}
              onOpen={(destination) => openTab(TAB_FOR_DESTINATION[destination])}
            />
          ))}
        {activeTab === "Games" && (
          <div className={`w-full ${isGamesDetailActive ? "px-0" : "px-2 sm:px-4"}`}>
            <div
              className={isGamesDetailActive ? "border-0 p-0" : "border border-solid p-4"}
              style={
                isGamesDetailActive
                  ? { backgroundColor: "transparent", borderColor: "transparent" }
                  : { ...panelBorderStyle, backgroundColor: "var(--color-slate)" }
              }
            >
              {appMode === "web2" ? <GamesWeb2 /> : <Games />}
            </div>
          </div>
        )}
        {activeTab === "Manage Navy" && (
          <ScreenPanel>
            <FleetHangar section={fleetSection} onSection={setFleetSection} />
          </ScreenPanel>
        )}
        {activeTab === "Store" && (
          <ScreenPanel>
            <StoreScreen section={storeSection} onSection={setStoreSection} />
          </ScreenPanel>
        )}
        {activeTab === "Lobbies" && <ScreenPanel>{appMode === "web2" ? <LobbiesWeb2 /> : <Lobbies />}</ScreenPanel>}
        {activeTab === "Tournaments" && (
          <ScreenPanel>{appMode === "web2" ? <TournamentsWeb2 /> : <Tournaments />}</ScreenPanel>
        )}
        {activeTab === "Profile" && (
          <ScreenPanel>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  posthog.capture("profile_first_battle_clicked", { replay: firstBattleCompleted });
                  setIsTutorialOpen(true);
                }}
                className="border-2 border-solid border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors duration-150 hover:bg-phosphor-green/10"
                style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
              >
                {firstBattleCompleted ? "Replay first battle" : "Play first battle"}
              </button>
            </div>
            {appMode === "web2" ? <ProfileWeb2 /> : <Profile />}
          </ScreenPanel>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-near-black)" }}>
      <div className="shrink-0" style={hudRowStyle} aria-hidden={hideGlobalChrome}>
        <Header yourTurnCount={isSignedIn ? yourTurnCount : undefined} showSignIn={false} />
        {showNav && (
          <GameNav
            active={SECTION_FOR_TAB[activeTab]}
            onSelect={(section) => openTab(TAB_FOR_SECTION[section])}
            battlesAlert={yourTurnCount > 0}
          />
        )}
      </div>
      <main
        className={`flex min-h-0 w-full flex-1 flex-col ${
          hideGlobalChrome || !isSignedIn ? "p-0" : "pb-24 pt-4 md:pb-16"
        } ${isFullWidth || !isSignedIn ? "px-0" : "px-2 md:px-10 lg:px-20"}`}
      >
        <div className={`w-full ${isFullWidth || !isSignedIn ? "" : "mx-auto max-w-7xl"}`}>{content}</div>
      </main>
    </div>
  );
}
