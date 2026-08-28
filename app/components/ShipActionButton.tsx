"use client";

import React from "react";
import { useConfig, usePublicClient, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { toast } from "react-hot-toast";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, getContractAddresses } from "../config/contracts";
import { useRevealRandomness } from "../hooks/useRandomManager";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "../hooks/useSwitchToSelectedChainIfNeeded";
import { useTransaction } from "../providers/TransactionContext";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import type { Ship } from "../types/types";
import type { Abi } from "viem";
import posthog from "posthog-js";

interface ShipActionButtonProps {
  action: "construct" | "constructAll" | "constructShips" | "recycle";
  shipId?: bigint;
  shipIds?: bigint[];
  /** The exact ships a construct action will attempt to construct (required
   * for construct/constructAll/constructShips, ignored for recycle) — used
   * to reveal each ship's RandomManager randomness first, since
   * constructShip/constructAllMyShips/constructShips now revert
   * NotYetRevealed otherwise. See docs/update/Frontend_Updates_2026-08-26.md. */
  ships?: Ship[];
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const SHIP_ACTION_CONFIG = {
  construct: {
    functionName: "constructShip",
    abi: [
      {
        inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
        name: "constructShip",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  constructAll: {
    functionName: "constructAllMyShips",
    abi: [
      {
        inputs: [],
        name: "constructAllMyShips",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  constructShips: {
    functionName: "constructShips",
    abi: [
      {
        inputs: [
          {
            internalType: "uint256[]",
            name: "_ids",
            type: "uint256[]",
          },
        ],
        name: "constructShips",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ] as Abi,
  },
  recycle: {
    functionName: "shipBreaker",
    abi: [
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
    ] as Abi,
  },
};

const CONSTRUCT_ACTIONS = new Set(["construct", "constructAll", "constructShips"]);

function messageFromUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function ShipActionButton({
  action,
  shipId,
  shipIds,
  ships,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: ShipActionButtonProps) {
  const config = SHIP_ACTION_CONFIG[action];
  const isConstructAction = CONSTRUCT_ACTIONS.has(action);

  // Generate transaction ID based on action and parameters
  const transactionId = React.useMemo(() => {
    switch (action) {
      case "construct":
        return `construct-ship-${shipId}`;
      case "constructAll":
        return "construct-all-ships";
      case "constructShips":
        return `construct-ships-${shipIds?.length || 0}`;
      case "recycle":
        return `recycle-ships-${shipIds?.join("-")}`;
      default:
        return `ship-action-${action}`;
    }
  }, [action, shipId, shipIds]);

  // Prepare arguments based on action
  const args = React.useMemo(() => {
    switch (action) {
      case "construct":
        return shipId ? [shipId] : [];
      case "constructAll":
        return [];
      case "constructShips":
        return shipIds ? [shipIds] : [];
      case "recycle":
        return shipIds ? [shipIds] : [];
      default:
        return [];
    }
  }, [action, shipId, shipIds]);

  // Validation function
  const validateBeforeTransaction = React.useCallback(() => {
    switch (action) {
      case "construct":
        if (!shipId) {
          return "No ship ID provided";
        }
        return true;
      case "constructAll":
        return true;
      case "constructShips":
        if (!shipIds || shipIds.length === 0) {
          return "No ships selected for construction";
        }
        return true;
      case "recycle":
        if (!shipIds || shipIds.length === 0) {
          return "No ships selected for recycling";
        }
        return true;
      default:
        return true;
    }
  }, [action, shipId, shipIds]);

  const handleConstructSuccess = React.useCallback(() => {
    posthog.capture("ships_constructed", {
      action,
      ship_count: action === "construct" ? 1 : (shipIds?.length ?? 0),
    });
    onSuccess?.();
  }, [action, shipIds, onSuccess]);

  if (isConstructAction) {
    return (
      <RevealThenConstructButton
        transactionId={transactionId}
        functionName={config.functionName}
        abi={config.abi}
        args={args}
        ships={ships ?? []}
        className={className}
        disabled={disabled}
        validateBeforeTransaction={validateBeforeTransaction}
        onSuccess={handleConstructSuccess}
        onError={onError}
      >
        {children}
      </RevealThenConstructButton>
    );
  }

  return (
    <TransactionButton
      transactionId={transactionId}
      contractAddress={CONTRACT_ADDRESSES.SHIPS as `0x${string}`}
      abi={config.abi}
      functionName={config.functionName}
      args={args}
      className={className}
      disabled={disabled}
      loadingText={`[${action.toUpperCase()}...]`}
      errorText={`[ERROR ${action.toUpperCase()}]`}
      onSuccess={() => {
        posthog.capture("ships_recycled", { ship_count: shipIds?.length ?? 0 });
        onSuccess?.();
      }}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}

// Construct actions need a RandomManager.revealRandomness signature per
// not-yet-constructed ship before the construct call itself will succeed
// (NotYetRevealed otherwise) — TransactionButton only fires one contract
// call per click, so this drives the multi-step sequence imperatively
// instead, reusing TransactionButton's global pending-transaction context
// so it still disables/reflects state alongside every other button.
function RevealThenConstructButton({
  transactionId,
  functionName,
  abi,
  args,
  ships,
  children,
  className,
  disabled,
  validateBeforeTransaction,
  onSuccess,
  onError,
}: {
  transactionId: string;
  functionName: string;
  abi: Abi;
  args: unknown[];
  ships: Ship[];
  children: React.ReactNode;
  className: string;
  disabled: boolean;
  validateBeforeTransaction: () => boolean | string;
  onSuccess: () => void;
  onError?: (error: Error) => void;
}) {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const publicClient = usePublicClient({ chainId: activeChainId });
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();
  const { revealAllForShips } = useRevealRandomness();
  const {
    transactionState,
    startTransaction,
    completeTransaction,
  } = useTransaction();

  const [isRunning, setIsRunning] = React.useState(false);
  const [step, setStep] = React.useState<"reveal" | "construct" | null>(null);

  const isActiveTransaction = transactionState.activeTransactionId === transactionId;
  const isDisabled =
    disabled ||
    isRunning ||
    (transactionState.isPending && !isActiveTransaction);

  const handleClick = async () => {
    const validation = validateBeforeTransaction();
    if (validation !== true) {
      toast.error(validation as string);
      return;
    }

    setIsRunning(true);
    startTransaction(transactionId);
    try {
      await switchToSelectedChainIfNeeded();

      const unconstructed = ships.filter((s) => !s.shipData.constructed);
      if (unconstructed.length > 0) {
        setStep("reveal");
        await revealAllForShips(unconstructed);
      }

      setStep("construct");
      if (!publicClient) throw new Error("No RPC client available");
      const hash = await writeContractAsync({
        address: contractAddresses.SHIPS as `0x${string}`,
        abi,
        functionName,
        args,
        chainId: activeChainId,
        ...(await getLegacyGasPriceOverridesForWrite(activeChainId, publicClient)),
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
        chainId: activeChainId,
      });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on-chain");
      }

      completeTransaction(transactionId, true);
      onSuccess();
    } catch (err: unknown) {
      const message = messageFromUnknownError(err);
      const isUserRejection =
        message.includes("User rejected") ||
        message.includes("User denied") ||
        message.includes("rejected");
      const error = new Error(message);
      completeTransaction(transactionId, false, error);
      if (isUserRejection) {
        toast.error("Transaction declined by user");
      } else if (message.includes("TooSoonToReveal")) {
        toast.error(
          "Ship randomness isn't ready to reveal yet — try again in a few seconds.",
        );
      } else {
        toast.error(`Failed to construct: ${message}`);
      }
      onError?.(error);
    } finally {
      setIsRunning(false);
      setStep(null);
    }
  };

  let buttonContent = children;
  if (isRunning) {
    buttonContent = step === "reveal" ? "[REVEALING...]" : "[CONSTRUCTING...]";
  }

  const cleanedClassName = className
    .replace(/\brounded(-\w+)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <button
      onClick={() => void handleClick()}
      disabled={isDisabled}
      className={`${cleanedClassName} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{ borderRadius: 0 }}
    >
      {buttonContent}
    </button>
  );
}
