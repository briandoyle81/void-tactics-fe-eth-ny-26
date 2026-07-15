"use client";

import React from "react";

const LOBBY_STATUS_OPEN = 0;
const LOBBY_STATUS_FLEET_SELECTION = 1;
const LOBBY_STATUS_IN_GAME = 2;

interface LobbyCardActionsProps {
  status: number;
  isCreatorMe: boolean;
  isJoinerMe: boolean;
  hasJoiner: boolean;
  hasReservedJoiner: boolean;
  isReservedForMe: boolean;
  reservedLabel: string;
  hasActiveLobby: boolean;
  myFleetId: number;
  opponentFleetId: number;
  onGoToGames: () => void;
  onSelectFleet: () => void;
  joinButton: React.ReactNode;
  acceptButton: React.ReactNode;
  rejectButton: React.ReactNode;
  leaveButton: React.ReactNode;
  creatorExtraControls?: React.ReactNode;
  joinerExtraControls?: React.ReactNode;
}

// Shared lobby-card action block for `Lobbies.tsx` (web3) and
// `LobbiesWeb2.tsx` (web2) — identical status/role gating, differing only in
// which button implementation actually performs the join/accept/reject/leave
// action (on-chain TransactionButton-wrapped vs plain REST onClick), which
// callers supply as render-prop slots.
export const LobbyCardActions: React.FC<LobbyCardActionsProps> = ({
  status,
  isCreatorMe,
  isJoinerMe,
  hasJoiner,
  hasReservedJoiner,
  isReservedForMe,
  reservedLabel,
  hasActiveLobby,
  myFleetId,
  opponentFleetId,
  onGoToGames,
  onSelectFleet,
  joinButton,
  acceptButton,
  rejectButton,
  leaveButton,
  creatorExtraControls,
  joinerExtraControls,
}) => {
  const isInGame = status === LOBBY_STATUS_IN_GAME;

  return (
    <>
      {status === LOBBY_STATUS_OPEN &&
        !isCreatorMe &&
        !isJoinerMe && (
          <div className="space-y-2">
            {hasReservedJoiner ? (
              isReservedForMe ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber text-center font-mono">
                    [GAME RESERVED FOR YOU]
                  </p>
                  <div className="flex gap-2">
                    {acceptButton}
                    {rejectButton}
                  </div>
                  {hasActiveLobby && (
                    <p className="text-xs text-amber text-center">
                      You already have an active lobby. Complete it before accepting
                      another.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-amber font-mono mb-2">
                    [RESERVED] This game is reserved for another player
                  </p>
                  <p className="text-xs text-text-muted">Reserved for: {reservedLabel}</p>
                </div>
              )
            ) : (
              <>
                {joinButton}
                {hasActiveLobby && (
                  <p className="text-xs text-amber text-center">
                    You already have an active lobby. Complete it before joining
                    another.
                  </p>
                )}
              </>
            )}
          </div>
        )}

      {(isCreatorMe || isJoinerMe) && (
        <div className="flex flex-col gap-2">
          {myFleetId > 0 && opponentFleetId > 0 && (
            <button
              type="button"
              onClick={onGoToGames}
              className="w-full px-4 py-2.5 border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
              style={{ borderRadius: 0 }}
            >
              GO TO GAMES
            </button>
          )}
          {myFleetId === 0 && hasJoiner && (
            <button
              onClick={onSelectFleet}
              className="w-full px-4 py-2.5 border border-amber text-amber hover:bg-amber/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
              style={{ borderRadius: 0 }}
            >
              SELECT FLEET
            </button>
          )}
          {myFleetId > 0 && opponentFleetId === 0 && (
            <button
              type="button"
              onClick={onSelectFleet}
              className="w-full px-4 py-2.5 border border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm tracking-wider transition-all duration-200"
              style={{ borderRadius: 0 }}
            >
              VIEW FLEET SELECTION
            </button>
          )}
          {!isInGame && leaveButton}
          {isCreatorMe && creatorExtraControls}
          {isJoinerMe && joinerExtraControls}
        </div>
      )}

      {status === LOBBY_STATUS_FLEET_SELECTION &&
        hasJoiner &&
        (myFleetId === 0 || opponentFleetId === 0) && (
          <div className="space-y-2">
            <p className="text-sm text-amber">
              Fleet selection phase - waiting for both players to select fleets
            </p>
          </div>
        )}

      {isInGame && <div className="text-sm text-warning-red">Game in progress</div>}
    </>
  );
};
