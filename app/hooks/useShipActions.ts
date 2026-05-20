import { useAccount, useConfig, usePublicClient } from "wagmi";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useShipsWrite } from "./useShipsContract";
import { useOwnedShips } from "./useOwnedShips";
import { toast } from "react-hot-toast";
import { getContractAddresses } from "../config/contracts";
import { useEffect } from "react";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "./useSwitchToSelectedChainIfNeeded";

export function useShipActions() {
  const { address } = useAccount();
  const config = useConfig();
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const { refetch } = useOwnedShips();
  const { writeContractAsync, isPending, error } = useShipsWrite();
  const publicClient = usePublicClient({ chainId: activeChainId });

  // Handle write contract errors (including user rejection)
  useEffect(() => {
    if (error) {
      const errorMessage = error.message || "";
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Transaction failed: " + errorMessage);
      }
    }
  }, [error]);

  // Construct a single ship
  const constructShip = async (shipId: bigint) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await switchToSelectedChainIfNeeded();
      const hash = await writeContractAsync({
        address: contractAddresses.SHIPS as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
            name: "constructShip",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "constructShip",
        args: [shipId],
        chainId: activeChainId,
        ...(await getLegacyGasPriceOverridesForWrite(
          activeChainId,
          publicClient,
        )),
      });

      await waitForTransactionReceipt(config, {
        hash,
        chainId: activeChainId,
      });

      toast.success("Ship constructed!");
      await refetch();
      setTimeout(() => {
        void refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to construct ship");
      }
    }
  };

  // Construct all owned ships
  const constructAllShips = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await switchToSelectedChainIfNeeded();
      const hash = await writeContractAsync({
        address: contractAddresses.SHIPS as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: "constructAllMyShips",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "constructAllMyShips",
        args: [],
        chainId: activeChainId,
        ...(await getLegacyGasPriceOverridesForWrite(
          activeChainId,
          publicClient,
        )),
      });

      await waitForTransactionReceipt(config, {
        hash,
        chainId: activeChainId,
      });

      toast.success("Ships constructed!");
      await refetch();
      setTimeout(() => {
        void refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to construct ships");
      }
    }
  };

  // Recycle ships for UC tokens
  const recycleShips = async (shipIds: bigint[]) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (shipIds.length === 0) {
      toast.error("No ships selected for recycling");
      return;
    }

    try {
      await switchToSelectedChainIfNeeded();
      const hash = await writeContractAsync({
        address: contractAddresses.SHIPS as `0x${string}`,
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
        ],
        functionName: "shipBreaker",
        args: [shipIds],
        chainId: activeChainId,
        ...(await getLegacyGasPriceOverridesForWrite(
          activeChainId,
          publicClient,
        )),
      });

      await waitForTransactionReceipt(config, {
        hash,
        chainId: activeChainId,
      });

      toast.success(`Recycled ${shipIds.length} ships for UC tokens!`);
      await refetch();
      setTimeout(() => {
        void refetch();
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to recycle ships");
      }
    }
  };

  return {
    constructShip,
    constructAllShips,
    recycleShips,
    isPending,
    error,
  };
}
