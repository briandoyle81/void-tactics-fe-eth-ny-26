import { baseSepolia } from "viem/chains";
import { encodeAbiParameters, encodePacked, getAddress, type Address, type Hex } from "viem";
import lotteryHookDeploy from "../contracts/base-sepolia/uniswap-lottery-hook.json";

// Base Sepolia (84532) canonical Uniswap v4 infrastructure — cross-checked against
// developers.uniswap.org/docs/protocols/v4/deployments; PoolManager independently corroborated
// against docs/eth-global-remote/eth-global-remote-strategy-v2.md's own live eth_getCode check.
// Re-verify against the deployed bytecode before relying on this for anything beyond testnet.
export const POOL_MANAGER_ADDRESS: Address = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
export const UNIVERSAL_ROUTER_ADDRESS: Address = "0x492E6456D9528771018DeB9E87ef7750EF184104";
export const PERMIT2_ADDRESS: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const V4_QUOTER_ADDRESS: Address = "0x4A6513c898fe1B2d0E78d3b0e0A4a151589B1cBA";

export const UNISWAP_V4_CHAIN_ID = baseSepolia.id;

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

// The UTC/ETH pool the lottery hook is locked to — currency0 is native ETH (the zero address),
// currency1 is UniversalCredits. See app/contracts/base-sepolia/uniswap-lottery-hook.json.
export const UTC_ETH_POOL_KEY: PoolKey = lotteryHookDeploy.poolKey as PoolKey;
export const UTC_ETH_POOL_ID = lotteryHookDeploy.poolId as Hex;

const NATIVE_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const POOL_KEY_ABI_TUPLE = {
  name: "poolKey",
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
} as const;

// Universal Router — only the one function this app calls.
export const UNIVERSAL_ROUTER_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

// Permit2 (IAllowanceTransfer) — only approve/allowance, the non-signature flow.
export const PERMIT2_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
] as const;

// V4Quoter — only quoteExactInputSingle, called via simulateContract/useSimulateContract (it's a
// non-view function that reverts with the quote encoded in the revert data, the standard Uniswap
// quoter pattern — never send this as a real transaction).
export const V4_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          POOL_KEY_ABI_TUPLE,
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

// Universal Router command bytes (Commands.sol) — only what this app needs.
const COMMAND_V4_SWAP = 0x10;

// V4Router action bytes (Actions.sol) — only what a single-hop exact-input swap needs.
const ACTION_SWAP_EXACT_IN_SINGLE = 0x06;
const ACTION_SETTLE_ALL = 0x0c;
const ACTION_TAKE_ALL = 0x0f;

/**
 * Encodes a Universal Router `execute()` call for a single UTC -> ETH v4 sell, with the trader's
 * address passed as hookData so UTCLotteryHook can attribute a lottery entry (see
 * docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §4.2 — a swap that
 * omits or malforms this succeeds normally but silently earns zero entries).
 *
 * Verified byte-for-byte against Uniswap's own source (Commands.sol, Dispatcher.sol,
 * BaseActionsRouter.sol, V4Router.sol, IV4Router.sol) on 2026-09-18 — re-check against the actual
 * deployed Universal Router bytecode before trusting this for anything beyond a small test swap.
 */
export function encodeUtcSellSwap(params: {
  trader: Address;
  amountInWei: bigint;
  amountOutMinimumWei: bigint;
}): { commands: Hex; inputs: Hex[] } {
  const { trader, amountInWei, amountOutMinimumWei } = params;

  const hookData = encodeAbiParameters([{ type: "address" }], [getAddress(trader)]);

  // ExactInputSingleParams: (poolKey, zeroForOne, amountIn, amountOutMinimum, minHopPriceX36, hookData)
  // zeroForOne: false == currency1 (UTC) -> currency0 (native ETH) == a sell.
  const swapParams = encodeAbiParameters(
    [
      POOL_KEY_ABI_TUPLE,
      { type: "bool" },
      { type: "uint128" },
      { type: "uint128" },
      { type: "uint256" },
      { type: "bytes" },
    ],
    [
      UTC_ETH_POOL_KEY,
      false,
      amountInWei,
      amountOutMinimumWei,
      0n, // minHopPriceX36 unused — slippage protection comes from amountOutMinimum below
      hookData,
    ],
  );

  // SETTLE_ALL: (currency owed to the pool, max amount we'll pay) — we owe currency1 (UTC).
  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [UTC_ETH_POOL_KEY.currency1, amountInWei],
  );

  // TAKE_ALL: (currency owed to us, min amount we'll accept) — we're owed currency0 (native ETH).
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [NATIVE_ADDRESS, amountOutMinimumWei],
  );

  const actions = encodePacked(
    ["uint8", "uint8", "uint8"],
    [ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL],
  );

  const v4SwapInput = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [swapParams, settleParams, takeParams]],
  );

  const commands = encodePacked(["uint8"], [COMMAND_V4_SWAP]);

  return { commands, inputs: [v4SwapInput] };
}
