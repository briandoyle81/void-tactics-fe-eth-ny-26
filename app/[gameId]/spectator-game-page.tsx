"use client";

import { useEffect } from "react";
import Header from "../components/Header";
import AlphaDiscordNoticeBar from "../components/AlphaDiscordNoticeBar";
import SiteFooter from "../components/SiteFooter";
import GameDisplay from "../components/GameDisplay";
import { useGetGame } from "../hooks/useGameContract";
import { GameDataView } from "../types/types";
import { useRouter } from "next/navigation";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "../config/networks";

interface SpectatorGamePageProps {
  gameId: number | null;
  requestedPathId: string;
}

export default function SpectatorGamePage({
  gameId,
  requestedPathId,
}: SpectatorGamePageProps) {
  const router = useRouter();
  const {
    data: gameData,
    isLoading,
    error,
  } = useGetGame(gameId ?? 0);

  useEffect(() => {
    const onChainChanged = () => {
      router.push("/");
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    return () => {
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, onChainChanged);
    };
  }, [router]);

  const game = gameData as GameDataView | undefined;
  const hasValidId = gameId !== null;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "var(--color-near-black)" }}
    >
      <div className="shrink-0">
        <AlphaDiscordNoticeBar />
      </div>
      <div className="shrink-0">
        <Header />
      </div>
      <main className="flex min-h-0 flex-1 flex-col gap-8 px-0 pb-20 pt-4 w-full">
        <div className="w-full px-2 sm:px-4">
          <div
            className="border border-solid p-4"
            style={{
              backgroundColor: "var(--color-slate)",
              borderColor: "var(--color-gunmetal)",
              borderTopColor: "var(--color-steel)",
              borderLeftColor: "var(--color-steel)",
            }}
          >
            {!hasValidId ? (
              <div className="space-y-4">
                <div className="text-sm" style={{ color: "var(--color-warning-red)" }}>
                  Invalid game URL: {requestedPathId || "(empty)"}.
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  [BACK TO APP]
                </button>
              </div>
            ) : isLoading ? (
              <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Loading game {gameId}...
              </div>
            ) : error || !game ? (
              <div className="space-y-4">
                <div className="text-sm" style={{ color: "var(--color-warning-red)" }}>
                  Unable to load game {gameId}.
                </div>
                <button
                  onClick={() => router.push("/")}
                  className="px-4 py-2 border-2 border-solid uppercase font-semibold tracking-wider transition-colors duration-150"
                  style={{
                    fontFamily:
                      "var(--font-rajdhani), 'Arial Black', sans-serif",
                    borderColor: "var(--color-cyan)",
                    color: "var(--color-cyan)",
                    backgroundColor: "var(--color-steel)",
                    borderRadius: 0,
                  }}
                >
                  [BACK TO APP]
                </button>
              </div>
            ) : (
              <GameDisplay
                game={game}
                onBack={() => router.push("/")}
                readOnly={true}
              />
            )}
          </div>
        </div>
      </main>
      <div className="shrink-0">
        <SiteFooter />
      </div>
    </div>
  );
}

