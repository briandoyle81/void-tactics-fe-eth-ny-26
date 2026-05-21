"use client";

import React, { useState, useCallback } from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import type { Abi, Address } from "viem";
import { parseEther, formatEther } from "viem";
import { toast } from "react-hot-toast";
import { useMapExists } from "../hooks/useMapsContract";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "../hooks/useSwitchToSelectedChainIfNeeded";
import posthog from "posthog-js";

interface LobbyCreateButtonProps {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
  value: bigint;
  reservedJoiner?: Address; // Optional: address to reserve for (undefined or zero address for open lobby)
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onTransactionSent?: (hash: `0x${string}`) => void;
}

const LOBBY_CREATE_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_costLimit", type: "uint256" },
      { internalType: "uint256", name: "_turnTime", type: "uint256" },
      { internalType: "bool", name: "_creatorGoesFirst", type: "bool" },
      { internalType: "uint256", name: "_selectedMapId", type: "uint256" },
      { internalType: "uint256", name: "_maxScore", type: "uint256" },
      { internalType: "address", name: "_reservedJoiner", type: "address" },
    ],
    name: "createLobby",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const UTC_APPROVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyCreateButton({
  costLimit,
  turnTime,
  creatorGoesFirst,
  selectedMapId,
  maxScore,
  value,
  reservedJoiner,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  onTransactionSent,
}: LobbyCreateButtonProps) {
  const { address } = useAccount();
  const chainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(chainId);
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const [isApprovingUTC, setIsApprovingUTC] = useState(false);
  const [utcApproved, setUtcApproved] = useState(false);

  // Check if this is a reserved lobby
  const isReserved =
    reservedJoiner &&
    reservedJoiner !== "0x0000000000000000000000000000000000000000";
  const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;

  // Read native balance
  const { data: nativeBalance } = useBalance({ address, chainId });

  // Read UTC balance
  const { data: utcBalance } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
  });

  // Read UTC allowance
  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "allowance",
    args:
      address && contractAddresses.LOBBIES
        ? [address, contractAddresses.LOBBIES]
        : undefined,
    chainId,
  });

  // Check if map exists
  const { data: mapExists } = useMapExists(Number(selectedMapId));

  // Check if contract is paused
  const { data: paused } = useReadContract({
    address: contractAddresses.LOBBIES as `0x${string}`,
    abi: CONTRACT_ABIS.LOBBIES as Abi,
    functionName: "paused",
    chainId,
  });

  const { writeContract: writeUTC, data: approveHash } = useWriteContract();
  const publicClient = usePublicClient({ chainId });
  const { isLoading: isApproving, isSuccess: approveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
      chainId,
    });

  // UTC is required only for the reservation fee (1 UTC). Additional lobby fee is native.
  const totalUtcRequired = React.useMemo(() => {
    if (isReserved) return parseEther("1");
    return 0n;
  }, [isReserved]);

  // Type-safe UTC balance
  const utcBalanceBigInt = React.useMemo(() => utcBalance as bigint | undefined, [utcBalance]);

  // Check if UTC is approved
  React.useEffect(() => {
    if (totalUtcRequired > 0n && utcAllowance !== undefined) {
      setUtcApproved((utcAllowance as bigint) >= totalUtcRequired);
    } else if (totalUtcRequired === 0n) {
      setUtcApproved(true); // No approval needed if no UTC required
    }
  }, [totalUtcRequired, utcAllowance]);

  // Handle approval success
  React.useEffect(() => {
    if (approveSuccess) {
      setIsApprovingUTC(false);
      refetchAllowance();
      toast.success("UTC approved successfully!");
    }
  }, [approveSuccess, refetchAllowance]);

  const handleApproveUTC = useCallback(async () => {
    if (!address || totalUtcRequired === 0n) return;

    // Check balance
    if (!utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired) {
      toast.error(
        `Insufficient UTC balance. Need ${formatEther(totalUtcRequired)} UTC.`
      );
      return;
    }

    setIsApprovingUTC(true);
    try {
      await switchToSelectedChainIfNeeded();
      await writeUTC({
        address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
        abi: UTC_APPROVE_ABI,
        functionName: "approve",
        args: [contractAddresses.LOBBIES as `0x${string}`, totalUtcRequired],
        chainId,
        ...(await getLegacyGasPriceOverridesForWrite(chainId, publicClient)),
      });
    } catch (err) {
      setIsApprovingUTC(false);
      console.error("Failed to approve UTC:", err);
      toast.error("Failed to approve UTC transfer");
    }
  }, [
    address,
    chainId,
    contractAddresses.LOBBIES,
    contractAddresses.UNIVERSAL_CREDITS,
    publicClient,
    switchToSelectedChainIfNeeded,
    totalUtcRequired,
    utcBalanceBigInt,
    writeUTC,
  ]);

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (paused === true) {
      return "Lobby creation is currently paused";
    }
    if (mapExists === false) {
      return `Map ID ${selectedMapId} does not exist. Please select a valid map.`;
    }
    if (turnTime === 0n) {
      return "Turn time must be greater than 0";
    }
    // Prevent reserving lobby for yourself
    if (isReserved && reservedJoiner && address) {
      if (reservedJoiner.toLowerCase() === address.toLowerCase()) {
        return "Cannot reserve a lobby for yourself. Please enter a different player's address or leave empty for an open lobby.";
      }
    }
    // Check UTC requirements (reservation fee only)
    if (totalUtcRequired > 0n) {
      const balance = utcBalance as bigint | undefined;
      if (!balance || balance < totalUtcRequired) {
        return `Insufficient UTC balance. Need ${formatEther(totalUtcRequired)} UTC.`;
      }
      if (!utcApproved) {
        return `Please approve ${formatEther(totalUtcRequired)} UTC transfer first`;
      }
    }
    // Check native balance for additional lobby fee
    if (value > 0n) {
      if (!nativeBalance || nativeBalance.value < value) {
        return `Insufficient native balance. Need ${formatEther(value)} ${nativeBalance?.symbol ?? "native"} for the lobby fee.`;
      }
    }
    return true;
  }, [
    address,
    paused,
    mapExists,
    selectedMapId,
    turnTime,
    isReserved,
    reservedJoiner,
    totalUtcRequired,
    utcBalanceBigInt,
    utcApproved,
    value,
    nativeBalance,
  ]);

  const transactionId = React.useMemo(
    () =>
      `create-lobby-${address}-${costLimit}-${turnTime}-${selectedMapId}-${maxScore}-${
        reservedJoiner || "open"
      }`,
    [address, costLimit, turnTime, selectedMapId, maxScore, reservedJoiner]
  );

  // If UTC is required (reserved lobby) and not approved, show approve button
  if (
    totalUtcRequired > 0n &&
    !utcApproved &&
    !isApprovingUTC &&
    !isApproving
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-amber font-mono">
          <div>Required: 1 UTC (reservation fee){value > 0n ? ` + ${formatEther(value)} ${nativeBalance?.symbol ?? "native"} (lobby fee)` : ""}</div>
        </div>
        <button
          onClick={handleApproveUTC}
          disabled={!utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired}
          className={`${className.replace(/\brounded(-\w+)?\b/g, "").replace(/\s+/g, " ").trim()} ${
            !utcBalanceBigInt || utcBalanceBigInt < totalUtcRequired
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
          style={{
            borderRadius: 0, // Square corners for industrial theme
          }}
        >
          {`[APPROVE ${formatEther(totalUtcRequired)} UTC]`}
        </button>
      </div>
    );
  }

   return (
    <TransactionButton
      transactionId={transactionId}
      contractAddress={contractAddresses.LOBBIES as `0x${string}`}
      abi={LOBBY_CREATE_ABI}
      functionName="createLobby"
      args={[
        costLimit,
        turnTime,
        creatorGoesFirst,
        selectedMapId,
        maxScore,
        reservedJoiner || zeroAddress,
      ]}
      value={value}
      className={className}
      disabled={disabled || isApprovingUTC || isApproving}
      loadingText={
        isApprovingUTC || isApproving ? "[APPROVING UTC...]" : "[CREATING...]"
      }
      errorText="[ERROR CREATING]"
      onSuccess={() => {
        posthog.capture("lobby_created", {
          cost_limit_eth: formatEther(costLimit),
          turn_time_seconds: turnTime.toString(),
          creator_goes_first: creatorGoesFirst,
          max_score: maxScore.toString(),
          is_reserved: Boolean(isReserved),
        });
        onSuccess?.();
      }}
      onError={onError}
      onTransactionSent={onTransactionSent}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
