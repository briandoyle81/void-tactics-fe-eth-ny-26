"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { getNativeTokenSymbol } from "../config/networks";
import { TransactionButton } from "./TransactionButton";
import { PurchaseTierTable, type PurchaseTierRowData } from "./PurchaseTierTable";
import { ShipPurchasePricesHeaderCard } from "./ShipPurchasePricesHeaderCard";
import { ShipPurchaseTierSectionCard } from "./ShipPurchaseTierSectionCard";
import { useShipPurchasePricesAccess } from "../hooks/useShipPurchasePricesAccess";
import { useShipsPurchaseInfo } from "../hooks/useShipsPurchaseInfo";
import { useShipPurchaserPurchaseInfo } from "../hooks/useShipPurchaserPurchaseInfo";
import { invalidateAllShipPurchasePriceCachesForChain } from "../utils/shipPurchaseInfoCache";
import { useSelectedChainId } from "../hooks/useSelectedChainId";

type PriceDraft = {
  nativeShips: number[];
  nativeEth: string[];
  utcShips: number[];
  utcTokens: string[];
  nativeDirty: boolean;
  utcDirty: boolean;
};

function draftStorageKey(chainId: number): string {
  return `warpflow-price-draft-v1-${chainId}`;
}

function readDraft(chainId: number): PriceDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(chainId));
    if (!raw) return null;
    return JSON.parse(raw) as PriceDraft;
  } catch {
    return null;
  }
}

function writeDraft(chainId: number, draft: PriceDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(draftStorageKey(chainId), JSON.stringify(draft));
}

function clearDraft(chainId: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(draftStorageKey(chainId));
}

function emptyTxArgs(n: number): [number[], bigint[]] {
  return [
    Array.from({ length: n }, () => 0),
    Array.from({ length: n }, () => 0n),
  ];
}

function buildArgs(
  ships: number[],
  priceStrings: string[],
): { ok: true; args: [number[], bigint[]] } | { ok: false; error: string } {
  const n = ships.length;
  if (n === 0 || n !== priceStrings.length) {
    return { ok: false, error: "Ship and price rows must match and be non-empty" };
  }
  const tierShips: number[] = [];
  const tierPrices: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const num = Math.floor(Number(ships[i]));
    if (!Number.isFinite(num) || num < 0 || num > 255) {
      return { ok: false, error: `Tier ${i}: ship count must be 0 to 255` };
    }
    tierShips.push(num);
    try {
      tierPrices.push(parseEther(priceStrings[i]?.trim() || "0"));
    } catch {
      return { ok: false, error: `Tier ${i}: invalid price` };
    }
  }
  return { ok: true, args: [tierShips, tierPrices] };
}

const ShipPurchasePrices: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useSelectedChainId();
  const nativeSymbol = getNativeTokenSymbol(chainId);
  const shipsAddress = getContractAddresses(chainId).SHIPS as `0x${string}`;
  const purchaserAddress = getContractAddresses(chainId).SHIP_PURCHASER as `0x${string}`;
  const {
    isShipsOwner,
    isPurchaserOwner,
    canAdminShipPurchasePrices,
    purchaserDeployed,
    shipsOwner,
    purchaserOwner,
  } = useShipPurchasePricesAccess();

  const shipsInfo = useShipsPurchaseInfo();
  const utcInfo = useShipPurchaserPurchaseInfo();

  const [nativeShips, setNativeShips] = useState<number[]>([]);
  const [nativeEth, setNativeEth] = useState<string[]>([]);
  const [utcShips, setUtcShips] = useState<number[]>([]);
  const [utcTokens, setUtcTokens] = useState<string[]>([]);
  const [nativeDirty, setNativeDirty] = useState(false);
  const [utcDirty, setUtcDirty] = useState(false);
  const [loadedDraftChainId, setLoadedDraftChainId] = useState<number | null>(
    null,
  );
  const [hasNativeDraft, setHasNativeDraft] = useState(false);
  const [hasUtcDraft, setHasUtcDraft] = useState(false);

  const onChainNativeShips = useMemo(
    () => [...shipsInfo.shipsPerTier],
    [shipsInfo.shipsPerTier.join(",")],
  );
  const onChainNativeEth = useMemo(
    () => shipsInfo.pricesWei.map((w) => formatEther(w)),
    [shipsInfo.pricesWei.map((x) => x.toString()).join(",")],
  );
  const onChainUtcShips = useMemo(
    () => [...utcInfo.shipsPerTier],
    [utcInfo.shipsPerTier.join(",")],
  );
  const onChainUtcTokens = useMemo(
    () => utcInfo.pricesWei.map((w) => formatEther(w)),
    [utcInfo.pricesWei.map((x) => x.toString()).join(",")],
  );

  useEffect(() => {
    if (loadedDraftChainId === chainId) return;
    const draft = readDraft(chainId);
    if (draft) {
      setNativeShips(draft.nativeShips ?? []);
      setNativeEth(draft.nativeEth ?? []);
      setUtcShips(draft.utcShips ?? []);
      setUtcTokens(draft.utcTokens ?? []);
      setNativeDirty(Boolean(draft.nativeDirty));
      setUtcDirty(Boolean(draft.utcDirty));
      setHasNativeDraft(Boolean(draft.nativeDirty));
      setHasUtcDraft(Boolean(draft.utcDirty));
    } else {
      setNativeDirty(false);
      setUtcDirty(false);
      setHasNativeDraft(false);
      setHasUtcDraft(false);
      setNativeShips([]);
      setNativeEth([]);
      setUtcShips([]);
      setUtcTokens([]);
    }
    setLoadedDraftChainId(chainId);
  }, [chainId, loadedDraftChainId]);

  useEffect(() => {
    if (hasNativeDraft) return;
    if (shipsInfo.isLoading) {
      setNativeShips([]);
      setNativeEth([]);
      return;
    }
    if (shipsInfo.tierCount === 0) {
      setNativeShips([]);
      setNativeEth([]);
      return;
    }
    setNativeShips([...shipsInfo.shipsPerTier]);
    setNativeEth(shipsInfo.pricesWei.map((w) => formatEther(w)));
  }, [
    hasNativeDraft,
    shipsInfo.isLoading,
    shipsInfo.tierCount,
    onChainNativeShips.join(","),
    onChainNativeEth.join(","),
  ]);

  useEffect(() => {
    if (hasUtcDraft) return;
    if (utcInfo.isLoading) {
      setUtcShips([]);
      setUtcTokens([]);
      return;
    }
    if (!purchaserDeployed || utcInfo.tierCount === 0) {
      setUtcShips([]);
      setUtcTokens([]);
      return;
    }
    setUtcShips([...utcInfo.shipsPerTier]);
    setUtcTokens(utcInfo.pricesWei.map((w) => formatEther(w)));
  }, [
    hasUtcDraft,
    purchaserDeployed,
    utcInfo.isLoading,
    utcInfo.tierCount,
    onChainUtcShips.join(","),
    onChainUtcTokens.join(","),
  ]);

  useEffect(() => {
    if (!nativeDirty && !utcDirty) {
      clearDraft(chainId);
      return;
    }
    writeDraft(chainId, {
      nativeShips,
      nativeEth,
      utcShips,
      utcTokens,
      nativeDirty,
      utcDirty,
    });
  }, [
    chainId,
    nativeShips,
    nativeEth,
    utcShips,
    utcTokens,
    nativeDirty,
    utcDirty,
  ]);

  const nativeBuilt = useMemo(
    () => buildArgs(nativeShips, nativeEth),
    [nativeShips, nativeEth],
  );
  const utcBuilt = useMemo(() => buildArgs(utcShips, utcTokens), [utcShips, utcTokens]);

  const nativeTxArgs = nativeBuilt.ok
    ? nativeBuilt.args
    : emptyTxArgs(nativeShips.length || shipsInfo.tierCount || 1);
  const utcTxArgs = utcBuilt.ok
    ? utcBuilt.args
    : emptyTxArgs(utcShips.length || utcInfo.tierCount || 1);

  const isReloadingFromChain =
    shipsInfo.isLoading || (purchaserDeployed && utcInfo.isLoading);
  const hasUnsavedChanges = nativeDirty || utcDirty;

  const handleClearCacheAndReload = useCallback(() => {
    invalidateAllShipPurchasePriceCachesForChain(chainId);
    shipsInfo.refetch();
    if (purchaserDeployed) {
      utcInfo.refetch();
    }
    toast.success("Purchase price cache cleared. Reloading from chain.");
  }, [
    chainId,
    purchaserDeployed,
    shipsInfo.refetch,
    utcInfo.refetch,
  ]);

  const handleClearPriceEntry = useCallback(() => {
    clearDraft(chainId);
    setNativeDirty(false);
    setUtcDirty(false);
    setHasNativeDraft(false);
    setHasUtcDraft(false);
    setNativeShips([...onChainNativeShips]);
    setNativeEth([...onChainNativeEth]);
    if (purchaserDeployed) {
      setUtcShips([...onChainUtcShips]);
      setUtcTokens([...onChainUtcTokens]);
    } else {
      setUtcShips([]);
      setUtcTokens([]);
    }
    toast.success("Cleared unsaved price entry.");
  }, [
    chainId,
    onChainNativeShips,
    onChainNativeEth,
    purchaserDeployed,
    onChainUtcShips,
    onChainUtcTokens,
  ]);

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">Connect your wallet to open this tab.</p>
      </div>
    );
  }

  if (!canAdminShipPurchasePrices) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-warning-red">
          Access denied. Only the Ships or ShipPurchaser contract owner can view
          this admin tab.
        </p>
        <p className="text-text-muted text-sm font-mono">
          Ships owner: {shipsOwner ?? "…"}
        </p>
        <p className="text-text-muted text-sm font-mono">
          ShipPurchaser owner:{" "}
          {purchaserDeployed ? (purchaserOwner ?? "…") : "not deployed"}
        </p>
        <p className="text-text-muted text-sm font-mono">You: {address}</p>
      </div>
    );
  }

  const btnClass =
    "px-4 py-2 rounded-none border-2 text-cyan font-mono font-bold text-sm tracking-wider transition-colors hover:bg-cyan/10 disabled:opacity-50";
  const btnStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" };

  const renderSection = (config: {
    title: string;
    subtitle: string;
    canEdit: boolean;
    tierIndices: number[];
    ships: number[];
    setShips: React.Dispatch<React.SetStateAction<number[]>>;
    prices: string[];
    setPrices: React.Dispatch<React.SetStateAction<string[]>>;
    priceLabel: string;
    contractAddress: `0x${string}`;
    abi: Abi;
    transactionId: string;
    saveLabel: string;
    built: ReturnType<typeof buildArgs>;
    txArgs: [number[], bigint[]];
    isLoading: boolean;
    emptyMessage: string;
    onAfterSuccess: () => void;
    belowSubtitle?: React.ReactNode;
  }) => (
    <ShipPurchaseTierSectionCard
      title={config.title}
      subtitle={config.subtitle}
      isLoading={config.isLoading}
      isEmpty={config.tierIndices.length === 0}
      emptyMessage={config.emptyMessage}
      belowSubtitle={config.belowSubtitle}
      footer={
        config.canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <TransactionButton
              transactionId={config.transactionId}
              contractAddress={config.contractAddress}
              abi={config.abi}
              functionName="setPurchaseInfo"
              args={config.txArgs}
              allowWhenOtherPending
              disabled={!config.built.ok}
              className={btnClass}
              style={btnStyle}
              validateBeforeTransaction={() =>
                config.built.ok ? true : config.built.error
              }
              onSuccess={() => {
                toast.success("Purchase info updated");
                config.onAfterSuccess();
              }}
              onError={(error) =>
                toast.error(
                  error?.message
                    ? `Update failed: ${error.message}`
                    : "Update failed",
                )
              }
            >
              {config.saveLabel}
            </TransactionButton>
          </div>
        ) : (
          <p className="mt-3 text-amber/90 text-xs font-mono">
            Connect as this contract&apos;s owner to submit updates.
          </p>
        )
      }
    >
      <PurchaseTierTable
        editable={config.canEdit}
        rows={config.tierIndices.map((tier, i): PurchaseTierRowData => ({
          tierLabel: String(tier),
          shipCount: config.ships[i] ?? 0,
          onShipCountChange: (value) =>
            config.setShips((prev) => {
              const next = [...prev];
              next[i] = value;
              return next;
            }),
          prices: [
            {
              currencyLabel: config.priceLabel,
              value: config.prices[i] ?? "",
              onChange: (value) =>
                config.setPrices((prev) => {
                  const next = [...prev];
                  next[i] = value;
                  return next;
                }),
            },
          ],
        }))}
      />
    </ShipPurchaseTierSectionCard>
  );

  return (
    <div className="space-y-6">
      <ShipPurchasePricesHeaderCard
        description={
          <>
            Data loads from the chain and is cached in your browser for one
            week. Native purchases use{" "}
            <span className="text-text-secondary">Ships.purchaseWithFlow</span>. UTC
            pack purchases use{" "}
            <span className="text-text-secondary">ShipPurchaser.purchaseWithUC</span>.
            Each contract stores tier ship counts and prices with{" "}
            <span className="text-text-secondary">setPurchaseInfo</span>.
          </>
        }
        hasUnsavedChanges={hasUnsavedChanges}
        unsavedChangesLabel="Unsaved changes in price entry."
        actions={
          <>
            <button
              type="button"
              onClick={handleClearPriceEntry}
              disabled={!hasUnsavedChanges}
              className="px-4 py-2 rounded-none border-2 text-warning-red font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-warning-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-warning-red)" }}
            >
              [CLEAR PRICE ENTRY]
            </button>
            <button
              type="button"
              onClick={handleClearCacheAndReload}
              disabled={isReloadingFromChain}
              className="px-4 py-2 rounded-none border-2 text-amber font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-amber/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-amber)" }}
            >
              {isReloadingFromChain
                ? "[RELOADING…]"
                : "[CLEAR CACHE & RELOAD]"}
            </button>
          </>
        }
      />

      {renderSection({
        title: "Native token packs",
        subtitle: `Prices are paid in ${nativeSymbol} (18 decimals onchain).`,
        canEdit: isShipsOwner,
        tierIndices: shipsInfo.tiers,
        ships: nativeShips,
        setShips: (updater) => {
          setNativeDirty(true);
          setHasNativeDraft(true);
          setNativeShips(updater);
        },
        prices: nativeEth,
        setPrices: (updater) => {
          setNativeDirty(true);
          setHasNativeDraft(true);
          setNativeEth(updater);
        },
        priceLabel: nativeSymbol,
        contractAddress: shipsAddress,
        abi: CONTRACT_ABIS.SHIPS as Abi,
        transactionId: `set-native-purchase-info-${chainId}`,
        saveLabel: "[SAVE NATIVE PACKS]",
        built: nativeBuilt,
        txArgs: nativeTxArgs,
        isLoading: shipsInfo.isLoading,
        emptyMessage: "No native purchase tiers from Ships.getPurchaseInfo.",
        onAfterSuccess: () => {
          setNativeDirty(false);
          setHasNativeDraft(false);
          shipsInfo.refetch();
        },
      })}

      {purchaserDeployed ? (
        renderSection({
          title: "UTC packs",
          subtitle: "Prices are Universal Credits (18 decimals).",
          canEdit: isPurchaserOwner,
          tierIndices: utcInfo.tiers,
          ships: utcShips,
          setShips: (updater) => {
            setUtcDirty(true);
            setHasUtcDraft(true);
            setUtcShips(updater);
          },
          prices: utcTokens,
          setPrices: (updater) => {
            setUtcDirty(true);
            setHasUtcDraft(true);
            setUtcTokens(updater);
          },
          priceLabel: "UTC",
          contractAddress: purchaserAddress,
          abi: CONTRACT_ABIS.SHIP_PURCHASER as Abi,
          transactionId: `set-utc-purchase-info-${chainId}`,
          saveLabel: "[SAVE UTC PACKS]",
          built: utcBuilt,
          txArgs: utcTxArgs,
          isLoading: utcInfo.isLoading,
          emptyMessage:
            "No UTC purchase tiers from ShipPurchaser.getPurchaseInfo.",
          onAfterSuccess: () => {
            setUtcDirty(false);
            setHasUtcDraft(false);
            utcInfo.refetch();
          },
          belowSubtitle: (
            <p className="text-warning-red/90 text-xs font-mono">
              Note: it is unusual to change UTC pack prices unless you are
              running a sale.
            </p>
          ),
        })
      ) : (
        <div className="bg-steel rounded-none p-4 border border-gunmetal text-text-muted text-sm font-mono">
          ShipPurchaser is not deployed on this network. UTC pack pricing is
          unavailable.
        </div>
      )}
    </div>
  );
};

export default ShipPurchasePrices;
