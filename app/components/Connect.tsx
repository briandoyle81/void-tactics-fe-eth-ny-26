import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import posthog from "posthog-js";

const Connect: React.FC = () => {
  const { data: session, status } = useSession();

  const handleSignIn = () => {
    posthog.capture("sign_in_clicked");
    void signIn("google");
  };

  const handleSignOut = () => {
    posthog.capture("sign_out_clicked");
    void signOut();
  };

  if (status === "loading") {
    return (
      <button
        disabled
        type="button"
        className="border-2 border-cyan/50 text-cyan/50 font-mono font-bold py-2 px-6 tracking-wider"
        style={{ borderRadius: 0 }}
      >
        ...
      </button>
    );
  }

  if (session?.user) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span className="font-mono text-sm text-text-muted hidden md:inline">
          {session.user.name ?? session.user.email}
        </span>
        <button
          onClick={handleSignOut}
          type="button"
          className="border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
          style={{ borderRadius: 0 }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      type="button"
      className="border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold py-2 px-6 tracking-wider transition-colors duration-150"
      style={{ borderRadius: 0 }}
    >
      Sign In
    </button>
  );
};

export default Connect;
