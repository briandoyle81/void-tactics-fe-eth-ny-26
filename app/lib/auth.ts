import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextResponse } from "next/server";

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
