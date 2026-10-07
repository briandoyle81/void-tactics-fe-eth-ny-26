import { NextResponse, type NextRequest } from "next/server";
import { resolveHostRoute } from "./app/utils/hostRouting";

// Routes requests between the website and the game client by hostname (see
// app/utils/hostRouting.ts). Without NEXT_PUBLIC_PLAY_URL it only forwards
// old `/?chain=` links to /play.
export function proxy(request: NextRequest) {
  const decision = resolveHostRoute(
    request.headers.get("host") ?? request.nextUrl.host,
    request.nextUrl.pathname,
    request.nextUrl.search,
    {
      playUrl: process.env.NEXT_PUBLIC_PLAY_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://voidtactics.xyz",
    },
  );

  if (decision.type === "redirect") {
    return NextResponse.redirect(new URL(decision.url, request.url));
  }

  const response =
    decision.type === "rewrite"
      ? NextResponse.rewrite(new URL(`${decision.pathname}${request.nextUrl.search}`, request.url))
      : NextResponse.next();
  if (decision.noIndex) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  // Pages only: skip API routes, the PostHog proxy, Next internals and any
  // path with a file extension (public assets).
  matcher: ["/((?!api/|ingest/|_next/|.*\\..*).*)"],
};
