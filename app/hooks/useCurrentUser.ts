"use client";

import { useSession } from "next-auth/react";

export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    userId: session?.user?.id ?? null,
    username: session?.user?.name ?? null,
    email: session?.user?.email ?? null,
    image: session?.user?.image ?? null,
    isLoggedIn: status === "authenticated",
    isLoading: status === "loading",
  };
}
