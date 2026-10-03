import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextResponse } from "next/server";
import { WEB2_ADMIN_EMAILS } from "../config/alpha";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session({ session, token }: any) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
};

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id as string, error: null };
}

/** Web2-mode counterpart to a wallet-address admin check (see MAP_ADMIN_ADDRESS
 * / contract-owner reads) — gates admin API routes on the signed-in Google
 * account's email being in WEB2_ADMIN_EMAILS. */
export async function requireWeb2Admin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email || !WEB2_ADMIN_EMAILS.includes(email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { error: null };
}
