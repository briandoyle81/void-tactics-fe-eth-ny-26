import NextAuth from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const handler = NextAuth({
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
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
  },
});

export { handler as GET, handler as POST };
