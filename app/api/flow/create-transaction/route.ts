import { type NextRequest, NextResponse } from "next/server";
import { FLOW_USD_TIERS } from "@/app/config/flowPayment";
import { pendingPurchases } from "../_store";

const ENV_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!;
const CHECKOUT_ID = process.env.NEXT_PUBLIC_FLOW_CHECKOUT_ID!;

export async function POST(req: NextRequest) {
  const { tier, buyerAddress, gameChainId } = (await req.json()) as {
    tier: number;
    buyerAddress: string;
    gameChainId: number;
  };

  const flowTier = FLOW_USD_TIERS[tier];
  if (!flowTier) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!buyerAddress || !gameChainId) {
    return NextResponse.json(
      { error: "Missing buyerAddress or gameChainId" },
      { status: 400 },
    );
  }

  const res = await fetch(
    `https://app.dynamicauth.com/api/v0/sdk/${ENV_ID}/checkouts/${CHECKOUT_ID}/transactions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: flowTier.actualAmount,
        currency: "USD",
        memo: { tier, buyerAddress, gameChainId },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const { sessionToken, transaction } = (await res.json()) as {
    sessionToken: string;
    transaction: { id: string };
  };

  pendingPurchases.set(transaction.id, {
    buyerAddress,
    tier,
    gameChainId,
    fulfilled: false,
  });

  return NextResponse.json({ transactionId: transaction.id, sessionToken });
}
