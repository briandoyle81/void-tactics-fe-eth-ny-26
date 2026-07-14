"use client";

import type { ReactNode } from "react";
import { VOID_TACTICS_ALPHA_DISCORD_INVITE, MIN_SHIPS_FOR_LOBBIES } from "../utils/lobbyFormatters";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the
// "[CREATE AND JOIN NEW GAMES]" header, ship-ownership/construction gating
// states, PLAYER STATUS panel, alpha Discord notice, and create-form
// toggle, ported verbatim from Lobbies.tsx (the canonical layout). The
// actual create-lobby form is a render-prop (`createForm`) since its
// fields/validation genuinely differ (on-chain map/threat picker + reserved-
// joiner-by-address + native-token fee vs web2's simpler REST equivalent
// with reserved-joiner-by-email + UTC fee).
export interface LobbyCreateSectionProps {
  isSignedIn: boolean;

  shipsLoading: boolean;
  needsShips: boolean;
  needsConstruct: boolean;
  constructedReadyCount: number;
  onNavigateToManageNavy: () => void;

  activeLobbiesCount: number;
  kickCount: number;
  hasActiveLobby: boolean;
  freeGames: number;

  canCreateLobby: boolean;
  disabledLabel?: string | null;
  showCreateForm: boolean;
  onToggleCreateForm: () => void;
  createButtonHint?: ReactNode;

  createFormElement: ReactNode;
}

export function LobbyCreateSection({
  isSignedIn,
  shipsLoading,
  needsShips,
  needsConstruct,
  constructedReadyCount,
  onNavigateToManageNavy,
  activeLobbiesCount,
  kickCount,
  hasActiveLobby,
  freeGames,
  canCreateLobby,
  disabledLabel,
  showCreateForm,
  onToggleCreateForm,
  createButtonHint,
  createFormElement,
}: LobbyCreateSectionProps) {
  return (
    <>
      <h3 className="mb-5 text-center text-xl font-bold tracking-wider sm:mb-6 sm:text-2xl">
        [CREATE AND JOIN NEW GAMES]
      </h3>

      {shipsLoading && (
        <div
          className="mb-8 flex flex-col items-center justify-center border border-cyan/50 bg-black/50 px-6 py-16 text-center"
          style={{ borderRadius: 0 }}
        >
          <p className="text-sm font-bold uppercase tracking-wider text-cyan/90">
            ACQUIRING DATA...
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Checking ship ownership
          </p>
        </div>
      )}

      {needsShips && (
        <div
          className="mb-8 border-2 border-cyan/35 bg-black/55 px-4 py-10 text-center sm:px-12 sm:py-12"
          style={{ borderRadius: 0 }}
        >
          <p
            className="text-xl font-black uppercase tracking-wide text-cyan sm:text-2xl"
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            You must own at least {MIN_SHIPS_FOR_LOBBIES} ships to join a game
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
            Open Manage Navy to claim ships and grow your navy. You need at least{" "}
            {MIN_SHIPS_FOR_LOBBIES} hulls, all constructed and ready, before lobbies
            appear here.
          </p>
          <button
            type="button"
            onClick={onNavigateToManageNavy}
            className="mt-8 border-2 border-amber bg-amber/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-amber transition-colors hover:bg-amber/15"
            style={{ borderRadius: 0 }}
          >
            Click here to claim free ships
          </button>
        </div>
      )}

      {needsConstruct && (
        <div
          className="mb-8 border-2 border-amber/35 bg-black/55 px-4 py-10 text-center sm:px-12 sm:py-12"
          style={{ borderRadius: 0 }}
        >
          <p
            className="text-xl font-black uppercase tracking-wide text-amber sm:text-2xl"
            style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
          >
            You must construct at least {MIN_SHIPS_FOR_LOBBIES} ships before you can
            join a game.
          </p>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-text-muted">
            You have at least {MIN_SHIPS_FOR_LOBBIES} hulls, but only{" "}
            {constructedReadyCount} constructed and ready. Open Manage Navy and finish
            construction until you have {MIN_SHIPS_FOR_LOBBIES} active ships.
          </p>
          <button
            type="button"
            onClick={onNavigateToManageNavy}
            className="mt-8 border-2 border-cyan bg-cyan/5 px-6 py-3 text-sm font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/15"
            style={{ borderRadius: 0 }}
          >
            Open Manage Navy
          </button>
        </div>
      )}

      {!shipsLoading && !needsShips && !needsConstruct && (
        <>
          {/* Player Status + create lobby */}
          {isSignedIn && (
            <div
              className="mb-6 border border-cyan bg-black/40 p-4"
              style={{ borderRadius: 0 }}
            >
              <h4 className="mb-3 text-lg font-bold text-cyan">PLAYER STATUS</h4>
              <div className="grid grid-cols-2 gap-3 text-sm sm:gap-4">
                <div>
                  <span className="text-text-muted">Active Lobbies:</span>
                  <span className="ml-2">{activeLobbiesCount}</span>
                </div>
                <div>
                  <span className="text-text-muted">Kick Count:</span>
                  <span className="ml-2">{kickCount}</span>
                </div>
                <div>
                  <span className="text-text-muted">Has Active Lobby:</span>
                  <span
                    className={`ml-2 ${hasActiveLobby ? "text-phosphor-green" : "text-warning-red"}`}
                  >
                    {hasActiveLobby ? "YES" : "NO"}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Free Games:</span>
                  <span className="ml-2">{freeGames}</span>
                </div>
                {!showCreateForm && (
                  <div className="col-span-2 flex flex-col justify-center gap-2">
                    <button
                      type="button"
                      onClick={onToggleCreateForm}
                      disabled={!canCreateLobby}
                      className="w-full border-2 border-cyan px-4 py-3 font-mono font-bold tracking-wider text-cyan transition-all duration-200 hover:border-cyan hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderRadius: 0 }}
                    >
                      {disabledLabel ?? "CREATE LOBBY"}
                    </button>
                    {createButtonHint}
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="mb-6 border border-amber/80 bg-black/40 p-4"
            style={{ borderRadius: 0 }}
          >
            <p
              className="text-sm leading-relaxed text-amber/90"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              During alpha testing, we recommend coordinating games on Discord before
              creating a lobby.
            </p>
            <p
              className="mt-3 text-sm leading-relaxed text-amber/90"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
            >
              Click{" "}
              <a
                href={VOID_TACTICS_ALPHA_DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber underline decoration-amber/70 underline-offset-2 transition-colors hover:text-amber/80"
              >
                here
              </a>{" "}
              to request access.
            </p>
          </div>

          {showCreateForm && createFormElement}
        </>
      )}
    </>
  );
}
