"use client";

import React, { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import type { Abi } from "viem";
import { toast } from "react-hot-toast";
import { TransactionButton } from "./TransactionButton";
import lotteryHookDeploy from "../contracts/base-sepolia/uniswap-lottery-hook.json";
import { useUtcLotteryHook } from "../hooks/useUtcLotteryHook";
import { useUtcSellSwap, useUtcSellQuote } from "../hooks/useUtcSellSwap";
import {
  PERMIT2_ABI,
  PERMIT2_ADDRESS,
  UNIVERSAL_ROUTER_ABI,
  UNIVERSAL_ROUTER_ADDRESS,
  encodeUtcSellSwap,
} from "../config/uniswapV4";
import { CONTRACT_ABIS } from "../config/contracts";

const LOTTERY_HOOK_ABI = lotteryHookDeploy.abi as Abi;
const UTC_ABI = CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi;

const MAX_UINT160 = (1n << 160n) - 1n;
const MAX_UINT256 = (1n << 256n) - 1n;
const PERMIT2_APPROVAL_WINDOW_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SLIPPAGE_BPS = 200n; // 2%

interface UtcLotteryPanelProps {
  onClose: () => void;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * UTCLotteryHook status/results panel (docs/update/Frontend_Updates_2026-09-17.md §4).
 * Entries come from selling UTC on the hooked Uniswap v4 pool directly, not
 * from this app — the sell flow below goes directly through Universal Router + Permit2 (never
 * Uniswap's own hosted swap UI or any other third-party interface, which has no way to pass this
 * hook's custom hookData convention and would silently earn zero entries — see
 * docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §4.3). A resolved
 * draw does not always have a winner (DrawResolvedNoWinner) — that state is shown explicitly,
 * never inferred from an absent balance change.
 */
export function UtcLotteryPanel({ onClose }: UtcLotteryPanelProps) {
  const { address } = useAccount();
  const {
    isDeployed,
    lotteryHookAddress,
    maxWeightPerEntryWei,
    maxWinProbabilityDenominator,
    minTotalWeightWei,
    currentDrawId,
    totalWeightInDraw,
    yourWeightInDraw,
    hasParticipated,
    isDrawResolved,
    recentSells,
    recentDrawResults,
    refetchDrawState,
  } = useUtcLotteryHook();

  const {
    isSupported: isSwapSupported,
    utcAddress,
    utcBalance,
    erc20AllowanceToPermit2,
    permit2AmountWei,
    permit2Expiration,
    refetchAll: refetchSellSwapState,
  } = useUtcSellSwap();

  const [sellAmount, setSellAmount] = useState("");
  const amountInWei = useMemo(() => {
    if (!sellAmount.trim()) return undefined;
    try {
      return parseEther(sellAmount);
    } catch {
      return undefined;
    }
  }, [sellAmount]);

  const { amountOutWei: quotedAmountOutWei, isLoading: isQuoting } = useUtcSellQuote(amountInWei);
  const amountOutMinimumWei =
    quotedAmountOutWei != null ? (quotedAmountOutWei * (10_000n - SLIPPAGE_BPS)) / 10_000n : undefined;

  const insufficientBalance =
    amountInWei != null && utcBalance != null && amountInWei > utcBalance;
  const needsErc20Approval =
    amountInWei != null && (erc20AllowanceToPermit2 == null || erc20AllowanceToPermit2 < amountInWei);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const needsPermit2Approval =
    !needsErc20Approval &&
    amountInWei != null &&
    (permit2AmountWei < amountInWei || permit2Expiration <= nowSeconds);
  const readyToSwap =
    !needsErc20Approval && !needsPermit2Approval && amountInWei != null && amountOutMinimumWei != null;

  const swapEncoding = useMemo(() => {
    if (!readyToSwap || !address || amountInWei == null || amountOutMinimumWei == null) return null;
    return encodeUtcSellSwap({ trader: address, amountInWei, amountOutMinimumWei });
  }, [readyToSwap, address, amountInWei, amountOutMinimumWei]);

  const swapDeadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

  const meetsWeightFloor =
    minTotalWeightWei != null && totalWeightInDraw != null
      ? totalWeightInDraw >= minTotalWeightWei
      : undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className="bg-near-black border-2 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto rounded-none"
        style={{ borderColor: "var(--color-amber)" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-amber font-mono tracking-wider">
            [UTC LOTTERY]
          </h2>
          <button
            onClick={onClose}
            className="text-amber hover:text-amber/80 transition-all duration-200 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-5 p-4 bg-amber/10 border border-amber/40 rounded-none">
          <p className="text-amber/85 text-xs font-mono leading-relaxed">
            Selling UTC on the hooked pool earns entry-weight into the current
            draw, capped per address. A draw can resolve with no winner if
            real participation is thin — that&apos;s expected, not a bug.
          </p>
        </div>

        {!isDeployed ? (
          <p className="text-center text-warning-red font-mono py-6">
            UTC Lottery Hook is not deployed on this network.
          </p>
        ) : !address ? (
          <p className="text-center text-text-muted font-mono py-6">
            Connect your wallet to view lottery status.
          </p>
        ) : (
          <>
            <div className="mb-5 p-4 border border-amber/25">
              <div className="flex justify-between text-xs font-mono uppercase tracking-wide text-text-secondary mb-1">
                <span>Current draw</span>
                <span>Status</span>
              </div>
              <div className="flex justify-between text-lg font-mono font-bold text-amber">
                <span>{currentDrawId != null ? `#${currentDrawId.toString()}` : "…"}</span>
                <span>
                  {isDrawResolved == null
                    ? "…"
                    : isDrawResolved
                      ? "Resolved"
                      : "Open"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] mb-5">
              <div className="border border-solid border-amber/30 bg-black/20 px-2 py-1.5">
                <div className="opacity-75 text-[10px] uppercase tracking-wide text-amber">
                  Your weight {hasParticipated ? "(entered)" : ""}
                </div>
                <div className="font-bold text-amber font-mono">
                  {yourWeightInDraw != null ? formatEther(yourWeightInDraw) : "0"}
                </div>
              </div>
              <div className="border border-solid border-amber/30 bg-black/20 px-2 py-1.5">
                <div className="opacity-75 text-[10px] uppercase tracking-wide text-amber">
                  Total weight
                </div>
                <div className="font-bold text-amber font-mono">
                  {totalWeightInDraw != null ? formatEther(totalWeightInDraw) : "0"}
                </div>
              </div>
              <div className="border border-solid border-amber/30 bg-black/20 px-2 py-1.5">
                <div className="opacity-75 text-[10px] uppercase tracking-wide text-amber">
                  Cap / entry
                </div>
                <div className="font-bold text-amber font-mono">
                  {maxWeightPerEntryWei != null ? formatEther(maxWeightPerEntryWei) : "…"} ETH
                </div>
              </div>
              <div className="border border-solid border-amber/30 bg-black/20 px-2 py-1.5">
                <div className="opacity-75 text-[10px] uppercase tracking-wide text-amber">
                  Best odds
                </div>
                <div className="font-bold text-amber font-mono">
                  {maxWinProbabilityDenominator != null
                    ? `1 in ${maxWinProbabilityDenominator.toString()}`
                    : "…"}
                </div>
              </div>
            </div>

            {meetsWeightFloor === false && minTotalWeightWei != null && (
              <p className="text-xs text-text-muted mb-4">
                Needs {formatEther(minTotalWeightWei)} total weight before this draw can resolve
                (currently {totalWeightInDraw != null ? formatEther(totalWeightInDraw) : "0"}).
              </p>
            )}

            <div className="mb-5 p-4 border border-amber/25">
              <h3 className="text-xs uppercase tracking-widest text-amber/70 mb-2">Sell UTC</h3>
              {!isSwapSupported ? (
                <p className="text-xs text-text-muted">Not available on this network.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 px-3 py-2 bg-near-black border text-amber font-mono focus:outline-none focus:ring-2 focus:ring-amber"
                      style={{ borderRadius: 0, borderColor: "var(--color-amber)" }}
                    />
                    <span className="text-xs text-text-muted font-mono">UTC</span>
                  </div>
                  <div className="text-[11px] text-text-muted font-mono mb-3">
                    Balance: {utcBalance != null ? formatEther(utcBalance) : "0"} UTC
                    {amountInWei != null && (
                      <>
                        {" · "}
                        {isQuoting
                          ? "quoting…"
                          : quotedAmountOutWei != null
                            ? `~${formatEther(quotedAmountOutWei)} ETH (2% slippage)`
                            : "no quote"}
                      </>
                    )}
                  </div>

                  {needsErc20Approval ? (
                    <TransactionButton
                      transactionId={`approve-utc-permit2-${address}`}
                      contractAddress={utcAddress}
                      abi={UTC_ABI}
                      functionName="approve"
                      args={[PERMIT2_ADDRESS, MAX_UINT256]}
                      className="w-full px-4 py-3 rounded-none border-2 border-amber text-amber hover:bg-amber/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!amountInWei || insufficientBalance}
                      loadingText="[APPROVING...]"
                      errorText="[ERROR APPROVING]"
                      onSuccess={() => {
                        refetchSellSwapState();
                        toast.success("UTC approved for Permit2");
                      }}
                      onError={(error) => {
                        console.error("Failed to approve UTC:", error);
                        toast.error("Failed to approve UTC");
                      }}
                      validateBeforeTransaction={() => {
                        if (!amountInWei) return "Enter an amount";
                        if (insufficientBalance) return "Insufficient UTC balance";
                        return true;
                      }}
                    >
                      [APPROVE UTC]
                    </TransactionButton>
                  ) : needsPermit2Approval ? (
                    <TransactionButton
                      transactionId={`approve-permit2-router-${address}`}
                      contractAddress={PERMIT2_ADDRESS}
                      abi={PERMIT2_ABI}
                      functionName="approve"
                      args={[
                        utcAddress,
                        UNIVERSAL_ROUTER_ADDRESS,
                        MAX_UINT160,
                        BigInt(Math.floor(Date.now() / 1000) + PERMIT2_APPROVAL_WINDOW_SECONDS),
                      ]}
                      className="w-full px-4 py-3 rounded-none border-2 border-amber text-amber hover:bg-amber/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      loadingText="[APPROVING...]"
                      errorText="[ERROR APPROVING]"
                      onSuccess={() => {
                        refetchSellSwapState();
                        toast.success("Router approved");
                      }}
                      onError={(error) => {
                        console.error("Failed to approve router:", error);
                        toast.error("Failed to approve router");
                      }}
                    >
                      [APPROVE ROUTER]
                    </TransactionButton>
                  ) : (
                    <TransactionButton
                      transactionId={`sell-utc-${address}-${sellAmount}`}
                      contractAddress={UNIVERSAL_ROUTER_ADDRESS}
                      abi={UNIVERSAL_ROUTER_ABI}
                      functionName="execute"
                      args={
                        swapEncoding
                          ? [swapEncoding.commands, swapEncoding.inputs, swapDeadline]
                          : []
                      }
                      className="w-full px-4 py-3 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!readyToSwap || insufficientBalance}
                      loadingText="[SELLING...]"
                      errorText="[ERROR SELLING]"
                      onSuccess={() => {
                        setSellAmount("");
                        refetchSellSwapState();
                        refetchDrawState();
                        toast.success("UTC sold — check recent sells below for your entry.");
                      }}
                      onError={(error) => {
                        console.error("Failed to sell UTC:", error);
                        toast.error(error instanceof Error ? error.message : "Failed to sell UTC");
                      }}
                      validateBeforeTransaction={() => {
                        if (!readyToSwap) return "Enter an amount";
                        if (insufficientBalance) return "Insufficient UTC balance";
                        return true;
                      }}
                    >
                      [SELL UTC]
                    </TransactionButton>
                  )}
                </>
              )}
            </div>

            {isDrawResolved === false && currentDrawId != null && (
              <TransactionButton
                transactionId={`resolve-utc-lottery-draw-${currentDrawId}-${address}`}
                contractAddress={lotteryHookAddress}
                abi={LOTTERY_HOOK_ABI}
                functionName="resolveDraw"
                args={[currentDrawId]}
                className="w-full px-4 py-3 rounded-none border-2 border-amber text-amber hover:bg-amber/10 font-mono tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                loadingText="[RESOLVING...]"
                errorText="[ERROR RESOLVING]"
                onSuccess={() => {
                  refetchDrawState();
                  toast.success("Draw resolved!");
                }}
                onError={(error) => {
                  console.error("Failed to resolve draw:", error);
                  toast.error(
                    error instanceof Error ? error.message : "Failed to resolve draw",
                  );
                }}
              >
                [RESOLVE DRAW #{currentDrawId.toString()}]
              </TransactionButton>
            )}

            {recentSells.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs uppercase tracking-widest text-amber/70 mb-2">
                  Your recent sells
                </h3>
                <div className="space-y-1">
                  {recentSells.map((sell, i) => (
                    <div
                      key={`${sell.drawId}-${sell.blockNumber}-${i}`}
                      className="flex justify-between text-[11px] font-mono text-text-secondary border border-gunmetal/50 px-2 py-1"
                    >
                      <span>Draw #{sell.drawId.toString()}</span>
                      <span>Sold {formatEther(sell.ethProceeds)} ETH</span>
                      <span>+{formatEther(sell.playerWeightInDraw)} weight</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentDrawResults.length > 0 && (
              <div className="mt-5">
                <h3 className="text-xs uppercase tracking-widest text-amber/70 mb-2">
                  Recent draws
                </h3>
                <div className="space-y-1">
                  {recentDrawResults.map((result, i) => (
                    <div
                      key={`${result.drawId}-${result.blockNumber}-${i}`}
                      className="flex justify-between text-[11px] font-mono text-text-secondary border border-gunmetal/50 px-2 py-1"
                    >
                      <span>Draw #{result.drawId.toString()}</span>
                      <span>
                        {result.noWinner
                          ? "No winner"
                          : result.winner
                            ? `Winner: ${shortAddr(result.winner)}`
                            : "Resolved"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
