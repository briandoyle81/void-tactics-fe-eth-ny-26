import { type NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { flowTestnet, baseSepolia, saigon } from "viem/chains";
import { xaiTestnet } from "@/app/config/networks";
import { getContractAddresses } from "@/app/config/contracts";
import { getVariantForChainId } from "@/app/config/networks";
import { FLOW_USD_TIERS } from "@/app/config/flowPayment";
import { logAttempt, logMinted, logFailed } from "@/app/lib/mintLog";

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const rawKey = process.env.SHIP_MINTER_PRIVATE_KEY ?? "";
const MINTER_KEY = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

// Prevents double-minting within a server process lifetime.
const fulfilledTransactions = new Set<string>();

const CREATE_SHIPS_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
    ],
    name: "createShips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const TIER_SHIPS_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "tierShips",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

function getViemChain(chainId: number): Chain {
  switch (chainId) {
    case flowTestnet.id:
      return flowTestnet;
    case baseSepolia.id:
      return baseSepolia;
    case saigon.id:
      return saigon;
    case xaiTestnet.id:
      return xaiTestnet as Chain;
    default:
      return flowTestnet;
  }
}

export async function POST(req: NextRequest) {
  const { transactionId, tier, buyerAddress, gameChainId } =
    (await req.json()) as {
      transactionId: string;
      tier: number;
      buyerAddress: string;
      gameChainId: number;
    };

  if (!transactionId || !buyerAddress || typeof tier !== "number" || !gameChainId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const flowTier = FLOW_USD_TIERS[tier];
  if (!flowTier) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  if (fulfilledTransactions.has(transactionId)) {
    return NextResponse.json({ error: "Already fulfilled" }, { status: 409 });
  }

  // Verify settlement with Fireblocks Flow
  const txRes = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}/transactions/${transactionId}`,
  );
  const tx = (await txRes.json()) as {
    settlementState: string;
    executionState: string;
    amount: string;
  };

  // Verify the paid amount matches the claimed tier — prevents a client from
  // paying for tier 0 and submitting a fulfill request claiming tier 4.
  if (tx.amount !== flowTier.actualAmount) {
    return NextResponse.json(
      { error: "Transaction amount does not match tier" },
      { status: 400 },
    );
  }

  if (tx.settlementState !== "completed") {
    return NextResponse.json(
      { error: `Settlement not complete: ${tx.settlementState}` },
      { status: 400 },
    );
  }

  // Mark fulfilled before minting to prevent double-mint
  fulfilledTransactions.add(transactionId);
  logAttempt({ transactionId, tier, buyerAddress, gameChainId });
  const chain = getViemChain(gameChainId);
  const contractAddresses = getContractAddresses(gameChainId);
  const variant = getVariantForChainId(gameChainId);
  const shipsAddress = contractAddresses.SHIPS as `0x${string}`;

  try {
    const publicClient = createPublicClient({ chain, transport: http() });

    // Read ship count for this tier directly from contract
    const shipsCount = await publicClient.readContract({
      address: shipsAddress,
      abi: TIER_SHIPS_ABI,
      functionName: "tierShips",
      args: [BigInt(tier)],
    });

    const account = privateKeyToAccount(MINTER_KEY);
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    const mintTxHash = await walletClient.writeContract({
      address: shipsAddress,
      abi: CREATE_SHIPS_ABI,
      functionName: "createShips",
      args: [buyerAddress as `0x${string}`, BigInt(shipsCount), variant, tier],
    });

    await publicClient.waitForTransactionReceipt({ hash: mintTxHash });

    logMinted(transactionId, mintTxHash);
    return NextResponse.json({ success: true, mintTxHash });
  } catch (err) {
    // Unmark so a retry can attempt minting again
    fulfilledTransactions.delete(transactionId);
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fulfill] mint failed:", message);
    logFailed(transactionId, message);

    const outOfFunds =
      message.includes("gas required exceeds allowance (0)") ||
      message.includes("insufficient funds");
    if (outOfFunds) {
      return NextResponse.json(
        { error: "Minter wallet is out of funds — contact support to claim your ships." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: `Minting failed: ${message}` }, { status: 500 });
  }
}
