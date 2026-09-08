"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import { useAccount } from "wagmi";
import Header from "./components/Header";
import AlphaDiscordNoticeBar from "./components/AlphaDiscordNoticeBar";
import FlowWalletNoticeBar from "./components/FlowWalletNoticeBar";
import SiteFooter from "./components/SiteFooter";
import ManageNavy from "./components/ManageNavy";
import ManageNavyWeb2 from "./components/ManageNavyWeb2";
import Lobbies from "./components/Lobbies";
import LobbiesWeb2 from "./components/LobbiesWeb2";
import { CampaignGraph } from "./components/CampaignGraph";
import { CampaignGraphWeb2 } from "./components/CampaignGraphWeb2";
import { RoguelikeCampaign } from "./components/RoguelikeCampaign";
import { RoguelikeCampaignWeb2 } from "./components/RoguelikeCampaignWeb2";
import Games from "./components/Games";
import GamesWeb2 from "./components/GamesWeb2";
import Profile from "./components/Profile";
import ProfileWeb2 from "./components/ProfileWeb2";
import Info from "./components/Info";
import Maps from "./components/Maps";
import MapsWeb2 from "./components/MapsWeb2";
import ShipAttributes from "./components/ShipAttributes";
import ShipAttributesWeb2 from "./components/ShipAttributesWeb2";
import ShipConstructor from "./components/ShipConstructor";
import ShipConstructorWeb2 from "./components/ShipConstructorWeb2";
import ShipPurchasePrices from "./components/ShipPurchasePrices";
import ShipPurchasePricesWeb2 from "./components/ShipPurchasePricesWeb2";
import { Tournaments } from "./components/Tournaments";
import { TournamentsWeb2 } from "./components/TournamentsWeb2";
import { useShipAttributesOwner } from "./hooks/useShipAttributesContract";
import { useShipPurchasePricesAccess } from "./hooks/useShipPurchasePricesAccess";
import { useOwnedShips } from "./hooks/useOwnedShips";
import { useOwnedShipsWeb2 } from "./hooks/useOwnedShipsWeb2";
import { usePlayerGames } from "./hooks/usePlayerGames";
import { usePlayerGamesWeb2 } from "./hooks/usePlayerGamesWeb2";
import { useCurrentUser } from "./hooks/useCurrentUser";
import { TUTORIAL_STEP_STORAGE_KEY } from "./types/onboarding";
import { MAP_ADMIN_ADDRESS } from "./config/alpha";
import { useAppMode } from "./hooks/useAppMode";
import { useWeb2Admin } from "./hooks/useWeb2Admin";
import posthog from "posthog-js";

/** Tabs we may persist; includes owner-only names so refresh works before contract reads resolve. */
const KNOWN_TAB_NAMES = new Set<string>([
  "Info",
  "Manage Navy",
  "Lobbies",
  "Campaign",
  "Roguelike",
  "Games",
  "Profile",
  "Maps",
  "Customize Ship",
  "Ship Attributes",
  "Purchase Prices",
  "Tournaments",
]);

export default function Home() {
  const { status, address, isConnected } = useAccount();
  const { isOwner } = useShipAttributesOwner();
  const { canAdminShipPurchasePrices } = useShipPurchasePricesAccess();
  const { ships, isLoading: shipsLoading } = useOwnedShips();
  const { ships: shipsWeb2, isLoading: shipsLoadingWeb2 } = useOwnedShipsWeb2();
  const { games: playerGames, isLoading: gamesLoading, refetch: refetchPlayerGames } = usePlayerGames();
  const {
    games: playerGamesWeb2,
    isLoading: gamesLoadingWeb2,
    refetch: refetchPlayerGamesWeb2,
  } = usePlayerGamesWeb2();
  const { userId: currentUserId, isLoggedIn, isLoading: isUserLoading } =
    useCurrentUser();
  const appMode = useAppMode();
  const isWeb2Admin = useWeb2Admin();

  // Initialize with default tab to prevent hydration mismatch
  const [activeTab, setActiveTab] = useState("Info");
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInfoTutorialActive, setIsInfoTutorialActive] = useState(false);
  const [isGamesDetailActive, setIsGamesDetailActive] = useState(false);
  const [isManageNavyPurchaseActive, setIsManageNavyPurchaseActive] =
    useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  const tabScrollRef = useRef<HTMLDivElement>(null);
  const [tabScrollMore, setTabScrollMore] = useState({ left: false, right: false });

  const updateTabScrollHints = useCallback(() => {
    const el = tabScrollRef.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      setTabScrollMore({ left: false, right: false });
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const epsilon = 3;
    setTabScrollMore({
      left: scrollLeft > epsilon,
      right: scrollLeft + clientWidth < scrollWidth - epsilon,
    });
  }, []);

  // Register tutorial chrome listener before paint so Info's layout effect can use it.
  useLayoutEffect(() => {
    const handleInfoTutorialActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsInfoTutorialActive(Boolean(custom.detail?.active));
    };

    window.addEventListener(
      "void-tactics-info-tutorial-active",
      handleInfoTutorialActive as EventListener,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-info-tutorial-active",
        handleInfoTutorialActive as EventListener,
      );
    };
  }, []);

  // Restore tab from localStorage once on mount. Owner tabs are not gated on
  // isOwner / canAdminShipPurchasePrices (those are false until reads finish).
  useLayoutEffect(() => {
    setIsHydrated(true);
    const savedTab = localStorage.getItem("void-tactics-active-tab");
    const savedGameId = localStorage.getItem("selectedGameId");
    const forceGamesTab =
      localStorage.getItem("void-tactics-force-games-tab") === "true";

    let nextTab = "Info";
    if (forceGamesTab) {
      nextTab = "Games";
      localStorage.removeItem("void-tactics-force-games-tab");
    } else if (savedGameId) {
      nextTab = "Games";
    } else if (savedTab && KNOWN_TAB_NAMES.has(savedTab)) {
      nextTab = savedTab;
    }

    setActiveTab(nextTab);

    const tutorialInProgress =
      localStorage.getItem(TUTORIAL_STEP_STORAGE_KEY) !== null;
    setIsInfoTutorialActive(tutorialInProgress && nextTab === "Info");
  }, []);

  // Leaving Info must drop tutorial chrome (tabs are hidden while it is on).
  useLayoutEffect(() => {
    if (activeTab !== "Info") {
      setIsInfoTutorialActive(false);
    }
  }, [activeTab]);

  // Listen for navigation events from Lobbies component
  useEffect(() => {
    const handleNavigateToGames = () => {
      setActiveTab("Games");
      // Lobbies.tsx already refetches its own usePlayerGames() instance
      // before firing this event, but that's a separate hook instance —
      // refetching there doesn't reliably update this component's own
      // playerGames/playerGamesWeb2 state, which is what actually gates
      // showGames and renders the Games tab here. Without this, the tab
      // (and its contents) stayed on stale pre-game data until a full page
      // reload remounted everything from scratch.
      void refetchPlayerGames();
      void refetchPlayerGamesWeb2();
    };

    window.addEventListener(
      "void-tactics-navigate-to-games",
      handleNavigateToGames,
    );
    document.addEventListener(
      "void-tactics-navigate-to-games",
      handleNavigateToGames,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-games",
        handleNavigateToGames,
      );
      document.removeEventListener(
        "void-tactics-navigate-to-games",
        handleNavigateToGames,
      );
    };
  }, [refetchPlayerGames, refetchPlayerGamesWeb2]);

  // Listen for "return to campaign" navigation from GameResultModal
  // (mission complete/failed screen) — mirrors handleNavigateToGames above.
  useEffect(() => {
    const handleNavigateToCampaign = () => {
      setActiveTab("Campaign");
    };

    window.addEventListener(
      "void-tactics-navigate-to-campaign",
      handleNavigateToCampaign,
    );
    document.addEventListener(
      "void-tactics-navigate-to-campaign",
      handleNavigateToCampaign,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-campaign",
        handleNavigateToCampaign,
      );
      document.removeEventListener(
        "void-tactics-navigate-to-campaign",
        handleNavigateToCampaign,
      );
    };
  }, []);

  // Same as above, for the Roguelike campaign's "Return to Run" CTA.
  useEffect(() => {
    const handleNavigateToRoguelike = () => {
      setActiveTab("Roguelike");
    };

    window.addEventListener(
      "void-tactics-navigate-to-roguelike",
      handleNavigateToRoguelike,
    );
    document.addEventListener(
      "void-tactics-navigate-to-roguelike",
      handleNavigateToRoguelike,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-roguelike",
        handleNavigateToRoguelike,
      );
      document.removeEventListener(
        "void-tactics-navigate-to-roguelike",
        handleNavigateToRoguelike,
      );
    };
  }, []);

  // Listen for Games tab detail view activation so we can hide global chrome.
  useEffect(() => {
    const handleGamesDetailActive = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      setIsGamesDetailActive(Boolean(custom.detail?.active));
    };

    window.addEventListener(
      "void-tactics-games-detail-active",
      handleGamesDetailActive as EventListener,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-games-detail-active",
        handleGamesDetailActive as EventListener,
      );
    };
  }, []);

  // Listen for Manage Navy mobile purchase takeover activation.
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

  // Listen for navigation events from Info (and elsewhere)
  useEffect(() => {
    const handleNavigateToLobbies = () => {
      setActiveTab("Lobbies");
    };

    window.addEventListener(
      "void-tactics-navigate-to-lobbies",
      handleNavigateToLobbies,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-lobbies",
        handleNavigateToLobbies,
      );
    };
  }, []);

  // Listen for navigation to Manage Navy (fleet) tab
  useEffect(() => {
    const handleNavigateToManageNavy = () => {
      setActiveTab("Manage Navy");
    };

    window.addEventListener(
      "void-tactics-navigate-to-manage-navy",
      handleNavigateToManageNavy,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-manage-navy",
        handleNavigateToManageNavy,
      );
    };
  }, []);

  // Listen for navigation to Info (e.g. clicking the header title/logo).
  useEffect(() => {
    const handleNavigateToInfo = () => {
      setActiveTab("Info");
    };

    window.addEventListener(
      "void-tactics-navigate-to-info",
      handleNavigateToInfo,
    );
    return () => {
      window.removeEventListener(
        "void-tactics-navigate-to-info",
        handleNavigateToInfo,
      );
    };
  }, []);

  // Once both identities are definitively logged out (not mid-connect/
  // mid-session-check), force the tab back to Info — a tab restored from a
  // previous logged-in session (e.g. an admin tab) shouldn't linger after
  // logout even though the tab bar itself is hidden while signed out.
  useEffect(() => {
    if (status === "connecting" || status === "reconnecting" || isUserLoading)
      return;
    if (!isConnected && !isLoggedIn && activeTab !== "Info") {
      setActiveTab("Info");
    }
  }, [status, isConnected, isLoggedIn, isUserLoading, activeTab]);

  // Save tab to localStorage whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("void-tactics-active-tab", activeTab);
    }
  }, [activeTab, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const orientationMq = window.matchMedia("(orientation: landscape)");
    const mobileMq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setIsLandscapeMobile(mobileMq.matches && orientationMq.matches);
    };
    sync();
    orientationMq.addEventListener("change", sync);
    mobileMq.addEventListener("change", sync);
    return () => {
      orientationMq.removeEventListener("change", sync);
      mobileMq.removeEventListener("change", sync);
    };
  }, []);

  // Keep tabs visible during loading to avoid flash-of-hidden-tabs for returning users.
  const hasShips =
    appMode === "web2" ? shipsLoadingWeb2 || shipsWeb2.length > 0 : shipsLoading || ships.length > 0;
  const hasGames =
    appMode === "web2"
      ? gamesLoadingWeb2 || playerGamesWeb2.length > 0
      : gamesLoading || playerGames.length > 0;
  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const hasYourTurn =
    appMode === "web2"
      ? playerGamesWeb2.some(
          (g) => g.metadata.winner === "" && g.turnState.currentTurn === currentUserId,
        )
      : isConnected &&
        playerGames.some(
          (g) =>
            g.metadata.winner === ZERO_ADDR &&
            g.turnState.currentTurn === address,
        );
  const showGames = hasGames || activeTab === "Games" || activeTab === "Profile";
  const showCustomizeShip = hasShips || activeTab === "Customize Ship";
  // Web2 mode signs in via NextAuth, never connects a wallet — `status`
  // (wagmi) would stay "disconnected" forever for those users, so the tab
  // bar needs a mode-aware "signed in" check instead.
  const isSignedIn = appMode === "web2" ? isLoggedIn : status === "connected";

  /** Hide site header (0px row) during Info onboarding tutorial or Games detail; not tied to wallet state. */
  const hideGlobalChrome =
    isInfoTutorialActive || isGamesDetailActive || isManageNavyPurchaseActive;
  const shouldHideFooterInLandscapeGameView =
    isLandscapeMobile && (isInfoTutorialActive || isGamesDetailActive);

  useLayoutEffect(() => {
    updateTabScrollHints();
  }, [
    updateTabScrollHints,
    activeTab,
    isOwner,
    canAdminShipPurchasePrices,
    showGames,
    showCustomizeShip,
    status,
    hideGlobalChrome,
  ]);

  useEffect(() => {
    if (status !== "connected" || hideGlobalChrome) return;
    const el = tabScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateTabScrollHints);
    ro.observe(el);
    el.addEventListener("scroll", updateTabScrollHints, { passive: true });
    window.addEventListener("resize", updateTabScrollHints);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateTabScrollHints);
      window.removeEventListener("resize", updateTabScrollHints);
    };
  }, [updateTabScrollHints, status, hideGlobalChrome]);

  // Scroll active tab into view on mobile when activeTab changes
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const el = tabScrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[aria-selected="true"]');
    activeBtn?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab, isHydrated]);

  const topChromeRowStyle: CSSProperties = hideGlobalChrome
    ? {
        height: "0px",
        minHeight: 0,
        maxHeight: "0px",
        overflow: "hidden",
        pointerEvents: "none",
      }
    : {};

  // Show loading state while wallet is connecting
  if (status === "connecting" || status === "reconnecting") {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "var(--color-near-black)" }}
      >
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <FlowWalletNoticeBar suppressed={hideGlobalChrome} />
        </div>
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <AlphaDiscordNoticeBar suppressed={hideGlobalChrome} />
        </div>
        <div
          className="shrink-0"
          style={topChromeRowStyle}
          aria-hidden={hideGlobalChrome}
        >
          <Header />
        </div>
        <main
          className={`flex min-h-0 flex-1 flex-col gap-4 px-2 md:gap-8 md:px-10 lg:px-20 w-full max-w-7xl mx-auto ${
            hideGlobalChrome ? "pt-0 pb-0" : "pt-4 pb-8 sm:pb-16 md:pb-20"
          }`}
        >
          <div
            className="border-0 bg-transparent p-2 md:border md:border-solid md:bg-[var(--color-slate)] md:p-8"
            style={{
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
            }}
          >
            <div
              className="text-center uppercase"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                color: "var(--color-cyan)",
              }}
            >
              <div className="text-2xl mb-4 font-bold tracking-wider">
                VOID TACTICS
              </div>
              <div className="text-lg">Connecting to wallet...</div>
            </div>
          </div>
        </main>
        {!shouldHideFooterInLandscapeGameView && (
          <div className="shrink-0">
            <SiteFooter />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--color-near-black)" }}
    >
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <FlowWalletNoticeBar suppressed={hideGlobalChrome} />
      </div>
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <AlphaDiscordNoticeBar suppressed={hideGlobalChrome} />
      </div>
      <div
        className="shrink-0"
        style={topChromeRowStyle}
        aria-hidden={hideGlobalChrome}
      >
        <Header />
      </div>
      <main
        className={`flex min-h-0 flex-1 flex-col gap-4 w-full md:gap-8 ${
          hideGlobalChrome ? "pt-0 pb-0" : "pt-4 pb-8 sm:pb-16 md:pb-20"
        } ${
          activeTab === "Games" || isInfoTutorialActive
            ? "px-0"
            : "px-2 md:px-10 lg:px-20"
        }`}
      >
        {/* Game Tabs */}
        <div
          className={`w-full ${
            activeTab === "Maps" ||
            activeTab === "Games" ||
            isInfoTutorialActive
              ? ""
              : "max-w-7xl mx-auto"
          }`}
        >
          {isSignedIn && !hideGlobalChrome && (
            <div className="relative -mx-2 mb-4 px-2 pb-1 md:mx-0 md:mb-8 md:px-0 md:pb-0">
              <div
                ref={tabScrollRef}
                className="overflow-x-auto overflow-y-hidden [scrollbar-width:thin] md:overflow-visible"
              >
              <div
                className="flex w-max min-w-full snap-x snap-mandatory gap-2 md:w-full md:snap-none md:flex-wrap md:justify-center"
                role="tablist"
                aria-label={
                  tabScrollMore.left || tabScrollMore.right
                    ? "Main sections, scroll sideways for more tabs"
                    : "Main sections"
                }
              >
              {(() => {
                const tabs = ["Info", "Manage Navy", "Lobbies", "Tournaments"];
                tabs.push("Campaign");
                tabs.push("Roguelike");
                // Games shows whenever Lobbies does (i.e. unconditionally) —
                // previously gated behind hasGames, which hid the tab until
                // a player's first game existed. Profile keeps its own gate.
                tabs.push("Games");
                if (showGames) tabs.push("Profile");
                if (
                  address?.toLowerCase() === MAP_ADMIN_ADDRESS.toLowerCase() ||
                  isWeb2Admin ||
                  activeTab === "Maps"
                ) {
                  tabs.push("Maps");
                }
                if (showCustomizeShip) tabs.push("Customize Ship");
                if (isOwner || isWeb2Admin || activeTab === "Ship Attributes") {
                  tabs.push("Ship Attributes");
                }
                if (
                  canAdminShipPurchasePrices ||
                  isWeb2Admin ||
                  activeTab === "Purchase Prices"
                ) {
                  tabs.push("Purchase Prices");
                }
                return tabs;
              })().map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveTab(tab);
                      posthog.capture("tab_navigated", { tab_name: tab });
                    }}
                    className={`shrink-0 snap-start px-4 py-2.5 min-h-11 border-2 border-solid text-xs uppercase font-semibold tracking-wider transition-colors duration-150 sm:px-5 sm:text-sm md:min-h-0 md:px-6 md:py-3 md:text-base ${
                      isActive
                        ? "border-cyan text-cyan bg-steel"
                        : "border-gunmetal border-t-steel border-l-steel text-text-secondary bg-slate hover:border-cyan hover:text-cyan hover:bg-steel"
                    }`}
                    style={{
                      fontFamily:
                        "var(--font-rajdhani), 'Arial Black', sans-serif",
                    }}
                  >
                    [{tab.toUpperCase()}]
                    {tab === "Games" && hasYourTurn && (
                      <span
                        className="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-phosphor-green align-middle"
                        aria-label="Your turn"
                      />
                    )}
                  </button>
                );
              })}
              </div>
              </div>
              <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-[2] flex w-11 items-center justify-start bg-gradient-to-r from-[var(--color-near-black)] from-[35%] to-transparent pl-0.5 text-xl font-black leading-none text-cyan/90 transition-opacity duration-200 md:hidden ${
                  tabScrollMore.left ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  fontFamily:
                    "var(--font-rajdhani), 'Arial Black', sans-serif",
                }}
                aria-hidden
              >
                ‹
              </div>
              <div
                className={`pointer-events-none absolute inset-y-0 right-0 z-[2] flex w-11 items-center justify-end bg-gradient-to-l from-[var(--color-near-black)] from-[35%] to-transparent pr-0.5 text-xl font-black leading-none text-cyan/90 transition-opacity duration-200 md:hidden ${
                  tabScrollMore.right ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  fontFamily:
                    "var(--font-rajdhani), 'Arial Black', sans-serif",
                }}
                aria-hidden
              >
                ›
              </div>
            </div>
          )}

          {/* Tab Content */}
          {!isHydrated ? (
            // Server-rendered HTML has no access to the localStorage-saved
            // tab, so activeTab starts as "Info" — rendering that here would
            // flash the Info tab's content before the layout effect above
            // restores the real tab. Render nothing for this one frame
            // instead; isHydrated flips true in the same effect that
            // restores activeTab, so this is barely perceptible.
            <div className="w-full" />
          ) : activeTab === "Maps" ? (
            <div className="w-full">
              <div
                className="border border-solid p-1"
                style={{
                  backgroundColor: "var(--color-slate)",
                  borderColor: "var(--color-gunmetal)",
                  borderTopColor: "var(--color-steel)",
                  borderLeftColor: "var(--color-steel)",
                }}
              >
                {appMode === "web2" ? <MapsWeb2 /> : <Maps />}
              </div>
            </div>
          ) : activeTab === "Games" ? (
            <div
              className={`w-full ${
                isGamesDetailActive ? "px-0" : "px-2 sm:px-4"
              }`}
            >
              <div
                className={`${
                  isGamesDetailActive ? "border-0 p-0" : "border border-solid p-4"
                }`}
                style={{
                  backgroundColor: isGamesDetailActive
                    ? "transparent"
                    : "var(--color-slate)",
                  borderColor: isGamesDetailActive
                    ? "transparent"
                    : "var(--color-gunmetal)",
                  borderTopColor: isGamesDetailActive
                    ? "transparent"
                    : "var(--color-steel)",
                  borderLeftColor: isGamesDetailActive
                    ? "transparent"
                    : "var(--color-steel)",
                }}
              >
                {appMode === "web2" ? <GamesWeb2 /> : <Games />}
              </div>
            </div>
          ) : (
            <div
              className={
                isInfoTutorialActive
                  ? "border-0 bg-transparent p-0"
                  : "border-0 bg-transparent p-0 md:border md:border-solid md:bg-[var(--color-slate)] md:p-8"
              }
              style={{
                borderColor: isInfoTutorialActive
                  ? "transparent"
                  : "var(--color-gunmetal)",
                borderTopColor: isInfoTutorialActive
                  ? "transparent"
                  : "var(--color-steel)",
                borderLeftColor: isInfoTutorialActive
                  ? "transparent"
                  : "var(--color-steel)",
              }}
            >
              {activeTab === "Manage Navy" &&
                (appMode === "web2" ? <ManageNavyWeb2 /> : <ManageNavy />)}
              {activeTab === "Lobbies" &&
                (appMode === "web2" ? <LobbiesWeb2 /> : <Lobbies />)}
              {activeTab === "Campaign" &&
                (appMode === "web2" ? <CampaignGraphWeb2 /> : <CampaignGraph />)}
              {activeTab === "Roguelike" &&
                (appMode === "web2" ? <RoguelikeCampaignWeb2 /> : <RoguelikeCampaign />)}
              {activeTab === "Profile" &&
                (appMode === "web2" ? <ProfileWeb2 /> : <Profile />)}
              {activeTab === "Info" && <Info />}
              {activeTab === "Ship Attributes" &&
                (appMode === "web2" ? <ShipAttributesWeb2 /> : <ShipAttributes />)}
              {activeTab === "Purchase Prices" &&
                (appMode === "web2" ? (
                  <ShipPurchasePricesWeb2 />
                ) : (
                  <ShipPurchasePrices />
                ))}
              {activeTab === "Customize Ship" &&
                (appMode === "web2" ? <ShipConstructorWeb2 /> : <ShipConstructor />)}
              {activeTab === "Tournaments" &&
                (appMode === "web2" ? <TournamentsWeb2 /> : <Tournaments />)}
            </div>
          )}
        </div>
      </main>
      {!shouldHideFooterInLandscapeGameView && (
        <div className="shrink-0">
          <SiteFooter />
        </div>
      )}
    </div>
  );
}
