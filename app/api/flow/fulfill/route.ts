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
import { pendingPurchases } from "../_store";

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const MINTER_KEY = process.env.SHIP_MINTER_PRIVATE_KEY as `0x${string}`;

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
  const { transactionId } = (await req.json()) as { transactionId: string };

  const intent = pendingPurchases.get(transactionId);
  if (!intent) {
    return NextResponse.json({ error: "Unknown transaction" }, { status: 404 });
  }
  if (intent.fulfilled) {
    return NextResponse.json({ error: "Already fulfilled" }, { status: 409 });
  }

  // Verify settlement with Fireblocks Flow
  const txRes = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}/transactions/${transactionId}`,
  );
  const tx = (await txRes.json()) as {
    settlementState: string;
    executionState: string;
  };

  if (tx.settlementState !== "completed") {
    return NextResponse.json(
      { error: `Settlement not complete: ${tx.settlementState}` },
      { status: 400 },
    );
  }

  // Mark fulfilled before minting to prevent double-mint
  intent.fulfilled = true;

  const { buyerAddress, tier, gameChainId } = intent;
  const chain = getViemChain(gameChainId);
  const contractAddresses = getContractAddresses(gameChainId);
  const variant = getVariantForChainId(gameChainId);
  const shipsAddress = contractAddresses.SHIPS as `0x${string}`;

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

  return NextResponse.json({ success: true, mintTxHash });
}
