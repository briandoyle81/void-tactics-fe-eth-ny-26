"use client";

import { useAccount, useReadContract, useSimulateContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import {
  PERMIT2_ABI,
  PERMIT2_ADDRESS,
  UNIVERSAL_ROUTER_ADDRESS,
  UTC_ETH_POOL_KEY,
  V4_QUOTER_ABI,
  V4_QUOTER_ADDRESS,
} from "../config/uniswapV4";
import { useSelectedChainId } from "./useSelectedChainId";

const UTC_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .UNIVERSAL_CREDITS as `0x${string}`;
const UTC_ABI = CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi;

/**
 * Read-side state for selling UTC through Universal Router + Permit2 (see
 * docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §4 and Part 2 item
 * 10 of the plan). The actual swap submission happens via TransactionButton in
 * UtcLotteryPanel.tsx (three possible steps: ERC20 approve to Permit2, Permit2 approve to
 * Universal Router, then the swap itself) — this hook only exposes the live reads needed to
 * decide which step to show.
 */
export function useUtcSellSwap() {
  const activeChainId = useSelectedChainId();
  const { address } = useAccount();
  const isSupported = activeChainId === baseSepolia.id;

  const {
    data: utcBalance,
    refetch: refetchUtcBalance,
  } = useReadContract({
    address: UTC_ADDRESS,
    abi: UTC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isSupported && !!address },
  });

  const {
    data: erc20AllowanceToPermit2,
    refetch: refetchErc20Allowance,
  } = useReadContract({
    address: UTC_ADDRESS,
    abi: UTC_ABI,
    functionName: "allowance",
    args: address ? [address, PERMIT2_ADDRESS] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isSupported && !!address },
  });

  const {
    data: permit2Allowance,
    refetch: refetchPermit2Allowance,
  } = useReadContract({
    address: PERMIT2_ADDRESS,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: address ? [address, UTC_ADDRESS, UNIVERSAL_ROUTER_ADDRESS] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isSupported && !!address },
  });

  const [permit2AmountWei, permit2Expiration] = (permit2Allowance as
    | readonly [bigint, number, number]
    | undefined) ?? [0n, 0, 0];

  const refetchAll = () => {
    void refetchUtcBalance();
    void refetchErc20Allowance();
    void refetchPermit2Allowance();
  };

  return {
    isSupported,
    utcAddress: UTC_ADDRESS,
    utcBalance: utcBalance as bigint | undefined,
    erc20AllowanceToPermit2: erc20AllowanceToPermit2 as bigint | undefined,
    permit2AmountWei,
    permit2Expiration,
    refetchAll,
  };
}

/**
 * Live quote for selling `amountInWei` UTC, via V4Quoter.quoteExactInputSingle — a non-view
 * function called through simulateContract (the standard Uniswap quoter pattern: it reverts with
 * the quote encoded in the revert data, never actually swaps). Used only to derive a UI-displayed
 * expected output and a slippage-protected `amountOutMinimum` for the real swap — never send this
 * call as a real transaction.
 */
export function useUtcSellQuote(amountInWei: bigint | undefined) {
  const activeChainId = useSelectedChainId();
  const isSupported = activeChainId === baseSepolia.id;
  const hasAmount = amountInWei != null && amountInWei > 0n;

  const { data, isLoading, error } = useSimulateContract({
    address: V4_QUOTER_ADDRESS,
    abi: V4_QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: hasAmount
      ? [
          {
            poolKey: UTC_ETH_POOL_KEY,
            zeroForOne: false,
            exactAmount: amountInWei,
            hookData: "0x",
          },
        ]
      : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isSupported && hasAmount },
  });

  const [amountOutWei] = (data?.result as readonly [bigint, bigint] | undefined) ?? [undefined];

  return { amountOutWei, isLoading, error };
}
