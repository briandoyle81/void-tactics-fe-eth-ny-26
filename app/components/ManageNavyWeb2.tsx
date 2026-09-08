"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Web2Ship } from "../types/web2Ship";
import { apiMutate } from "../lib/apiMutate";
import ShipCard from "./ShipCard";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { ShipPurchaseInterfaceWeb2 } from "./ShipPurchaseInterfaceWeb2";
import { ShipPurchasePanel } from "./ShipPurchasePanel";
import { navyFilterSecondaryOptionsWeb2, filterAndSortShipsWeb2 } from "../utils/navyFiltersWeb2";
import { useNavyFilterState } from "../hooks/useNavyFilterState";
import { useStarredShips } from "../hooks/useStarredShips";
import { useFleetComposition } from "../hooks/useFleetComposition";
import { reorderByFleetComposition } from "../utils/fleetCompositionStorage";
import { NavyFilterToolbar } from "./NavyFilterToolbar";
import { NavyPagination } from "./NavyPagination";
import { FleetCompositionSelect } from "./FleetCompositionSelect";
import { FleetCompositionControls } from "./FleetCompositionControls";
import { FleetCompositionLocalNoticeModal } from "./FleetCompositionLocalNoticeModal";
import { RecycleConfirmModal } from "./RecycleConfirmModal";
import { RecycleConfirmButtonWeb2 } from "./RecycleConfirmButtonWeb2";
import { RecycleLockedNotice } from "./RecycleLockedNotice";
import { useRecycleEligibilityWeb2 } from "../hooks/useRecycleEligibilityWeb2";
import { ManageNavyActionButton } from "./ManageNavyActionButton";
import { ManageNavyShipsCountHeading } from "./ManageNavyShipsCountHeading";
import { ManageNavyFleetCompositionCardSlot } from "./ManageNavyFleetCompositionCardSlot";
import { ClaimFreeShipsControls } from "./ClaimFreeShipsControls";
import { ClaimFreeButtonWeb2 } from "./ClaimFreeButtonWeb2";
import { useClaimFreeEligibilityWeb2 } from "../hooks/useClaimFreeEligibilityWeb2";
import { useInvalidateUserBalanceWeb2, useUserBalanceWeb2 } from "../hooks/useUserBalanceWeb2";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import { MockPurchaseConfirmModal } from "./MockPurchaseConfirmModal";
import {
  ManageNavyDroneFactoryBrief,
  ManageNavyConstructDeliveryBrief,
  ManageNavyBuyShipsBrief,
  ManageNavyMobileTutorialSheet,
} from "./ManageNavyTutorialPanels";
import {
  clearManageNavyTutorialCacheWeb2,
  dismissBuyShipsTutorialForSessionWeb2,
  dismissConstructDeliveryTutorialForSessionWeb2,
  dismissDroneFactoryTutorialForSessionWeb2,
  hasCompletedBuyShipsTutorialWeb2,
  hasCompletedConstructDeliveryTutorialWeb2,
  hasEverClickedFreeShipClaimWeb2,
  isBuyShipsTutorialPermanentlyDismissedWeb2,
  isBuyShipsTutorialSessionDismissedWeb2,
  isConstructDeliveryTutorialPermanentlyDismissedWeb2,
  isConstructDeliveryTutorialSessionDismissedWeb2,
  isDroneFactoryTutorialPermanentlyDismissedWeb2,
  isDroneFactoryTutorialSessionDismissedWeb2,
  persistBuyShipsTutorialCompletedWeb2,
  persistBuyShipsTutorialPermanentlyDismissedWeb2,
  persistConstructDeliveryTutorialCompletedWeb2,
  persistConstructDeliveryTutorialPermanentlyDismissedWeb2,
  persistDroneFactoryTutorialPermanentlyDismissedWeb2,
  persistFreeShipClaimClickedWeb2,
} from "../utils/freeShipClaimTutorialStorageWeb2";

// Web2's fleet-composition export/import compatibility tag — there's no
// "chain" concept in web2, so this is a fixed constant (any web2 export can
// be imported by any web2 user; see fleetCompositionStorage.ts).
const FLEET_COMPOSITION_SCOPE_TAG = "web2";

// Web2-mode counterpart to `ManageNavy.tsx`. Ships-UI slice for web2 —
// list, purchase (USD/UTC), construct (single/all), recycle (single/bulk),
// claim-free, plus filters/sort/pagination/starring sharing UI with web3's
// `ManageNavy.tsx` (NavyFilterToolbar/NavyPagination/useNavyFilterState/
// useStarredShips, see app/utils/navyFiltersWeb2.ts). Fleet-composition
// presets are still web3-only — see the ManageNavyWeb2-parity plan for
// what's still open.
//
// Note: the USD purchase route has no real payment gate on the branch this
// was ported from (no Stripe/checkout integration exists) — it grants ships
// directly. Treat it as a placeholder until a real payment step is added.

const SHIPS_PER_PAGE = 100;

const ManageNavyWeb2: React.FC = () => {
  const { ships, isLoading, error, refetch } = useOwnedShipsWeb2();
  const { userId } = useCurrentUser();
  // Matches web3 ManageNavy.tsx's `fleetStats.unconstructedShips === 0` gate.
  const hasUnconstructedShips = ships.some((s) => !s.shipData.constructed);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const [showShipPurchase, setShowShipPurchase] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"usd" | "utc">("usd");
  const [showRecycleModal, setShowRecycleModal] = useState(false);
  const [shipToRecycle, setShipToRecycle] = useState<Web2Ship | null>(null);
  const filterState = useNavyFilterState(SHIPS_PER_PAGE);
  const { starredShips, toggleStar } = useStarredShips(userId ?? "");
  const claimFreeEligibility = useClaimFreeEligibilityWeb2();
  const invalidateBalance = useInvalidateUserBalanceWeb2();
  const { creditBalance } = useUserBalanceWeb2();
  const { tiers: purchaseTiers } = usePurchaseTiersWeb2();
  const recycleEligibility = useRecycleEligibilityWeb2();
  const [pendingShipPurchase, setPendingShipPurchase] = useState<{
    tier: number;
    currency: "usd" | "utc";
  } | null>(null);
  const [showInGameProperties, setShowInGameProperties] = useState(true);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const compactMq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setIsMobileLayout(mobileMq.matches);
      setIsCompactViewport(compactMq.matches);
    };
    sync();
    mobileMq.addEventListener("change", sync);
    compactMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      compactMq.removeEventListener("change", sync);
    };
  }, []);
  const showMobileShipPurchaseTakeover = showShipPurchase && isCompactViewport;

  // ── Onboarding tutorial series (drone/claim -> construct delivery -> buy
  // ships) — mirrors ManageNavy.tsx's three-step state machine exactly,
  // backed by freeShipClaimTutorialStorageWeb2.ts (keyed by userId instead
  // of chainId+address) and the same genuinely-shared, chain-agnostic
  // ManageNavyTutorialPanels.tsx components web3 uses.
  const shouldForceDroneFactoryTutorial =
    ships.length === 0 || (ships.length > 0 && ships.length <= 3);
  const [showDroneFactoryTutorial, setShowDroneFactoryTutorial] = useState(false);

  const markFreeShipClaimClickedForTutorial = useCallback(() => {
    if (!userId) return;
    persistFreeShipClaimClickedWeb2(userId);
    setShowDroneFactoryTutorial(false);
  }, [userId]);

  const dismissDroneFactoryTutorialNotNow = useCallback(
    (dontShowAgain: boolean) => {
      dismissDroneFactoryTutorialForSessionWeb2();
      if (dontShowAgain && userId) persistDroneFactoryTutorialPermanentlyDismissedWeb2(userId);
      setShowDroneFactoryTutorial(false);
    },
    [userId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialPermanentlyDismissedWeb2(userId)) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (hasEverClickedFreeShipClaimWeb2(userId) && !shouldForceDroneFactoryTutorial) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialSessionDismissedWeb2()) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    setShowDroneFactoryTutorial(true);
  }, [userId, shouldForceDroneFactoryTutorial]);

  const [showConstructDeliveryTutorial, setShowConstructDeliveryTutorial] = useState(false);

  const dismissConstructDeliveryTutorialNotNow = useCallback(
    (dontShowAgain: boolean) => {
      dismissConstructDeliveryTutorialForSessionWeb2();
      if (dontShowAgain && userId) persistConstructDeliveryTutorialPermanentlyDismissedWeb2(userId);
      setShowConstructDeliveryTutorial(false);
    },
    [userId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isConstructDeliveryTutorialPermanentlyDismissedWeb2(userId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isLoading || ships.length === 0) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasEverClickedFreeShipClaimWeb2(userId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (hasCompletedConstructDeliveryTutorialWeb2(userId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isConstructDeliveryTutorialSessionDismissedWeb2()) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasUnconstructedShips) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    setShowConstructDeliveryTutorial(true);
  }, [userId, isLoading, ships.length, hasUnconstructedShips]);

  // Once navy data is loaded and nothing is left unconstructed, mark this
  // step done — gated on !isLoading same as web3, so an empty in-flight
  // ships array can't be mistaken for "nothing to construct".
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    if (isLoading || ships.length === 0) return;
    if (!hasEverClickedFreeShipClaimWeb2(userId)) return;
    if (hasCompletedConstructDeliveryTutorialWeb2(userId)) return;
    if (hasUnconstructedShips) return;
    persistConstructDeliveryTutorialCompletedWeb2(userId);
  }, [userId, isLoading, ships.length, hasUnconstructedShips]);

  const [showBuyShipsTutorial, setShowBuyShipsTutorial] = useState(false);

  const dismissBuyShipsTutorialNotNow = useCallback(
    (dontShowAgain: boolean) => {
      dismissBuyShipsTutorialForSessionWeb2();
      if (dontShowAgain && userId) persistBuyShipsTutorialPermanentlyDismissedWeb2(userId);
      setShowBuyShipsTutorial(false);
    },
    [userId],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !userId) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isBuyShipsTutorialPermanentlyDismissedWeb2(userId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isLoading || ships.length === 0) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (!hasCompletedConstructDeliveryTutorialWeb2(userId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (hasCompletedBuyShipsTutorialWeb2(userId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isBuyShipsTutorialSessionDismissedWeb2()) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (hasUnconstructedShips) {
      setShowBuyShipsTutorial(false);
      return;
    }
    setShowBuyShipsTutorial(true);
  }, [userId, isLoading, ships.length, hasUnconstructedShips]);

  const showManageNavyTutorialChrome =
    showDroneFactoryTutorial || showConstructDeliveryTutorial || showBuyShipsTutorial;

  const handleBuyNewShipsClick = useCallback(() => {
    if (userId && showBuyShipsTutorial) {
      persistBuyShipsTutorialCompletedWeb2(userId);
      setShowBuyShipsTutorial(false);
    }
    setShowShipPurchase(true);
  }, [userId, showBuyShipsTutorial]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("void-tactics-manage-navy-purchase-active", {
        detail: { active: showMobileShipPurchaseTakeover },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("void-tactics-manage-navy-purchase-active", { detail: { active: false } }),
      );
    };
  }, [showMobileShipPurchaseTakeover]);
  const shipIds = useMemo(() => ships.map((s) => s.id), [ships]);
  const {
    attributesByShipId,
    isLoading: attributesLoading,
    isFromCache,
  } = useShipAttributesByIdsWeb2(shipIds);

  const getSecondaryOptions = useCallback(
    (category: Parameters<typeof navyFilterSecondaryOptionsWeb2>[0]) =>
      navyFilterSecondaryOptionsWeb2(category, ships),
    [ships],
  );

  const filteredAndSortedShips = useMemo(
    () =>
      filterAndSortShipsWeb2(
        ships,
        filterState.activeFilters,
        filterState.sortBy,
        filterState.sortOrder,
        starredShips,
      ),
    [ships, filterState.activeFilters, filterState.sortBy, filterState.sortOrder, starredShips],
  );

  // validShipIds: alive + constructed ships eligible for a fleet preset.
  // `null` while ships are still loading, so auto-prune doesn't strip
  // presets just because the ship list is momentarily empty.
  const validFleetCompositionShipIds = useMemo(
    () =>
      isLoading
        ? null
        : new Set(
            ships
              .filter((s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0)
              .map((s) => String(s.id)),
          ),
    [ships, isLoading],
  );
  const fleetComposition = useFleetComposition(
    userId ?? "",
    FLEET_COMPOSITION_SCOPE_TAG,
    validFleetCompositionShipIds,
  );

  const shipsForGridDisplay = useMemo(
    () =>
      reorderByFleetComposition(filteredAndSortedShips, fleetComposition.activeFleet, (s) =>
        String(s.id),
      ),
    [filteredAndSortedShips, fleetComposition.activeFleet],
  );

  // Threat total is web2-native: `shipData.cost` is already a number, so no
  // bigint conversion boundary is needed here (unlike ManageNavy.tsx).
  const activeCompositionThreatTotal = useMemo(() => {
    if (!fleetComposition.activeFleet) return 0;
    return fleetComposition.activeFleet.shipIds.reduce((sum, id) => {
      const s = ships.find((x) => String(x.id) === id);
      if (!s || !s.shipData.constructed || s.shipData.timestampDestroyed > 0) {
        return sum;
      }
      return sum + s.shipData.cost;
    }, 0);
  }, [fleetComposition.activeFleet, ships]);

  const paginatedShips = useMemo(
    () => filterState.paginate(shipsForGridDisplay),
    // filterState is a fresh object every render; depend on the specific
    // stable members actually used, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipsForGridDisplay, filterState.page, filterState.paginate],
  );

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selected.size === shipsForGridDisplay.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(shipsForGridDisplay.map((s) => s.id)));
    }
  };

  const runAction = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
      } finally {
        setBusy(false);
      }
    },
    [refetch],
  );

  const handleConstructAll = () =>
    runAction("construct ships", async () => {
      const result = await apiMutate<{ constructed: number }>("/api/ships/construct", "POST", { all: true });
      if (userId && showConstructDeliveryTutorial) {
        persistConstructDeliveryTutorialCompletedWeb2(userId);
        setShowConstructDeliveryTutorial(false);
      }
      toast.success(`Constructed ${result.constructed} ship(s)`);
    });

  const handleRecycleClick = (ship: Web2Ship) => {
    setShipToRecycle(ship);
    setShowRecycleModal(true);
  };

  const handleRecycleCancel = () => {
    setShowRecycleModal(false);
  };

  const handleRecycleSelected = () =>
    runAction("recycle ships", async () => {
      const result = await apiMutate<{ recycled: number; creditEarned: number }>(
        "/api/ships/recycle",
        "POST",
        { shipIds: Array.from(selected) },
      );
      toast.success(
        `Recycled ${result.recycled} ship(s)${result.creditEarned ? ` (+${result.creditEarned} UTC)` : ""}`,
      );
      setSelected(new Set());
      if (result.creditEarned) invalidateBalance();
    });

  // Ship purchases have no real payment gate (see the doc comment at the top
  // of this file) and previously executed immediately on tier click with no
  // confirmation step — MockPurchaseConfirmModal inserts one so the flow
  // feels like a real checkout. `handleRequestShipPurchase` (passed as
  // ShipPurchaseInterfaceWeb2's onPurchase) just opens the confirmation;
  // `executeShipPurchase` is the real purchase call, only run after confirm.
  const executeShipPurchase = (tier: number, currency: "usd" | "utc") =>
    runAction("purchase ships", async () => {
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        `/api/ships/purchase/${currency}`,
        "POST",
        { tier },
      );
      toast.success(`Purchased ${result.ships.length} ship(s)`);
      setShowShipPurchase(false);
      if (currency === "utc") invalidateBalance();
    });

  const handleRequestShipPurchase = (tier: number, currency: "usd" | "utc") => {
    setPendingShipPurchase({ tier, currency });
  };

  const handleConfirmShipPurchase = async () => {
    if (!pendingShipPurchase) return;
    await executeShipPurchase(pendingShipPurchase.tier, pendingShipPurchase.currency);
    setPendingShipPurchase(null);
  };

  const pendingTierConfig = pendingShipPurchase
    ? purchaseTiers.find((t) => t.tier === pendingShipPurchase.tier)
    : undefined;

  const recyclableSelectedCount = Array.from(selected).filter((id) => {
    const ship = ships.find((s) => s.id === id);
    return ship && !ship.shipData.inFleet && !ship.shipData.isFree;
  }).length;

  const claimFreeShipControls = (
    <ClaimFreeShipsControls
      isLoadingClaimStatus={claimFreeEligibility.isLoadingClaimStatus}
      error={claimFreeEligibility.claimStatusError}
      isEligible={claimFreeEligibility.isEligible}
      nextClaimInFormatted={claimFreeEligibility.nextClaimInFormatted}
      claimButton={
        <ClaimFreeButtonWeb2
          onPress={markFreeShipClaimClickedForTutorial}
          analyticsSurface="manage_navy"
          onSuccess={() => {
            refetch();
            claimFreeEligibility.refetch();
          }}
        />
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ManageNavyShipsCountHeading
          shownCount={filteredAndSortedShips.length}
          totalCount={ships.length}
          perPage={SHIPS_PER_PAGE}
          page={filterState.page}
        />
        <label className="hidden cursor-pointer items-center gap-2 text-sm md:flex">
          <input
            type="checkbox"
            checked={showDebugButtons}
            onChange={(e) => setShowDebugButtons(e.target.checked)}
            className="w-4 h-4"
          />
          <span style={{ color: "var(--color-text-secondary)" }}>Debug Mode</span>
        </label>
        {showDebugButtons && (
          <button
            onClick={() => {
              if (!userId) {
                toast.error("Sign in to clear tutorial cache");
                return;
              }
              clearManageNavyTutorialCacheWeb2(userId);
              setShowDroneFactoryTutorial(true);
              setShowConstructDeliveryTutorial(false);
              setShowBuyShipsTutorial(false);
              toast.success("Cleared Manage Navy tutorial cache");
            }}
            className="px-4 py-2 rounded-none border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm transition-all duration-200"
          >
            [CLEAR TUTORIAL CACHE]
          </button>
        )}
        {/* "Live" mirrors ManageNavy.tsx's isListening, which is itself just
            !!address dressed up as a connection indicator, not a real
            websocket/SSE health check — !!userId is the honest web2
            equivalent of that same signal. */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2"
            style={{
              backgroundColor: userId ? "var(--color-phosphor-green)" : "var(--color-warning-red)",
              animation: userId ? "pulse-functional 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span
            className="text-xs uppercase font-semibold tracking-wider"
            style={{
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: userId ? "var(--color-phosphor-green)" : "var(--color-warning-red)",
            }}
          >
            {userId ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        {ships.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                borderColor: "var(--color-gunmetal)",
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-steel)",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-cyan)";
                e.currentTarget.style.color = "var(--color-cyan)";
                e.currentTarget.style.backgroundColor = "var(--color-slate)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
                e.currentTarget.style.backgroundColor = "var(--color-steel)";
              }}
            >
              {selected.size === shipsForGridDisplay.length ? "[DESELECT ALL]" : "[SELECT ALL]"}
            </button>
            {selected.size > 0 && (
              <span
                className="text-sm uppercase tracking-wider"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  color: "var(--color-text-secondary)",
                }}
              >
                {selected.size} selected
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={`relative isolate mb-2 flex w-full flex-col items-stretch justify-center gap-4 overflow-visible md:flex-row md:flex-wrap md:items-center ${
          showManageNavyTutorialChrome ? "z-[200]" : ""
        }`}
      >
        {showConstructDeliveryTutorial ? (
          <div className="relative flex w-full flex-col gap-4 md:inline-flex md:w-auto md:flex-row md:items-start md:gap-4">
            <div className="relative z-[100] w-full min-w-0 shrink-0 md:w-auto">
              <div className="border border-amber/90 bg-amber/24 animate-pulse p-[3px]" style={{ borderRadius: 0 }}>
                <ManageNavyActionButton variant="green" onClick={handleConstructAll} disabled={busy || !hasUnconstructedShips}>
                  [CONSTRUCT ALL SHIPS]
                </ManageNavyActionButton>
              </div>
              <ManageNavyConstructDeliveryBrief
                className="absolute left-full top-0 z-[110] ml-4"
                constructButtonLabel="[CONSTRUCT ALL SHIPS]"
                onNotNow={dismissConstructDeliveryTutorialNotNow}
              />
            </div>
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 md:w-auto">
              <ManageNavyActionButton variant="cyan" onClick={handleBuyNewShipsClick} disabled={busy}>
                [BUY NEW SHIPS]
              </ManageNavyActionButton>
              <div className="shrink-0">{claimFreeShipControls}</div>
              <div className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block" aria-hidden="true" />
            </div>
          </div>
        ) : showBuyShipsTutorial ? (
          <div className="relative flex w-full flex-col gap-4 md:inline-flex md:w-auto md:flex-row md:items-start md:gap-4">
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 md:flex-row md:gap-4 md:w-auto">
              <ManageNavyActionButton variant="green" onClick={handleConstructAll} disabled={busy || !hasUnconstructedShips}>
                [CONSTRUCT ALL SHIPS]
              </ManageNavyActionButton>
              <div className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block" aria-hidden="true" />
            </div>
            <div className="relative z-[100] w-full shrink-0 md:w-auto">
              <ManageNavyBuyShipsBrief
                className="absolute right-full top-0 z-[110] mr-4"
                onNotNow={dismissBuyShipsTutorialNotNow}
              />
              <div className="border border-amber/90 bg-amber/24 animate-pulse p-[3px]" style={{ borderRadius: 0 }}>
                <ManageNavyActionButton variant="cyan" onClick={handleBuyNewShipsClick} disabled={busy}>
                  [BUY NEW SHIPS]
                </ManageNavyActionButton>
              </div>
            </div>
            <div className="relative z-10 shrink-0">
              <div className="relative">
                {claimFreeShipControls}
                <div className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block" aria-hidden="true" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-3 md:w-auto">
              <ManageNavyActionButton variant="green" onClick={handleConstructAll} disabled={busy || !hasUnconstructedShips}>
                [CONSTRUCT ALL SHIPS]
              </ManageNavyActionButton>
              <ManageNavyActionButton variant="cyan" onClick={handleBuyNewShipsClick} disabled={busy}>
                [BUY NEW SHIPS]
              </ManageNavyActionButton>
              {showDroneFactoryTutorial && (
                <div className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block" aria-hidden="true" />
              )}
            </div>
            <div className={showDroneFactoryTutorial ? "relative z-[100] w-full shrink-0 md:w-auto" : "relative z-30 w-full shrink-0 md:w-auto"}>
              {showDroneFactoryTutorial && (
                <ManageNavyDroneFactoryBrief
                  className="absolute right-full top-0 z-[110] mr-4"
                  onNotNow={dismissDroneFactoryTutorialNotNow}
                />
              )}
              <div
                className={showDroneFactoryTutorial ? "border border-amber/90 bg-amber/24 animate-pulse p-[3px]" : "p-0"}
                style={{ borderRadius: 0 }}
              >
                {claimFreeShipControls}
              </div>
            </div>
          </div>
        )}

        {selected.size > 0 && recycleEligibility.canRecycle && (
          recyclableSelectedCount > 0 ? (
            <ManageNavyActionButton
              variant="red"
              onClick={handleRecycleSelected}
              disabled={busy}
            >
              {`[RECYCLE ${recyclableSelectedCount} SHIPS]`}
            </ManageNavyActionButton>
          ) : (
            <div className="w-full px-4 py-3 text-center text-sm font-mono font-bold tracking-wider text-amber opacity-50 sm:px-6 md:w-auto rounded-none border-2 border-amber">
              [SELECTED SHIPS ARE IN FLEETS - CANNOT RECYCLE]
            </div>
          )
        )}
        {!recycleEligibility.canRecycle && userId && (
          <RecycleLockedNotice
            purchasedCount={recycleEligibility.purchasedShipCount}
            threshold={recycleEligibility.threshold}
          />
        )}
      </div>

      <ShipPurchasePanel
        show={showShipPurchase}
        onClose={() => setShowShipPurchase(false)}
        mobileTakeover={showMobileShipPurchaseTakeover}
        paymentMethods={[
          { id: "usd", label: "USD", activeBorderClass: "border-phosphor-green", activeTextClass: "text-phosphor-green", activeBgClass: "bg-phosphor-green/10" },
          { id: "utc", label: "UTC", activeBorderClass: "border-amber", activeTextClass: "text-amber", activeBgClass: "bg-amber/10" },
        ]}
        activePaymentMethodId={paymentMethod}
        onSelectPaymentMethod={(id) => setPaymentMethod(id as "usd" | "utc")}
      >
        <ShipPurchaseInterfaceWeb2
          paymentMethod={paymentMethod}
          onPurchase={handleRequestShipPurchase}
          busy={busy}
        />
      </ShipPurchasePanel>

      <MockPurchaseConfirmModal
        show={pendingShipPurchase !== null}
        title="CONFIRM SHIP PURCHASE"
        lineItems={
          pendingTierConfig
            ? [
                { label: "Ships", value: String(pendingTierConfig.shipCount) },
                { label: "Tier", value: `#${pendingTierConfig.tier}` },
              ]
            : []
        }
        totalLabel={
          pendingTierConfig
            ? pendingShipPurchase?.currency === "utc"
              ? `${pendingTierConfig.priceUtc} UTC`
              : `$${(pendingTierConfig.priceUsdCents / 100).toFixed(2)}`
            : ""
        }
        paymentMethod={pendingShipPurchase?.currency ?? "usd"}
        utcBalance={creditBalance}
        utcBalanceAfter={creditBalance - (pendingTierConfig?.priceUtc ?? 0)}
        isProcessing={busy}
        onCancel={() => setPendingShipPurchase(null)}
        onConfirm={() => void handleConfirmShipPurchase()}
      />

      {isLoading && <div className="font-mono text-sm text-text-muted">Loading ships…</div>}
      {error && <div className="font-mono text-sm text-warning-red">{error}</div>}

      {!isLoading && ships.length === 0 && (
        <div className="font-mono text-sm text-text-muted">
          No ships yet — claim your free ships or purchase a pack above.
        </div>
      )}

      {ships.length > 0 && (
        <div
          className="border border-solid p-3 sm:p-4"
          style={{
            backgroundColor: "var(--color-slate)",
            borderColor: "var(--color-gunmetal)",
            borderTopColor: "var(--color-steel)",
            borderLeftColor: "var(--color-steel)",
            borderRadius: 0,
          }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <FleetCompositionSelect
              fleetCompositions={fleetComposition.fleetCompositions}
              selectedId={fleetComposition.selectedId}
              onChange={fleetComposition.onSelectChange}
            />
            <NavyFilterToolbar
              activeFilters={filterState.activeFilters}
              onRemoveFilter={filterState.removeFilterById}
              onClearFilters={filterState.clearFilters}
              sortBy={filterState.sortBy}
              onSortByChange={filterState.setSortBy}
              sortOrder={filterState.sortOrder}
              onToggleSortOrder={() =>
                filterState.setSortOrder(filterState.sortOrder === "asc" ? "desc" : "asc")
              }
              showFilterWindow={filterState.showFilterWindow}
              onOpenFilterWindow={(anchor) => {
                filterState.setFilterWindowAnchor(anchor);
                filterState.setShowFilterWindow(true);
              }}
              onCloseFilterWindow={() => filterState.setShowFilterWindow(false)}
              filterWindowAnchor={filterState.filterWindowAnchor}
              draftCategory={filterState.draftCategory}
              getSecondaryOptions={getSecondaryOptions}
              onSelectCategory={(category) =>
                filterState.selectDraftCategory(category, getSecondaryOptions)
              }
              onToggleFilterValue={filterState.toggleFilterValue}
              onSetThreatFilter={filterState.setThreatFilter}
              onSetDraftValue={filterState.setDraftValue}
            />

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
              <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showInGameProperties}
                  onChange={(e) => setShowInGameProperties(e.target.checked)}
                  className="w-4 h-4"
                />
                <span
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                    color: "var(--color-cyan)",
                  }}
                >
                  IN-GAME PROPERTIES
                  {isFromCache && (
                    <span className="text-xs ml-1" style={{ color: "var(--color-phosphor-green)" }}>
                      (cached)
                    </span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <FleetCompositionControls
              selectedId={fleetComposition.selectedId}
              activeFleet={fleetComposition.activeFleet}
              renameDraft={fleetComposition.renameDraft}
              onRenameDraftChange={fleetComposition.setRenameDraft}
              onCommitRename={fleetComposition.commitRename}
              renameIsDirty={fleetComposition.renameIsDirty}
              threatTotal={activeCompositionThreatTotal}
              onDeleteActive={fleetComposition.deleteActive}
              fleetCompositions={fleetComposition.fleetCompositions}
              onExport={() => fleetComposition.exportFile("fleet_compositions")}
              importInputRef={fleetComposition.importInputRef}
              onImportFileChange={fleetComposition.onImportFileChange}
            />
          </div>
        </div>
      )}

      <FleetCompositionLocalNoticeModal
        show={fleetComposition.showLocalNoticeModal}
        onCancel={fleetComposition.cancelLocalNoticeModal}
        onAcknowledge={fleetComposition.acknowledgeLocalNoticeModal}
      />

      <RecycleConfirmModal
        show={showRecycleModal && shipToRecycle != null}
        shipName={shipToRecycle ? (shipToRecycle.name || `Ship #${shipToRecycle.id}`) : ""}
        canRecycle={recycleEligibility.canRecycle}
        purchasedCount={recycleEligibility.purchasedShipCount}
        threshold={recycleEligibility.threshold}
        rewardLabel={String(recycleEligibility.rewardUtc)}
        onCancel={handleRecycleCancel}
        confirmButton={
          shipToRecycle && (
            <RecycleConfirmButtonWeb2
              shipId={shipToRecycle.id}
              onSuccess={() => {
                setShowRecycleModal(false);
                setShipToRecycle(null);
                refetch();
                recycleEligibility.refetch();
                invalidateBalance();
              }}
            />
          )
        }
      />

      {!isLoading && filteredAndSortedShips.length > SHIPS_PER_PAGE && (
        <div className="flex items-center justify-end gap-2">
          <NavyPagination
            page={filterState.page}
            pageCount={filterState.pageCount(filteredAndSortedShips.length)}
            onPrev={filterState.prevPage}
            onNext={() => filterState.nextPage(filteredAndSortedShips.length)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedShips.map((ship) => (
          <ShipCard
            key={ship.id}
            ship={toShipCardDataWeb2(ship)}
            shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
            isStarred={starredShips.has(String(ship.id))}
            onToggleStar={() => toggleStar(String(ship.id))}
            isSelected={selected.has(ship.id)}
            onToggleSelection={() => toggleSelect(ship.id)}
            onRecycleClick={() => handleRecycleClick(ship)}
            showInGameProperties={showInGameProperties}
            inGameAttributes={attributesByShipId.get(ship.id)}
            attributesLoading={attributesLoading}
            fleetCompositionControls={
              <ManageNavyFleetCompositionCardSlot
                fleetComposition={fleetComposition}
                shipId={String(ship.id)}
                constructed={ship.shipData.constructed}
                destroyed={ship.shipData.timestampDestroyed > 0}
              />
            }
          />
        ))}
      </div>

      {isMobileLayout && showConstructDeliveryTutorial && (
        <ManageNavyMobileTutorialSheet
          kind="construct"
          constructButtonLabel="[CONSTRUCT ALL SHIPS]"
          onNotNow={dismissConstructDeliveryTutorialNotNow}
        />
      )}
      {isMobileLayout && !showConstructDeliveryTutorial && showBuyShipsTutorial && (
        <ManageNavyMobileTutorialSheet
          kind="buy"
          constructButtonLabel="[CONSTRUCT ALL SHIPS]"
          onNotNow={dismissBuyShipsTutorialNotNow}
        />
      )}
      {isMobileLayout &&
        !showConstructDeliveryTutorial &&
        !showBuyShipsTutorial &&
        showDroneFactoryTutorial && (
          <ManageNavyMobileTutorialSheet
            kind="drone"
            constructButtonLabel="[CONSTRUCT ALL SHIPS]"
            onNotNow={dismissDroneFactoryTutorialNotNow}
          />
        )}
    </div>
  );
};

export default ManageNavyWeb2;
