"use client";

import { signIn, signOut } from "next-auth/react";
import { useCurrentUser } from "@/app/hooks/useCurrentUser";

export function AuthButton() {
  const { isLoggedIn, isLoading, username, image } = useCurrentUser();

  if (isLoading) return null;

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        {image && (
          <img src={image} alt={username ?? "User"} className="w-8 h-8 rounded-full" />
        )}
        <span className="text-sm text-gray-300">{username}</span>
        <button
          onClick={() => signOut()}
          className="text-sm px-3 py-1 rounded border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-2 px-4 py-2 rounded bg-white text-gray-900 font-medium text-sm hover:bg-gray-100 transition-colors"
    >
      <GoogleIcon />
      Sign in with Google
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 0 1-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 0 1-7.15-2.52H.96v2.07A8 8 0 0 0 8 16z" fill="#34A853"/>
      <path d="M3.57 9.54A4.8 4.8 0 0 1 3.32 8c0-.53.09-1.05.25-1.54V4.39H.96A8 8 0 0 0 0 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05"/>
      <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 0 0 .96 4.39L3.57 6.46A4.77 4.77 0 0 1 8 3.18z" fill="#EA4335"/>
    </svg>
  );
}
