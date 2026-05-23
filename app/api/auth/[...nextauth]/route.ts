import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/app/lib/prisma";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.id || !user.email) return true;
      await prisma.user.upsert({
        where: { id: user.id },
        update: { email: user.email, username: user.name ?? undefined },
        create: {
          id: user.id,
          email: user.email,
          username: user.name ?? null,
          stats: { create: {} },
        },
      });
      return true;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
