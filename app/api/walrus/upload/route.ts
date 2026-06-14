import { NextRequest, NextResponse } from "next/server";
import { uploadToWalrus, EPOCHS_LIVE, EPOCHS_ARCHIVE } from "@/app/utils/walrus";

export async function POST(req: NextRequest) {
  try {
    const { data, epochs } = (await req.json()) as {
      data: unknown;
      epochs?: number;
    };
    if (data === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const epochCount =
      epochs === EPOCHS_ARCHIVE ? EPOCHS_ARCHIVE : EPOCHS_LIVE;
    const result = await uploadToWalrus(data, epochCount);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[walrus/upload]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
