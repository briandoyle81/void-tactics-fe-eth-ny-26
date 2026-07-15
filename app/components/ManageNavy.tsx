"use client";

import React, { useEffect } from "react";
import {
  useOwnedShips,
  useShipDetails,
  useContractEvents,
  useFreeShipClaiming,
  clearAllShipDataCache,
  clearAllShipImageCache,
} from "../hooks";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { Ship } from "../types/types";
import {
  ManageNavyDroneFactoryBrief,
  ManageNavyConstructDeliveryBrief,
  ManageNavyBuyShipsBrief,
  ManageNavyMobileTutorialSheet,
} from "./ManageNavyTutorialPanels";
import {
  STALE_COST_SYNC_BATCH_CAP,
  type NavyFilterCategory,
  navyFilterSecondaryOptions,
  filterAndSortShips,
} from "../utils/navyFilters";
import { useNavyFilterState } from "../hooks/useNavyFilterState";
import { useStarredShips } from "../hooks/useStarredShips";
import { NavyFilterToolbar } from "./NavyFilterToolbar";
import { NavyPagination } from "./NavyPagination";
import ShipPurchaseInterface from "./ShipPurchaseInterface";
import { ShipPurchasePanel } from "./ShipPurchasePanel";
import { FreeShipClaimButton } from "./FreeShipClaimButton";
import { ShipActionButton } from "./ShipActionButton";
import ShipCard from "./ShipCard";
import { ShipImage } from "./ShipImage";
import { toShipCardData } from "../utils/toShipCardData";
import { useTransaction } from "../providers/TransactionContext";
import { useShipsRead } from "../hooks/useShipsContract";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { useCurrentCostsVersion } from "../hooks/useShipAttributesContract";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useShipAttributesByIds } from "../hooks/useShipAttributesByIds";
import { fetchAndPersistShipAttributesCaches } from "../utils/shipAttributesLocalCache";
import {
  clearManageNavyTutorialCache,
  dismissBuyShipsTutorialForSession,
  dismissConstructDeliveryTutorialForSession,
  dismissDroneFactoryTutorialForSession,
  hasCompletedBuyShipsTutorial,
  hasCompletedConstructDeliveryTutorial,
  hasEverClickedFreeShipClaim,
  isBuyShipsTutorialPermanentlyDismissed,
  isBuyShipsTutorialSessionDismissed,
  isConstructDeliveryTutorialPermanentlyDismissed,
  isConstructDeliveryTutorialSessionDismissed,
  isDroneFactoryTutorialPermanentlyDismissed,
  isDroneFactoryTutorialSessionDismissed,
  persistBuyShipsTutorialCompleted,
  persistBuyShipsTutorialPermanentlyDismissed,
  persistConstructDeliveryTutorialCompleted,
  persistConstructDeliveryTutorialPermanentlyDismissed,
  persistDroneFactoryTutorialPermanentlyDismissed,
  persistFreeShipClaimClicked,
} from "../utils/freeShipClaimTutorialStorage";
import { reorderByFleetComposition } from "../utils/fleetCompositionStorage";
import { useFleetComposition } from "../hooks/useFleetComposition";
import { FleetCompositionSelect } from "./FleetCompositionSelect";
import { FleetCompositionControls } from "./FleetCompositionControls";
import { FleetCompositionLocalNoticeModal } from "./FleetCompositionLocalNoticeModal";
import { RecycleConfirmModal } from "./RecycleConfirmModal";
import { RecycleLockedNotice } from "./RecycleLockedNotice";
import {
  ManageNavyActionButton,
  manageNavyActionButtonClassName,
} from "./ManageNavyActionButton";
import { ClaimFreeShipsControls } from "./ClaimFreeShipsControls";
import { invalidateAllShipPurchasePriceCachesForChain } from "../utils/shipPurchaseInfoCache";
import { ManageNavyShipsCountHeading } from "./ManageNavyShipsCountHeading";
import { ManageNavyFleetCompositionCardSlot } from "./ManageNavyFleetCompositionCardSlot";


const ManageNavy: React.FC = () => {
  const { address, isConnected, status } = useAccount();
  const chainId = useSelectedChainId();
  const shipsContractAddress = React.useMemo(
    () => getContractAddresses(chainId).SHIPS as `0x${string}`,
    [chainId],
  );
  const shipAttributesContractAddress = React.useMemo(
    () => getContractAddresses(chainId).SHIP_ATTRIBUTES as `0x${string}`,
    [chainId],
  );
  const publicClient = usePublicClient({ chainId });
  const { transactionState } = useTransaction();
  const { ships, isLoading, error, hasShips, shipCount, refetch } =
    useOwnedShips();
  const { fleetStats, shipsByStatus } = useShipDetails();

  // Read the recycle reward amount from the contract
  const { data: recycleReward } = useShipsRead("recycleReward");

  const { data: currentCostsVersion } = useCurrentCostsVersion();
  const globalCostsVersion =
    currentCostsVersion !== undefined && currentCostsVersion !== null
      ? Number(currentCostsVersion)
      : null;

  const staleCostSyncShipIds = React.useMemo(() => {
    if (globalCostsVersion === null) return [] as bigint[];
    return ships
      .filter((ship) => {
        const shipCv = Number(ship.shipData.costsVersion);
        return (
          ship.shipData.constructed &&
          ship.shipData.timestampDestroyed === 0n &&
          !ship.shipData.inFleet &&
          shipCv !== globalCostsVersion
        );
      })
      .map((s) => s.id);
  }, [ships, globalCostsVersion]);

  // Read the user's purchase count
  const { data: amountPurchased } = useShipsRead(
    "amountPurchased",
    address ? [address] : undefined,
  );

  // Get ship attributes for in-game properties
  const shipIds = ships.map((ship) => ship.id);
  const shipIdsRef = React.useRef(shipIds);
  React.useEffect(() => {
    shipIdsRef.current = shipIds;
  }, [shipIds]);

  const afterShipCostSyncPersistCaches = React.useCallback(() => {
    if (!publicClient) return;
    void fetchAndPersistShipAttributesCaches(publicClient, {
      chainId,
      shipAttributesAddress: shipAttributesContractAddress,
      shipIds: shipIdsRef.current,
    });
  }, [publicClient, chainId, shipAttributesContractAddress]);

  const {
    attributes: shipAttributes,
    isLoading: attributesLoading,
    isFromCache,
  } = useShipAttributesByIds(shipIds);

  // Create a map of ship ID to attributes for quick lookup
  const attributesMap = React.useMemo(() => {
    const map = new Map<bigint, (typeof shipAttributes)[0]>();
    shipIds.forEach((shipId, index) => {
      if (shipAttributes[index]) {
        map.set(shipId, shipAttributes[index]);
      }
    });
    return map;
  }, [shipIds, shipAttributes]);

  // Check if user can recycle (minimum 10 purchases required)
  const canRecycle = amountPurchased ? Number(amountPurchased) >= 10 : false;

  // Note: Ship actions are now handled by ShipActionButton components

  // Check if wallet is connecting
  const isConnecting = status === "connecting" || status === "reconnecting";

  // Free ship claiming functionality
  const {
    isEligible,
    error: freeShipError,
    claimStatusError,
    isLoadingClaimStatus,
    nextClaimInFormatted,
  } = useFreeShipClaiming();

  const shouldForceDroneFactoryTutorial =
    !hasShips || (shipCount > 0 && shipCount <= 3);

  const [showDroneFactoryTutorial, setShowDroneFactoryTutorial] =
    React.useState(false);

  const markFreeShipClaimClickedForTutorial = React.useCallback(() => {
    if (!address) return;
    persistFreeShipClaimClicked(address, chainId);
    setShowDroneFactoryTutorial(false);
  }, [address, chainId]);

  const dismissDroneFactoryTutorialNotNow = React.useCallback(
    (dontShowAgain: boolean) => {
      dismissDroneFactoryTutorialForSession();
      if (dontShowAgain && address) {
        persistDroneFactoryTutorialPermanentlyDismissed(address, chainId);
      }
      setShowDroneFactoryTutorial(false);
    },
    [address, chainId],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialPermanentlyDismissed(address, chainId)) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (
      hasEverClickedFreeShipClaim(address, chainId) &&
      !shouldForceDroneFactoryTutorial
    ) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    if (isDroneFactoryTutorialSessionDismissed()) {
      setShowDroneFactoryTutorial(false);
      return;
    }
    setShowDroneFactoryTutorial(true);
  }, [address, chainId, isConnected, shouldForceDroneFactoryTutorial]);

  const [showConstructDeliveryTutorial, setShowConstructDeliveryTutorial] =
    React.useState(false);

  const dismissConstructDeliveryTutorialNotNow = React.useCallback(
    (dontShowAgain: boolean) => {
      dismissConstructDeliveryTutorialForSession();
      if (dontShowAgain && address) {
        persistConstructDeliveryTutorialPermanentlyDismissed(address, chainId);
      }
      setShowConstructDeliveryTutorial(false);
    },
    [address, chainId],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isConstructDeliveryTutorialPermanentlyDismissed(address, chainId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isLoading) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasShips) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (!hasEverClickedFreeShipClaim(address, chainId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (hasCompletedConstructDeliveryTutorial(address, chainId)) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (isConstructDeliveryTutorialSessionDismissed()) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    if (fleetStats.unconstructedShips === 0) {
      setShowConstructDeliveryTutorial(false);
      return;
    }
    setShowConstructDeliveryTutorial(true);
  }, [
    address,
    chainId,
    isConnected,
    isLoading,
    hasShips,
    fleetStats.unconstructedShips,
  ]);

  /**
   * After navy data is loaded, if nothing is left unconstructed, mark this step done.
   * Must not run while loading: unconstructed reads as 0 when `ships` is still empty, which
   * used to persist "completed" immediately and hide the panel forever.
   */
  React.useEffect(() => {
    if (typeof window === "undefined" || !address) return;
    if (isLoading) return;
    if (!hasShips) return;
    if (!hasEverClickedFreeShipClaim(address, chainId)) return;
    if (hasCompletedConstructDeliveryTutorial(address, chainId)) return;
    if (fleetStats.unconstructedShips > 0) return;
    persistConstructDeliveryTutorialCompleted(address, chainId);
  }, [
    address,
    chainId,
    fleetStats.unconstructedShips,
    isLoading,
    hasShips,
  ]);

  const [showBuyShipsTutorial, setShowBuyShipsTutorial] = React.useState(false);

  const dismissBuyShipsTutorialNotNow = React.useCallback(
    (dontShowAgain: boolean) => {
      dismissBuyShipsTutorialForSession();
      if (dontShowAgain && address) {
        persistBuyShipsTutorialPermanentlyDismissed(address, chainId);
      }
      setShowBuyShipsTutorial(false);
    },
    [address, chainId],
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !address || !isConnected) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isBuyShipsTutorialPermanentlyDismissed(address, chainId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isLoading) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (!hasShips) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (!hasCompletedConstructDeliveryTutorial(address, chainId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (hasCompletedBuyShipsTutorial(address, chainId)) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (isBuyShipsTutorialSessionDismissed()) {
      setShowBuyShipsTutorial(false);
      return;
    }
    if (fleetStats.unconstructedShips > 0) {
      setShowBuyShipsTutorial(false);
      return;
    }
    setShowBuyShipsTutorial(true);
  }, [
    address,
    chainId,
    isConnected,
    isLoading,
    hasShips,
    fleetStats.unconstructedShips,
  ]);

  const showManageNavyTutorialChrome =
    showDroneFactoryTutorial ||
    showConstructDeliveryTutorial ||
    showBuyShipsTutorial;

  // Phase 3: Real-time updates
  const { isListening } = useContractEvents();

  // Clear cache when user disconnects
  useEffect(() => {
    if (!address) {
      clearAllShipDataCache();
      clearAllShipImageCache();
    }
  }, [address]);

  // State for ship selection and filtering
  const [selectedShips, setSelectedShips] = React.useState<Set<string>>(
    new Set(),
  );
  const SHIPS_PER_PAGE = 100;
  const filterState = useNavyFilterState(SHIPS_PER_PAGE);
  const [showDebugButtons, setShowDebugButtons] = React.useState(false);
  const [isMobileManageNavyLayout, setIsMobileManageNavyLayout] =
    React.useState(false);
  const [isCompactManageNavyViewport, setIsCompactManageNavyViewport] =
    React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const compactMq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setIsMobileManageNavyLayout(mobileMq.matches);
      setIsCompactManageNavyViewport(compactMq.matches);
    };
    sync();
    mobileMq.addEventListener("change", sync);
    compactMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      compactMq.removeEventListener("change", sync);
    };
  }, []);

  // Starred ships, scoped per chain+wallet (fixes a pre-existing bug where
  // this was a single global localStorage key shared across all wallets).
  const { starredShips, toggleStar } = useStarredShips(
    address ? `${chainId}:${address.toLowerCase()}` : "",
  );
  const [showShipPurchase, setShowShipPurchase] = React.useState(false);
  const showMobileShipPurchaseTakeover =
    showShipPurchase && isCompactManageNavyViewport;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("void-tactics-manage-navy-purchase-active", {
        detail: { active: showMobileShipPurchaseTakeover },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("void-tactics-manage-navy-purchase-active", {
          detail: { active: false },
        }),
      );
    };
  }, [showMobileShipPurchaseTakeover]);

  const handleBuyNewShipsClick = React.useCallback(() => {
    if (address && showBuyShipsTutorial) {
      persistBuyShipsTutorialCompleted(address, chainId);
      setShowBuyShipsTutorial(false);
    }
    setShowShipPurchase(true);
  }, [address, chainId, showBuyShipsTutorial]);

  const [paymentMethod, setPaymentMethod] = React.useState<"FLOW" | "UTC" | "USD">(
    "FLOW",
  );
  const [showRecycleModal, setShowRecycleModal] = React.useState(false);
  const [shipToRecycle, setShipToRecycle] = React.useState<Ship | null>(null);

  // validShipIds: alive + constructed ships eligible for a fleet preset.
  // `null` while ships are still loading, so auto-prune doesn't strip
  // presets just because the ship list is momentarily empty.
  const validFleetCompositionShipIds = React.useMemo(
    () =>
      isLoading
        ? null
        : new Set(
            ships
              .filter((s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0n)
              .map((s) => s.id.toString()),
          ),
    [ships, isLoading],
  );
  const fleetComposition = useFleetComposition(
    address ? `${chainId}:${address.toLowerCase()}` : "",
    String(chainId),
    validFleetCompositionShipIds,
  );

  React.useEffect(() => {
    setSelectedShips(new Set());
    setShipToRecycle(null);
    setShowRecycleModal(false);
    filterState.setShowFilterWindow(false);
    // filterState is a fresh object every render; depend on the specific
    // stable setState function it returns, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, filterState.setShowFilterWindow]);

  const getNavyFilterSecondaryOptions = React.useCallback(
    (category: NavyFilterCategory) => navyFilterSecondaryOptions(category, ships),
    [ships],
  );

  // Filter and sort ships
  const filteredAndSortedShips = React.useMemo(
    () =>
      filterAndSortShips(
        ships,
        filterState.activeFilters,
        filterState.sortBy,
        filterState.sortOrder,
        starredShips,
      ),
    [ships, filterState.activeFilters, filterState.sortBy, filterState.sortOrder, starredShips],
  );

  const shipsForGridDisplay = React.useMemo(
    () =>
      reorderByFleetComposition(filteredAndSortedShips, fleetComposition.activeFleet, (s) =>
        s.id.toString(),
      ),
    [filteredAndSortedShips, fleetComposition.activeFleet],
  );

  React.useEffect(() => {
    filterState.setPage(0);
    // filterState is a fresh object every render; depend on the specific
    // stable setState function it returns, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetComposition.selectedId, filterState.setPage]);

  const paginatedShips = React.useMemo(
    () => filterState.paginate(shipsForGridDisplay),
    // filterState is a fresh object every render; depend on the specific
    // stable members actually used, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipsForGridDisplay, filterState.page, filterState.paginate],
  );

  // Threat total is web3-specific: sums bigint `shipData.cost`, converting
  // to number at this boundary (number-native-shared-components rule).
  const activeCompositionThreatTotal = React.useMemo(() => {
    if (!fleetComposition.activeFleet) return 0;
    return fleetComposition.activeFleet.shipIds.reduce((sum, id) => {
      const s = ships.find((x) => x.id.toString() === id);
      if (
        !s ||
        !s.shipData.constructed ||
        s.shipData.timestampDestroyed > 0n
      ) {
        return sum;
      }
      return sum + Number(s.shipData.cost);
    }, 0);
  }, [fleetComposition.activeFleet, ships]);

  // Handle ship selection
  const toggleShipSelection = (shipId: string) => {
    const newSelected = new Set(selectedShips);
    if (newSelected.has(shipId)) {
      newSelected.delete(shipId);
    } else {
      newSelected.add(shipId);
    }
    setSelectedShips(newSelected);
  };

  // Handle recycle confirmation
  const handleRecycleClick = (ship: Ship) => {
    setShipToRecycle(ship);
    setShowRecycleModal(true);
  };

  const handleRecycleCancel = () => {
    setShowRecycleModal(false);
    setShipToRecycle(null);
  };

  // Handle bulk actions - now handled by ShipActionButton components

  const handleSelectAll = () => {
    if (selectedShips.size === shipsForGridDisplay.length) {
      setSelectedShips(new Set());
    } else {
      setSelectedShips(
        new Set(shipsForGridDisplay.map((ship) => ship.id.toString())),
      );
    }
  };

  const shipGridRef = React.useRef<HTMLDivElement>(null);
  const [nameBlockMinHeights, setNameBlockMinHeights] = React.useState<
    Record<string, number>
  >({});

  const shipsLayoutKey = React.useMemo(
    () =>
      [
        shipsForGridDisplay.map((s) => s.id.toString()).join("\0"),
        showInGameProperties ? "ig" : "nft",
      ].join("|"),
    [shipsForGridDisplay, showInGameProperties],
  );

  const measureShipNameRowHeights = React.useCallback(() => {
    const grid = shipGridRef.current;
    if (!grid) return;

    const children = [...grid.children] as HTMLElement[];
    const rowMap = new Map<number, { ids: string[]; heights: number[] }>();

    for (const el of children) {
      const id = el.dataset.shipId;
      if (!id) continue;
      const block = el.querySelector(
        "[data-ship-name-block]",
      ) as HTMLElement | null;
      if (!block) continue;
      const top = el.offsetTop;
      if (!rowMap.has(top)) {
        rowMap.set(top, { ids: [], heights: [] });
      }
      const g = rowMap.get(top)!;
      g.ids.push(id);
      g.heights.push(Math.round(block.getBoundingClientRect().height));
    }

    /** Name row is star + title; one line is typically under this (px). */
    const singleLineBlockMaxPx = 52;
    const next: Record<string, number> = {};

    for (const { ids, heights } of rowMap.values()) {
      if (ids.length === 0) continue;
      const minH = Math.min(...heights);
      const maxH = Math.max(...heights);
      const rowHasMultilineOrMixed =
        maxH > singleLineBlockMaxPx || maxH > minH + 8;
      if (!rowHasMultilineOrMixed) continue;
      for (const sid of ids) {
        next[sid] = maxH;
      }
    }

    setNameBlockMinHeights((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) return next;
      for (const k of nextKeys) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!hasShips) {
      setNameBlockMinHeights({});
      return;
    }
    setNameBlockMinHeights({});
    let raf1 = 0;
    let raf2 = 0;
    let cancelled = false;
    raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      measureShipNameRowHeights();
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        measureShipNameRowHeights();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [hasShips, shipsLayoutKey, measureShipNameRowHeights]);

  React.useEffect(() => {
    if (!hasShips) return;
    const grid = shipGridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => measureShipNameRowHeights());
    ro.observe(grid);
    window.addEventListener("resize", measureShipNameRowHeights);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureShipNameRowHeights);
    };
  }, [hasShips, shipsLayoutKey, measureShipNameRowHeights]);

  if (!address || !isConnected) {
    return (
      <div className="text-cyan font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <p className="text-lg opacity-80">
          Please connect your wallet to view your navy
        </p>
        <div className="mt-4 text-sm text-cyan">
          <p>Address: {address || "undefined"}</p>
          <p>Connected: {isConnected ? "yes" : "no"}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-cyan font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <div className="font-mono text-xs text-text-muted tracking-widest animate-pulse mt-4">&gt;&gt; ACQUIRING NAVY DATA...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-cyan font-mono text-center">
        <h3 className="text-2xl font-bold mb-6 tracking-wider">
          [MANAGE NAVY]
        </h3>
        <p className="text-warning-red font-mono text-sm tracking-wider">
          [ERR] Navy data acquisition failed: {error.message}
        </p>
      </div>
    );
  }

  // Show loading state while wallet is connecting
  if (isConnecting) {
    return (
      <div className="text-center font-mono mt-8">
        <div className="text-xs text-text-muted tracking-widest animate-pulse">&gt;&gt; ESTABLISHING SECURE LINK...</div>
      </div>
    );
  }

  const constructTutorialButtonLabel =
    fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP
      ? ("[CONSTRUCT 150 SHIPS]" as const)
      : ("[CONSTRUCT ALL SHIPS]" as const);

  const claimFreeShipControls = (
    <ClaimFreeShipsControls
      isLoadingClaimStatus={isLoadingClaimStatus}
      error={freeShipError}
      claimStatusError={claimStatusError}
      isEligible={isEligible}
      nextClaimInFormatted={nextClaimInFormatted}
      tryClaimButton={
        <FreeShipClaimButton
          isEligible={true}
          analyticsSurface="manage_navy"
          className={manageNavyActionButtonClassName("amber")}
          onPress={markFreeShipClaimClickedForTutorial}
          onSuccess={() => {
            refetch();
          }}
        >
          [TRY CLAIM FREE SHIPS]
        </FreeShipClaimButton>
      }
      claimButton={
        <FreeShipClaimButton
          isEligible={isEligible}
          analyticsSurface="manage_navy"
          className={manageNavyActionButtonClassName("green")}
          onPress={markFreeShipClaimClickedForTutorial}
          onSuccess={() => {
            refetch();
          }}
        >
          [CLAIM FREE SHIPS]
        </FreeShipClaimButton>
      }
    />
  );

  const staleCostBulkButton =
    staleCostSyncShipIds.length === 0 ? null : (
      <TransactionButton
        transactionId="manage-navy-sync-stale-costs-bulk"
        contractAddress={shipsContractAddress}
        abi={CONTRACT_ABIS.SHIPS as Abi}
        functionName="syncShipCosts"
        args={[
          staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
            ? staleCostSyncShipIds.slice(0, STALE_COST_SYNC_BATCH_CAP)
            : staleCostSyncShipIds,
        ]}
        disabled={transactionState.isPending}
        className="w-full justify-center px-6 py-3 rounded-none border-2 border-amber text-amber hover:bg-amber/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
        style={{ borderRadius: 0 }}
        onSuccess={() => {
          toast.success(
            staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
              ? "150 ships cost version update started!"
              : "Ship cost versions updated!",
          );
          afterShipCostSyncPersistCaches();
          setTimeout(() => refetch(), 1000);
        }}
        onError={() => {
          toast.error("Failed to update ship cost versions");
        }}
      >
        {staleCostSyncShipIds.length > STALE_COST_SYNC_BATCH_CAP
          ? "[UPDATE 150 SHIPS]"
          : "[UPDATE ALL SHIPS]"}
      </TransactionButton>
    );

  const fleetCompositionSelectControl = (
    <FleetCompositionSelect
      fleetCompositions={fleetComposition.fleetCompositions}
      selectedId={fleetComposition.selectedId}
      onChange={fleetComposition.onSelectChange}
    />
  );

  return (
    <div
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        color: "var(--color-text-primary)",
      }}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h3
            className="text-xl font-bold uppercase tracking-wider sm:text-2xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              color: "var(--color-text-primary)",
            }}
          >
            [MANAGE NAVY]
          </h3>
          <label className="hidden cursor-pointer items-center gap-2 text-sm md:flex">
            <input
              type="checkbox"
              checked={showDebugButtons}
              onChange={(e) => setShowDebugButtons(e.target.checked)}
              className="w-4 h-4"
              style={{
                accentColor: "var(--color-cyan)",
                borderColor: "var(--color-cyan)",
                backgroundColor: "var(--color-near-black)",
                borderRadius: 0,
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                width: "16px",
                height: "16px",
                border: "2px solid",
              }}
            />
            <span style={{ color: "var(--color-text-secondary)" }}>
              Debug Mode
            </span>
          </label>
        </div>

        {/* Real-time Status */}
        <div className="flex shrink-0 items-center gap-4 sm:justify-end">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2"
              style={{
                backgroundColor: isListening
                  ? "var(--color-phosphor-green)"
                  : "var(--color-warning-red)",
                animation: isListening
                  ? "pulse-functional 1.5s ease-in-out infinite"
                  : "none",
              }}
            ></div>
            <span
              className="text-xs uppercase font-semibold tracking-wider"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
                color: isListening
                  ? "var(--color-phosphor-green)"
                  : "var(--color-warning-red)",
              }}
            >
              {isListening ? "LIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: same three-button row with or without tutorial; brief is absolute (no layout shift). When tutorial is on, stack above ship grid so art does not cover the panel. */}
      <div
        className={`relative isolate mb-8 flex w-full flex-col items-stretch justify-center gap-4 overflow-visible md:flex-row md:flex-wrap md:items-center ${
          showManageNavyTutorialChrome ? "z-[200]" : ""
        }`}
      >
        {showConstructDeliveryTutorial ? (
          <div className="relative flex w-full flex-col gap-4 md:inline-flex md:w-auto md:flex-row md:items-start md:gap-4">
            {/* Same pattern as claim tutorial: brief is absolute beside the highlighted control; here to the RIGHT of construct */}
            <div className="relative z-[100] w-full min-w-0 shrink-0 md:w-auto">
              <div
                className="border border-amber/90 bg-amber/24 animate-pulse p-[3px]"
                style={{ borderRadius: 0 }}
              >
                <div className="flex w-full min-w-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-center md:gap-4">
                  {fleetCompositionSelectControl}
                  {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                    <ShipActionButton
                      action="constructShips"
                      shipIds={shipsByStatus.unconstructed
                        .slice(0, STALE_COST_SYNC_BATCH_CAP)
                        .map((ship: Ship) => ship.id)}
                      className="w-full justify-center px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                      disabled={fleetStats.unconstructedShips === 0}
                      onSuccess={() => {
                        if (address) {
                          persistConstructDeliveryTutorialCompleted(
                            address,
                            chainId,
                          );
                          setShowConstructDeliveryTutorial(false);
                        }
                        toast.success("150 ships construction started!");
                        refetch();
                      }}
                    >
                      [CONSTRUCT 150 SHIPS]
                    </ShipActionButton>
                  ) : (
                    <ShipActionButton
                      action="constructAll"
                      className="w-full justify-center px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                      disabled={fleetStats.unconstructedShips === 0}
                      onSuccess={() => {
                        if (address) {
                          persistConstructDeliveryTutorialCompleted(
                            address,
                            chainId,
                          );
                          setShowConstructDeliveryTutorial(false);
                        }
                        toast.success("Ships constructed successfully!");
                        refetch();
                      }}
                    >
                      [CONSTRUCT ALL SHIPS]
                    </ShipActionButton>
                  )}
                  {staleCostBulkButton}
                </div>
              </div>
              <ManageNavyConstructDeliveryBrief
                className="absolute left-full top-0 z-[110] ml-4"
                constructButtonLabel={constructTutorialButtonLabel}
                onNotNow={dismissConstructDeliveryTutorialNotNow}
              />
            </div>
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 md:w-auto">
              <button
                type="button"
                onClick={handleBuyNewShipsClick}
                disabled={transactionState.isPending}
                className="w-full justify-center px-6 py-3 border-2 border-cyan text-cyan hover:border-cyan/80 hover:text-cyan/80 hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                style={{
                  borderRadius: 0,
                }}
              >
                [BUY NEW SHIPS]
              </button>
              <div className="shrink-0">{claimFreeShipControls}</div>
              <div
                className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : showBuyShipsTutorial ? (
          <div className="relative flex w-full flex-col gap-4 md:inline-flex md:w-auto md:flex-row md:items-start md:gap-4">
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 md:flex-row md:gap-4 md:w-auto">
              {fleetCompositionSelectControl}
              {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                <ShipActionButton
                  action="constructShips"
                  shipIds={shipsByStatus.unconstructed
                    .slice(0, STALE_COST_SYNC_BATCH_CAP)
                    .map((ship: Ship) => ship.id)}
                  className="w-full justify-center px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("150 ships construction started!");
                    refetch();
                  }}
                >
                  [CONSTRUCT 150 SHIPS]
                </ShipActionButton>
              ) : (
                <ShipActionButton
                  action="constructAll"
                  className="w-full justify-center px-6 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("Ships constructed successfully!");
                    refetch();
                  }}
                >
                  [CONSTRUCT ALL SHIPS]
                </ShipActionButton>
              )}
              {staleCostBulkButton}
              <div
                className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block"
                aria-hidden="true"
              />
            </div>
            <div className="relative z-[100] w-full shrink-0 md:w-auto">
              <ManageNavyBuyShipsBrief
                className="absolute right-full top-0 z-[110] mr-4"
                onNotNow={dismissBuyShipsTutorialNotNow}
              />
              <div
                className="border border-amber/90 bg-amber/24 animate-pulse p-[3px]"
                style={{ borderRadius: 0 }}
              >
                <button
                  type="button"
                  onClick={handleBuyNewShipsClick}
                  disabled={transactionState.isPending}
                  className="w-full justify-center px-6 py-3 border-2 border-cyan text-cyan hover:border-cyan/80 hover:text-cyan/80 hover:bg-cyan/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto"
                  style={{
                    borderRadius: 0,
                  }}
                >
                  [BUY NEW SHIPS]
                </button>
              </div>
            </div>
            <div className="relative z-10 shrink-0">
              <div className="relative">
                {claimFreeShipControls}
                <div
                  className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-3 md:w-auto">
              {fleetCompositionSelectControl}
              {fleetStats.unconstructedShips > STALE_COST_SYNC_BATCH_CAP ? (
                <ShipActionButton
                  action="constructShips"
                  shipIds={shipsByStatus.unconstructed
                    .slice(0, STALE_COST_SYNC_BATCH_CAP)
                    .map((ship: Ship) => ship.id)}
                  className={manageNavyActionButtonClassName("green")}
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("150 ships construction started!");
                    refetch();
                  }}
                >
                  [CONSTRUCT 150 SHIPS]
                </ShipActionButton>
              ) : (
                <ShipActionButton
                  action="constructAll"
                  className={manageNavyActionButtonClassName("green")}
                  disabled={fleetStats.unconstructedShips === 0}
                  onSuccess={() => {
                    toast.success("Ships constructed successfully!");
                    refetch();
                  }}
                >
                  [CONSTRUCT ALL SHIPS]
                </ShipActionButton>
              )}
              {staleCostBulkButton}

              <ManageNavyActionButton
                variant="cyan"
                onClick={handleBuyNewShipsClick}
                disabled={transactionState.isPending}
              >
                [BUY NEW SHIPS]
              </ManageNavyActionButton>

              {showDroneFactoryTutorial && (
                <div
                  className="pointer-events-auto absolute inset-0 z-20 hidden rounded-none bg-near-black/85 md:block"
                  aria-hidden="true"
                />
              )}
            </div>

            <div
              className={
                showDroneFactoryTutorial
                  ? "relative z-[100] w-full shrink-0 md:w-auto"
                  : "relative z-30 w-full shrink-0 md:w-auto"
              }
            >
              {showDroneFactoryTutorial && (
                <ManageNavyDroneFactoryBrief
                  className="absolute right-full top-0 z-[110] mr-4"
                  onNotNow={dismissDroneFactoryTutorialNotNow}
                />
              )}
              <div
                className={
                  showDroneFactoryTutorial
                    ? "border border-amber/90 bg-amber/24 animate-pulse p-[3px]"
                    : "p-0"
                }
                style={{ borderRadius: 0 }}
              >
                {claimFreeShipControls}
              </div>
            </div>
          </div>
        )}

        {/* Debug buttons - only show when debug mode is enabled */}
        {showDebugButtons && (
          <div className="hidden w-full flex-col flex-wrap gap-2 md:flex md:flex-row md:justify-center md:gap-2">
            <button
              onClick={() => {
                clearAllShipDataCache();
                clearAllShipImageCache();
                toast.success(`Cleared all ship cache`);
                window.location.reload();
              }}
              className="px-4 py-2 rounded-none border border-warning-red text-warning-red hover:bg-warning-red/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR ALL CACHE]
            </button>

            <button
              onClick={() => {
                if (!address) {
                  toast.error("Connect wallet to clear tutorial cache");
                  return;
                }
                clearManageNavyTutorialCache(address, chainId);
                setShowDroneFactoryTutorial(true);
                setShowConstructDeliveryTutorial(false);
                setShowBuyShipsTutorial(false);
                toast.success("Cleared Manage Navy tutorial cache");
              }}
              className="px-4 py-2 rounded-none border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR TUTORIAL CACHE]
            </button>

            <button
              onClick={() => {
                invalidateAllShipPurchasePriceCachesForChain(chainId);
                toast.success(
                  "Cleared purchase price cache (native + UTC) for this network",
                );
              }}
              className="px-4 py-2 rounded-none border border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm transition-all duration-200"
            >
              [CLEAR PRICE CACHE]
            </button>

          </div>
        )}

        {canRecycle &&
          selectedShips.size > 0 &&
          (() => {
            // Filter out ships that are in fleets
            const recyclableShips = Array.from(selectedShips).filter((id) => {
              const ship = ships.find((s) => s.id.toString() === id);
              return ship && !ship.shipData.inFleet;
            });

            return recyclableShips.length > 0 ? (
              <ShipActionButton
                action="recycle"
                shipIds={recyclableShips.map((id) => BigInt(id))}
                className={manageNavyActionButtonClassName("red")}
                onSuccess={() => {
                  // Show success toast
                  toast.success("Ships recycled successfully!");
                  // Clear selection and refetch ships data after successful recycling
                  setSelectedShips(new Set());
                  refetch();
                }}
              >
                {`[RECYCLE ${recyclableShips.length} SHIPS]`}
              </ShipActionButton>
            ) : (
              <div className="w-full px-4 py-3 text-center text-sm font-mono font-bold tracking-wider text-amber opacity-50 sm:px-6 md:w-auto rounded-none border-2 border-amber">
                [SELECTED SHIPS ARE IN FLEETS - CANNOT RECYCLE]
              </div>
            );
          })()}

        {!canRecycle && isConnected && (
          <RecycleLockedNotice
            purchasedCount={amountPurchased ? Number(amountPurchased) : 0}
            threshold={10}
          />
        )}
      </div>

      {/* Ship Purchase Interface */}
      <ShipPurchasePanel
        show={showShipPurchase}
        onClose={() => setShowShipPurchase(false)}
        mobileTakeover={showMobileShipPurchaseTakeover}
        warningNote="Prices not yet normalized for all chains"
        paymentMethods={[
          { id: "FLOW", label: "TOKENS", activeBorderClass: "border-cyan", activeTextClass: "text-cyan", activeBgClass: "bg-cyan/10" },
          { id: "UTC", label: "UTC", activeBorderClass: "border-amber", activeTextClass: "text-amber", activeBgClass: "bg-amber/10" },
          { id: "USD", label: "Fireblocks Flow", activeBorderClass: "border-phosphor-green", activeTextClass: "text-phosphor-green", activeBgClass: "bg-phosphor-green/10" },
        ]}
        activePaymentMethodId={paymentMethod}
        onSelectPaymentMethod={(id) => setPaymentMethod(id as "FLOW" | "UTC" | "USD")}
      >
        <ShipPurchaseInterface
          onClose={() => setShowShipPurchase(false)}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
        />
      </ShipPurchasePanel>

      {/* Filtering and Sorting Controls */}
      <div
        className="mb-6 border border-solid p-3 sm:p-4"
        style={{
          backgroundColor: "var(--color-slate)",
          borderColor: "var(--color-gunmetal)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
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
            getSecondaryOptions={getNavyFilterSecondaryOptions}
            onSelectCategory={(category) =>
              filterState.selectDraftCategory(category, getNavyFilterSecondaryOptions)
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
                  <span
                    className="text-xs ml-1"
                    style={{ color: "var(--color-phosphor-green)" }}
                  >
                    (cached)
                  </span>
                )}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Ships Display */}
      {!hasShips ? (
        <div className="text-center">
          <p className="text-lg opacity-80 mb-4">
            Claim free ships to get started
          </p>
        </div>
      ) : (
        <div
          className={`space-y-4 ${
            showManageNavyTutorialChrome ? "relative z-0" : ""
          }`}
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <ManageNavyShipsCountHeading
                shownCount={filteredAndSortedShips.length}
                totalCount={ships.length}
                perPage={SHIPS_PER_PAGE}
                page={filterState.page}
              />
              <div className="flex flex-wrap items-center gap-2">
                {shipsForGridDisplay.length > SHIPS_PER_PAGE && (
                  <NavyPagination
                    page={filterState.page}
                    pageCount={filterState.pageCount(shipsForGridDisplay.length)}
                    onPrev={filterState.prevPage}
                    onNext={() => filterState.nextPage(shipsForGridDisplay.length)}
                  />
                )}
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-gunmetal)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-cyan)";
                    e.currentTarget.style.color = "var(--color-cyan)";
                    e.currentTarget.style.backgroundColor =
                      "var(--color-slate)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-gunmetal)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                    e.currentTarget.style.backgroundColor = "var(--color-steel)";
                  }}
                >
                  {selectedShips.size === shipsForGridDisplay.length
                    ? "[DESELECT ALL]"
                    : "[SELECT ALL]"}
                </button>
                {selectedShips.size > 0 && (
                  <span
                    className="text-sm uppercase tracking-wider"
                    style={{
                      fontFamily:
                        "var(--font-jetbrains-mono), 'Courier New', monospace",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {selectedShips.size} selected
                  </span>
                )}
              </div>
            </div>

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
              onExport={() => fleetComposition.exportFile(`fleet_compositions_chain${chainId}`)}
              importInputRef={fleetComposition.importInputRef}
              onImportFileChange={fleetComposition.onImportFileChange}
            />
          </div>
          <div
            ref={shipGridRef}
            className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {paginatedShips.map((ship: Ship) => {
              const shipCv = Number(ship.shipData.costsVersion);
              const costsVersionStale =
                globalCostsVersion !== null &&
                ship.shipData.constructed &&
                ship.shipData.timestampDestroyed === 0n &&
                !ship.shipData.inFleet &&
                shipCv !== globalCostsVersion;

              return (
                <ShipCard
                  key={ship.id.toString()}
                  ship={toShipCardData(ship)}
                  shipImage={
                    <ShipImage
                      key={`${ship.id.toString()}-${ship.shipData.constructed ? "constructed" : "unconstructed"}`}
                      ship={ship}
                      className="h-full w-full"
                      showLoadingState={true}
                    />
                  }
                  isStarred={starredShips.has(ship.id.toString())}
                  onToggleStar={() => toggleStar(ship.id.toString())}
                  isSelected={selectedShips.has(ship.id.toString())}
                  onToggleSelection={() =>
                    toggleShipSelection(ship.id.toString())
                  }
                  onRecycleClick={() => handleRecycleClick(ship)}
                  showInGameProperties={showInGameProperties}
                  inGameAttributes={attributesMap.get(ship.id)}
                  attributesLoading={attributesLoading}
                  costsVersionStale={costsVersionStale}
                  layoutShipId={ship.id.toString()}
                  nameBlockMinHeightPx={
                    nameBlockMinHeights[ship.id.toString()]
                  }
                  costVersionSyncButton={
                    costsVersionStale ? (
                      <TransactionButton
                        transactionId={`sync-ship-costs-${ship.id.toString()}`}
                        contractAddress={shipsContractAddress}
                        abi={CONTRACT_ABIS.SHIPS as Abi}
                        // Ships.syncShipCosts(uint256[]): permissionless; applies
                        // getCurrentCostsVersion + calculateShipCost. Not setCostOfShip
                        // (owner / game only). Reverts onchain if ship is in fleet.
                        functionName="syncShipCosts"
                        args={[[ship.id]]}
                        className="w-full px-2 py-1.5 border-2 border-solid text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                        style={{
                          fontFamily:
                            "var(--font-rajdhani), 'Arial Black', sans-serif",
                          borderColor: "var(--color-amber)",
                          color: "var(--color-amber)",
                          backgroundColor: "var(--color-near-black)",
                          borderRadius: 0,
                        }}
                        onSuccess={() => {
                          toast.success("Ship cost version updated");
                          afterShipCostSyncPersistCaches();
                          setTimeout(() => refetch(), 1000);
                        }}
                        onError={() => {
                          toast.error("Failed to update ship cost version");
                        }}
                      >
                        Update Ship Version
                      </TransactionButton>
                    ) : undefined
                  }
                  fleetCompositionControls={
                    <ManageNavyFleetCompositionCardSlot
                      fleetComposition={fleetComposition}
                      shipId={ship.id.toString()}
                      constructed={ship.shipData.constructed}
                      destroyed={ship.shipData.timestampDestroyed > 0n}
                    />
                  }
                />
              );
            })}
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
        canRecycle={canRecycle}
        purchasedCount={amountPurchased ? Number(amountPurchased) : 0}
        threshold={10}
        rewardLabel={recycleReward ? formatEther(recycleReward as bigint) : "..."}
        onCancel={handleRecycleCancel}
        confirmButton={
          shipToRecycle && (
            <TransactionButton
              transactionId={`recycle-ship-${shipToRecycle.id}`}
              contractAddress={shipsContractAddress}
              abi={[
                {
                  inputs: [
                    {
                      internalType: "uint256[]",
                      name: "_shipIds",
                      type: "uint256[]",
                    },
                  ],
                  name: "shipBreaker",
                  outputs: [],
                  stateMutability: "nonpayable",
                  type: "function",
                },
              ]}
              functionName="shipBreaker"
              args={[[shipToRecycle.id]]}
              className="px-6 py-2 border border-warning-red text-warning-red hover:bg-warning-red/10 rounded-none font-mono font-bold transition-all duration-200"
              onSuccess={() => {
                toast.success("Ship recycled successfully!");
                setShowRecycleModal(false);
                setShipToRecycle(null);
                setTimeout(() => {
                  refetch();
                }, 1000);
              }}
              onError={() => {
                console.error("Failed to recycle ship");
              }}
            >
              DESTROY SHIP
            </TransactionButton>
          )
        }
      />

      {isMobileManageNavyLayout && showConstructDeliveryTutorial && (
        <ManageNavyMobileTutorialSheet
          kind="construct"
          constructButtonLabel={constructTutorialButtonLabel}
          onNotNow={dismissConstructDeliveryTutorialNotNow}
        />
      )}
      {isMobileManageNavyLayout &&
        !showConstructDeliveryTutorial &&
        showBuyShipsTutorial && (
          <ManageNavyMobileTutorialSheet
            kind="buy"
            constructButtonLabel={constructTutorialButtonLabel}
            onNotNow={dismissBuyShipsTutorialNotNow}
          />
        )}
      {isMobileManageNavyLayout &&
        !showConstructDeliveryTutorial &&
        !showBuyShipsTutorial &&
        showDroneFactoryTutorial && (
          <ManageNavyMobileTutorialSheet
            kind="drone"
            constructButtonLabel={constructTutorialButtonLabel}
            onNotNow={dismissDroneFactoryTutorialNotNow}
          />
        )}
    </div>
  );
};

export default ManageNavy;
