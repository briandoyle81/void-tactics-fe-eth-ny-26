"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAccount,
  useBalance,
  useConfig,
  useReadContract,
} from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import type { Abi } from "viem";
import UTCPurchaseModal from "./UTCPurchaseModal";
import {
  DEFAULT_CHAIN_ID,
  getSelectedChainId,
  getNativeTokenSymbol,
  getVariantForChainId,
  isChainSelectableInUi,
  isSupportedChainId,
  setSelectedChainId,
  SUPPORTED_CHAINS,
  VOID_TACTICS_CHAIN_CHANGED_EVENT,
} from "../config/networks";
import { switchWalletToAppChain } from "../utils/switchWalletChain";
import { readRpcErrorCode } from "../utils/ensureUiChainsInWallet";
import { ALPHA_DISCORD_INVITE_URL } from "../config/alpha";

const VOID_TACTICS_X_URL = "https://x.com/voidtacticsxyz";

const FAUCET_URLS: Record<number, string> = {
  545: "https://faucet.flow.com/fund-account",
  84532: "https://thirdweb.com/base-sepolia-testnet",
  2021: "https://faucet.roninchain.com/",
  37714555429: "https://faucet.quicknode.com/xai",
};

function resolveChainIdFromQueryParam(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && isChainSelectableInUi(numeric)) {
    return numeric;
  }
  const byName: Record<string, number> = {
    flow: 545,
    "flow-testnet": 545,
    ronin: 2021,
    saigon: 2021,
    "ronin-saigon": 2021,
    base: 84532,
    "base-sepolia": 84532,
    xai: 37714555429,
    "xai-testnet": 37714555429,
    "xai-testnet-v2": 37714555429,
  };
  const chainId = byName[normalized];
  return typeof chainId === "number" && isChainSelectableInUi(chainId)
    ? chainId
    : null;
}

function HeaderAlphaBadge({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`shrink-0 border border-solid w-fit ${
        compact ? "px-2 py-0.5" : "px-2.5 py-1"
      }`}
      style={{
        fontFamily:
          "var(--font-jetbrains-mono), 'Courier New', monospace",
        fontSize: compact ? "10px" : "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: compact ? "0.06em" : "0.1em",
        color: "var(--color-amber)",
        borderColor: "rgba(245, 158, 11, 0.75)",
        backgroundColor: "rgba(13, 17, 23, 0.7)",
      }}
    >
      [TESTNET ALPHA]
    </div>
  );
}

function HeaderDisconnectedConnect({
  connectButtonClassName,
}: {
  connectButtonClassName: string;
}) {
  const { setShowAuthFlow } = useDynamicContext();

  return (
    <button
      onClick={() => setShowAuthFlow(true)}
      type="button"
      className={connectButtonClassName}
      style={{
        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
        borderColor: "var(--color-cyan)",
        color: "var(--color-cyan)",
        backgroundColor: "var(--color-steel)",
        borderRadius: 0,
      }}
    >
      [LOG IN]
    </button>
  );
}

function HeaderTitleBlock({ variant }: { variant?: "mobile" | "desktop" }) {
  const isMobile = variant === "mobile";
  return (
    <div
      className={
        isMobile
          ? "relative min-w-0 shrink"
          : "relative w-fit shrink-0"
      }
    >
      <h1
        className={
          isMobile
            ? "truncate text-xl font-black uppercase leading-none tracking-wide sm:text-2xl"
            : "text-[34px] font-black uppercase leading-none tracking-[0.06em] sm:text-3xl md:text-4xl"
        }
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          color: "var(--color-text-primary)",
        }}
      >
        VOID TACTICS
      </h1>
      <div
        className={isMobile ? "mt-0.5 h-0.5 w-full" : "absolute -bottom-1 left-0 right-0 h-0.5"}
        style={{ backgroundColor: "var(--color-cyan)" }}
      />
    </div>
  );
}

function HeaderXLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={VOID_TACTICS_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Void Tactics on X"
      title="Follow on X"
      className={`inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      }`}
      style={{
        color: "var(--color-cyan)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-slate)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)";
      }}
    >
      <svg
        className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2H21.5l-7.108 8.124L22.75 22h-6.547l-5.128-6.703L5.21 22H1.95l7.604-8.692L1.25 2h6.713l4.636 6.112L18.244 2Zm-1.147 18.04h1.803L6.982 3.86H5.047L17.097 20.04Z" />
      </svg>
    </a>
  );
}

function HeaderDiscordLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={ALPHA_DISCORD_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join Void Tactics Discord"
      title="Join Discord"
      className={`inline-flex shrink-0 items-center justify-center border border-solid transition-colors duration-150 ${
        compact ? "h-8 w-8" : "h-9 w-9"
      }`}
      style={{
        color: "var(--color-cyan)",
        backgroundColor: "rgba(13, 17, 23, 0.75)",
        borderColor: "rgba(86, 214, 255, 0.75)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-slate)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(13, 17, 23, 0.75)";
      }}
    >
      <svg
        className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.32 4.37A19.79 19.79 0 0 0 15.4 2.8a13.92 13.92 0 0 0-.63 1.3 18.35 18.35 0 0 0-5.55 0 13.5 13.5 0 0 0-.63-1.3A19.66 19.66 0 0 0 3.68 4.37C.56 8.98-.27 13.47.15 17.9a20.04 20.04 0 0 0 6.07 3.08c.5-.69.95-1.42 1.33-2.19-.73-.27-1.42-.61-2.08-1.01.17-.12.34-.25.5-.39 4.01 1.88 8.35 1.88 12.31 0 .17.14.34.27.5.39-.66.4-1.36.74-2.09 1.01.38.76.83 1.49 1.34 2.18a19.96 19.96 0 0 0 6.06-3.08c.5-5.13-.86-9.58-3.77-13.53ZM8.02 15.15c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.97 2.45-2.18 2.45Zm7.96 0c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.22 0 2.2 1.1 2.18 2.45 0 1.35-.96 2.45-2.18 2.45Z" />
      </svg>
    </a>
  );
}

const Header: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showUTCPurchaseModal, setShowUTCPurchaseModal] = useState(false);
  const [hasVariantMismatch, setHasVariantMismatch] = useState(false);
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);

  const account = useAccount();
  const config = useConfig();

  const [selectedChainId, setSelectedChainIdState] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_CHAIN_ID;
    return getSelectedChainId();
  });
  const pendingSwitchChainIdRef = useRef<number | null>(null);
  /** When true, do not overwrite the header picker from `account.chainId` while storage still targets another network. */
  const userChoseNetworkThisSessionRef = useRef(false);
  const lastSwitchRequestRef = useRef<{ chainId: number; at: number } | null>(
    null,
  );
  const lastVariantWarningKeyRef = useRef<string | null>(null);
  const networkMenuRef = useRef<HTMLDivElement | null>(null);
  /** Apply `?chain=` / `?network=` only once so manual picks are not overwritten on every change. */
  const urlChainQueryConsumedRef = useRef(false);

  const nativeTokenSymbol = getNativeTokenSymbol(selectedChainId);
  const selectedChainVariant = getVariantForChainId(selectedChainId);
  const { data: balance } = useBalance({
    address: account.address,
    chainId: selectedChainId,
    query: { enabled: isHydrated && !!account.address },
  });

  const maxVariantConfig = useMemo(
    () => ({
      address: CONTRACT_ADDRESSES.SHIPS as `0x${string}`,
      abi: CONTRACT_ABIS.SHIPS as Abi,
      functionName: "maxVariant" as const,
      chainId: selectedChainId,
      query: {
        enabled: isHydrated && isSupportedChainId(selectedChainId),
      },
    }),
    [isHydrated, selectedChainId],
  );

  const { data: maxVariant } = useReadContract(maxVariantConfig);

  // Read UTC balance
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: account.address ? [account.address] : undefined,
    chainId: selectedChainId,
    query: { enabled: isHydrated && !!account.address },
  });

  const { handleLogOut } = useDynamicContext();

  // Hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Support links like `/?chain=ronin-saigon` to preselect network (once per page load).
  useEffect(() => {
    if (!isHydrated) return;
    if (urlChainQueryConsumedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const requestedChain =
      resolveChainIdFromQueryParam(params.get("chain")) ??
      resolveChainIdFromQueryParam(params.get("network"));

    if (requestedChain == null) {
      urlChainQueryConsumedRef.current = true;
      return;
    }

    const stored = getSelectedChainId();
    if (requestedChain === stored) {
      urlChainQueryConsumedRef.current = true;
      return;
    }

    urlChainQueryConsumedRef.current = true;
    setSelectedChainId(requestedChain);
    setSelectedChainIdState(requestedChain);
    userChoseNetworkThisSessionRef.current = true;
    pendingSwitchChainIdRef.current = requestedChain;
    lastSwitchRequestRef.current = { chainId: requestedChain, at: Date.now() };
  }, [isHydrated]);

  // Check if wallet is connecting
  const isConnecting =
    account.status === "connecting" || account.status === "reconnecting";

  // Keep selected chain in sync with wallet chain after a successful switch/connect.
  useEffect(() => {
    if (!isHydrated) return;
    if (account.status !== "connected") return;
    if (!isSupportedChainId(account.chainId)) return;
    if (
      pendingSwitchChainIdRef.current &&
      account.chainId !== pendingSwitchChainIdRef.current
    ) {
      return;
    }

    pendingSwitchChainIdRef.current = null;
    if (selectedChainId !== account.chainId) {
      // Only sync app selection to the wallet chain when that chain is enabled in the UI picker.
      if (!isChainSelectableInUi(account.chainId)) return;
      // After the user picks a network here, do not snap the picker back to the old wallet chain
      // while localStorage still matches their choice (switch in flight or MetaMask lag).
      const storedTarget = getSelectedChainId();
      if (
        userChoseNetworkThisSessionRef.current &&
        isChainSelectableInUi(storedTarget) &&
        storedTarget !== account.chainId
      ) {
        return;
      }
      setSelectedChainId(account.chainId);
      setSelectedChainIdState(account.chainId);
    }
  }, [isHydrated, account.status, account.chainId, selectedChainId]);

  // Warn if chain variant mapping is incompatible with deployed contract config.
  useEffect(() => {
    if (!isHydrated || maxVariant == null) {
      setHasVariantMismatch(false);
      return;
    }
    const maxVariantNumber = Number(maxVariant);
    if (!Number.isFinite(maxVariantNumber)) {
      setHasVariantMismatch(false);
      return;
    }
    if (selectedChainVariant <= maxVariantNumber) {
      setHasVariantMismatch(false);
      return;
    }

    setHasVariantMismatch(true);

    const warningKey = `${selectedChainId}:${selectedChainVariant}:${maxVariantNumber}`;
    if (lastVariantWarningKeyRef.current === warningKey) return;
    lastVariantWarningKeyRef.current = warningKey;

    toast.error(
      `Network variant mismatch: selected variant ${selectedChainVariant} exceeds contract maxVariant ${maxVariantNumber}. Claims and purchases may fail until mapping is updated.`,
      { duration: 8000 },
    );
  }, [isHydrated, maxVariant, selectedChainId, selectedChainVariant]);

  // Resolve an explicit user-initiated network switch request.
  useEffect(() => {
    if (!isHydrated) return;
    const pending = pendingSwitchChainIdRef.current;
    if (pending == null) return;
    if (account.status !== "connected") return;
    if (!isSupportedChainId(pending)) return;
    if (account.chainId === pending) {
      pendingSwitchChainIdRef.current = null;
      return;
    }

    // Avoid spamming switch requests while a wallet prompt is pending
    const now = Date.now();
    const last = lastSwitchRequestRef.current;
    if (last && last.chainId === pending && now - last.at < 2000) {
      return;
    }
    lastSwitchRequestRef.current = { chainId: pending, at: now };
    const connector = account.connector;
    if (!connector) return;
    void switchWalletToAppChain(config, connector, pending).catch((err) => {
      console.error("Network switch failed:", err);
      const code = readRpcErrorCode(err);
      toast.error(
        err instanceof Error
          ? `${err.message}${code != null ? ` (code ${code})` : ""}`
          : "Could not switch network",
      );
    });
  }, [account.status, account.chainId, account.connector, config, isHydrated]);

  const handleNetworkChange = (nextId: number) => {
    if (!isChainSelectableInUi(nextId)) {
      toast.error("This network is unavailable for now");
      return;
    }
    setSelectedChainId(nextId);
    setSelectedChainIdState(nextId);
    userChoseNetworkThisSessionRef.current = true;
    pendingSwitchChainIdRef.current = nextId;
    lastSwitchRequestRef.current = { chainId: nextId, at: Date.now() };
    if (
      isHydrated &&
      account.status === "connected" &&
      account.chainId !== nextId &&
      account.connector
    ) {
      void switchWalletToAppChain(config, account.connector, nextId).catch(
        (err) => {
          console.error("Network switch failed:", err);
          const code = readRpcErrorCode(err);
          toast.error(
            err instanceof Error
              ? `${err.message}${code != null ? ` (code ${code})` : ""}`
              : "Could not switch network",
          );
        },
      );
    }
    setIsNetworkMenuOpen(false);
  };

  useEffect(() => {
    const handleChainChanged = () => {
      setShowUTCPurchaseModal(false);
      setIsNetworkMenuOpen(false);
      setIsMobileMenuOpen(false);
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, handleChainChanged);
    return () => {
      window.removeEventListener(
        VOID_TACTICS_CHAIN_CHANGED_EVENT,
        handleChainChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (!isNetworkMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (networkMenuRef.current && !networkMenuRef.current.contains(target)) {
        setIsNetworkMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNetworkMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedMenuButton = menuButtonRef.current?.contains(target);
      const clickedMenuPanel = mobileMenuPanelRef.current?.contains(target);
      if (!clickedMenuButton && !clickedMenuPanel) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    try {
      userChoseNetworkThisSessionRef.current = false;
      await handleLogOut();
      toast.success("Successfully disconnected!");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect. Please try again.");
    }
  };

  const isConnected = account.isConnected;

  const showMobileWalletMenu =
    isHydrated && (isConnecting || isConnected);

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      setIsMobileMenuOpen(false);
    }
  }, [isConnected, isConnecting]);

  const renderMobileTrailingSlot = () => {
    const assignMenuRef = (el: HTMLElement | null) => {
      menuButtonRef.current = el;
    };

    if (!isHydrated) {
      return (
        <div
          ref={assignMenuRef}
          className="h-9 w-9 shrink-0"
          aria-hidden
        />
      );
    }
    if (!isConnected && !isConnecting) {
      return (
        <div ref={assignMenuRef} className="shrink-0">
          <HeaderDisconnectedConnect connectButtonClassName="px-3 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150 text-xs" />
        </div>
      );
    }
    return (
      <button
        ref={assignMenuRef}
        type="button"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center border border-solid transition-colors duration-150"
        style={{
          color: "var(--color-cyan)",
          backgroundColor: "rgba(13, 17, 23, 0.75)",
          borderColor: "rgba(86, 214, 255, 0.75)",
          borderTopColor: "var(--color-steel)",
          borderLeftColor: "var(--color-steel)",
          borderRadius: 0,
        }}
        aria-expanded={isMobileMenuOpen}
        aria-controls="header-mobile-controls"
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <span className="relative block h-3.5 w-4">
          <span
            className={`absolute left-0 h-0.5 w-4 bg-current transition-all duration-200 ${
              isMobileMenuOpen ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 h-0.5 w-4 bg-current transition-opacity duration-200 ${
              isMobileMenuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 h-0.5 w-4 bg-current transition-all duration-200 ${
              isMobileMenuOpen ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>
    );
  };

  return (
    <header
      className="relative z-[300] border-b-2 border-solid overflow-visible"
      style={{
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
      }}
    >
      <div className="mx-auto max-w-7xl overflow-visible px-3 sm:px-6 lg:px-8">
        <div className="relative flex flex-wrap items-start justify-between gap-2 overflow-visible py-2 md:items-center md:gap-4 md:py-2">
          {/* Left side - Logo and Title */}
          <div className="flex w-full flex-col items-stretch gap-1.5 md:w-auto md:items-start md:gap-3">
            {/* Mobile: title + testnet badge on same row. */}
            <div className="flex w-full flex-col gap-1.5 md:hidden">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-end gap-2 pr-1">
                  <HeaderTitleBlock variant="mobile" />
                  <HeaderAlphaBadge compact />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <HeaderDiscordLink compact />
                  <HeaderXLink compact />
                  {renderMobileTrailingSlot()}
                </div>
              </div>
            </div>

            {/* Desktop: title and testnet badge on one row */}
            <div className="hidden md:flex md:flex-row md:items-end md:gap-3">
              <HeaderTitleBlock />
              <HeaderAlphaBadge />
              <HeaderDiscordLink />
              <HeaderXLink />
            </div>
          </div>

          {/* Right side - Wallet connection and info */}
          {isHydrated && (
            <div
              ref={mobileMenuPanelRef}
              id="header-mobile-controls"
              className={`${
                showMobileWalletMenu && isMobileMenuOpen
                  ? "flex md:flex"
                  : "hidden md:flex"
              } w-[min(92vw,380px)] md:ml-auto md:w-auto flex-col md:flex-row absolute right-0 top-[calc(100%+8px)] z-[360] border border-solid p-3 bg-[var(--color-near-black)] border-[var(--color-gunmetal)] border-t-[var(--color-steel)] border-l-[var(--color-steel)] md:static md:z-auto md:border-0 md:p-0 md:bg-transparent`}
            >
              {isConnecting && (
                <div className="flex items-center md:ml-auto py-1">
                  <div className="text-cyan/60 font-mono text-sm">
                    Connecting...
                  </div>
                </div>
              )}

              {!isConnected && !isConnecting && (
                <div className="hidden md:flex items-center md:ml-auto w-full md:w-auto pt-1 md:pt-0">
                  <HeaderDisconnectedConnect connectButtonClassName="px-6 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150 w-full md:w-auto" />
                </div>
              )}

              {isConnected && (
                <div className="flex w-full md:w-auto flex-col sm:flex-row items-stretch md:items-end gap-3 md:gap-4 md:ml-auto pt-1 md:pt-0">
                  <div className="flex flex-col items-stretch md:items-end gap-2">
                    {/* Flow Balance and Buy Flow button */}
                    <div className="flex items-center gap-2 justify-between md:justify-start">
                      {/* Flow Balance */}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 h-8 w-40 justify-center border border-solid"
                        style={{
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "var(--color-phosphor-green)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                      >
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-phosphor-green)",
                          }}
                        >
                          {balance?.value
                            ? `${parseFloat(balance.formatted).toFixed(2)} ${nativeTokenSymbol}`
                            : `0.00 ${nativeTokenSymbol}`}
                        </span>
                      </div>
                      {/* Get Tokens link — opens chain-appropriate faucet */}
                      <a
                        href={FAUCET_URLS[selectedChainId] ?? FAUCET_URLS[545]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-32 h-8 border border-solid text-xs font-bold tracking-wider uppercase flex items-center justify-center transition-colors duration-150"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: "var(--color-cyan)",
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "rgba(86, 214, 255, 0.75)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--color-near-black)";
                        }}
                      >
                        [GET TOKENS]
                      </a>
                    </div>

                    {/* UTC Balance and Network */}
                    <div className="flex items-center gap-2 justify-between md:justify-start">
                      {/* UTC Balance - Clickable */}
                      <button
                        onClick={() => setShowUTCPurchaseModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 h-8 w-40 justify-center border border-solid transition-colors duration-150 cursor-pointer"
                        style={{
                          backgroundColor: "var(--color-near-black)",
                          borderColor: "var(--color-amber)",
                          borderTopColor: "var(--color-steel)",
                          borderLeftColor: "var(--color-steel)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-amber)";
                          e.currentTarget.style.backgroundColor =
                            "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--color-amber)";
                          e.currentTarget.style.backgroundColor =
                            "var(--color-near-black)";
                        }}
                      >
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-amber)",
                          }}
                        >
                          {utcBalance
                            ? `${formatEther(utcBalance as bigint)} UTC`
                            : "0.00 UTC"}
                        </span>
                      </button>
                      {/* Network (moved here) */}
                      <div
                        ref={networkMenuRef}
                        className="relative z-[120] h-8 w-32"
                      >
                        <button
                          type="button"
                          onClick={() => setIsNetworkMenuOpen((prev) => !prev)}
                          disabled={!isHydrated || isConnecting}
                          className="flex h-full w-full items-center justify-center border border-solid px-3 pr-7 text-center text-[11px] font-bold uppercase tracking-wider transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70"
                          style={{
                            fontFamily:
                              "var(--font-jetbrains-mono), 'Courier New', monospace",
                            color: "var(--color-cyan)",
                            backgroundColor: "var(--color-near-black)",
                            borderColor: "var(--color-cyan)",
                            borderTopColor: "var(--color-steel)",
                            borderLeftColor: "var(--color-steel)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isHydrated || isConnecting) return;
                            e.currentTarget.style.backgroundColor =
                              "var(--color-slate)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "var(--color-near-black)";
                          }}
                        >
                          {(
                            SUPPORTED_CHAINS.find((c) => c.id === selectedChainId)
                              ?.name ?? "NETWORK"
                          ).toUpperCase()}
                        </button>
                        <span
                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] leading-none"
                          style={{ color: "var(--color-cyan)" }}
                        >
                          {isNetworkMenuOpen ? "▲" : "▼"}
                        </span>

                        {isNetworkMenuOpen && (
                          <div
                            className="absolute left-0 top-[calc(100%+4px)] z-[130] w-32 border border-solid"
                            style={{
                              backgroundColor: "var(--color-near-black)",
                              borderColor: "var(--color-cyan)",
                              borderTopColor: "var(--color-steel)",
                              borderLeftColor: "var(--color-steel)",
                            }}
                          >
                            {SUPPORTED_CHAINS.map((c) => {
                              const isActive = c.id === selectedChainId;
                              const selectable = isChainSelectableInUi(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  disabled={!selectable}
                                  title={
                                    selectable
                                      ? undefined
                                      : "Unavailable on this build"
                                  }
                                  onClick={() => handleNetworkChange(c.id)}
                                  className={`flex h-8 w-full items-center px-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors duration-150 ${
                                    !selectable
                                      ? "cursor-not-allowed opacity-45"
                                      : ""
                                  }`}
                                  style={{
                                    fontFamily:
                                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                                    color: isActive
                                      ? "var(--color-near-black)"
                                      : "var(--color-cyan)",
                                    backgroundColor: isActive
                                      ? "var(--color-cyan)"
                                      : "transparent",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (isActive || !selectable) return;
                                    e.currentTarget.style.backgroundColor =
                                      "var(--color-slate)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (isActive || !selectable) return;
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                >
                                  {c.name.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-col items-stretch">
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150 w-full md:w-48 flex items-center justify-center text-xs h-8"
                      style={{
                        fontFamily:
                          "var(--font-rajdhani), 'Arial Black', sans-serif",
                        borderColor: "var(--color-warning-red)",
                        color: "var(--color-warning-red)",
                        backgroundColor: "var(--color-steel)",
                        borderRadius: 0, // Square corners for industrial theme
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-slate)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--color-steel)";
                      }}
                    >
                      [LOG OUT]
                    </button>
                    {/* Address (moved here) */}
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 h-8 w-full md:w-48 justify-center border border-solid"
                      style={{
                        backgroundColor: "var(--color-near-black)",
                        borderColor: "var(--color-gunmetal)",
                        borderTopColor: "var(--color-steel)",
                        borderLeftColor: "var(--color-steel)",
                      }}
                    >
                      <span
                        className="text-xs font-bold tracking-wider uppercase"
                        style={{
                          fontFamily:
                            "var(--font-jetbrains-mono), 'Courier New', monospace",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {formatAddress(account.address || "")}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(account.address || "");
                          toast.success("Address copied to clipboard!");
                        }}
                        className="p-1 transition-colors duration-150"
                        style={{
                          color: "var(--color-text-secondary)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--color-cyan)";
                          e.currentTarget.style.backgroundColor =
                            "var(--color-slate)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            "var(--color-text-secondary)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        title="Copy address to clipboard"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Variant mismatch persistent banner */}
      {hasVariantMismatch && (
        <div
          className="border-t border-solid px-4 py-1.5 text-xs font-bold tracking-wider uppercase"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
            color: "var(--color-warning-red)",
            backgroundColor: "color-mix(in srgb, var(--color-warning-red) 10%, transparent)",
            borderColor: "color-mix(in srgb, var(--color-warning-red) 40%, transparent)",
          }}
        >
          &#9888; Network variant mismatch — claims and purchases may fail. Try switching networks.
        </div>
      )}

      {/* UTC Purchase Modal */}
      {showUTCPurchaseModal && (
        <UTCPurchaseModal onClose={() => setShowUTCPurchaseModal(false)} />
      )}
    </header>
  );
};

export default Header;
