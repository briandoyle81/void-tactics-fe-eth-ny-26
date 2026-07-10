"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useLobbiesWeb2 } from "../hooks/useLobbiesWeb2";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { Web2Lobby, Web2LobbyStatus } from "../types/web2Lobby";
import {
  SKIRMISH_THREAT_LIMIT,
  BATTLE_THREAT_LIMIT,
  IMMEDIATE_GAME_TURN_SECONDS,
  CORRESPONDENCE_GAME_TURN_SECONDS,
  SHORT_MAX_SCORE,
  MEDIUM_MAX_SCORE,
  LONG_MAX_SCORE,
  MIN_SHIPS_FOR_LOBBIES,
} from "../utils/lobbyFormatters";
import {
  formatThreatShort,
  formatTurnShort,
  formatScoreShort,
} from "../utils/lobbyFormattersWeb2";

/** Same tab-navigation mechanism as `Lobbies.tsx`'s `navigateToGamesTab` — mode-agnostic, just switches the active tab. */
function navigateToGamesTab() {
  localStorage.setItem("void-tactics-active-tab", "Games");
  localStorage.setItem("void-tactics-force-games-tab", "true");
  window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
  document.dispatchEvent(new CustomEvent("void-tactics-navigate-to-games", { bubbles: true }));
}

// Web2-mode counterpart to `Lobbies.tsx`. First working slice for web2
// lobbies: browse/create/join/leave open lobbies, submit a fleet (ship
// multi-select only — no starting-position picker, the server assigns
// default positions), reject a reserved invite, and the creator/joiner
// timeout-penalty actions. Deliberately not feature-parity with the web3
// page. See docs/merge-explore-traditional-plan.md for what's still open —
// most notably, once a lobby's fleets are both submitted a Game row is
// created, but there is no web2 GameDisplay yet to actually play it.

const LobbiesWeb2: React.FC = () => {
  const { userId } = useCurrentUser();
  const {
    lobbyList,
    createLobby,
    joinLobby,
    leaveLobby,
    createFleet,
    rejectGame,
    timeoutJoiner,
    quitWithPenalty,
  } = useLobbiesWeb2();
  const { ships } = useOwnedShipsWeb2();

  const [costLimit, setCostLimit] = useState(SKIRMISH_THREAT_LIMIT);
  const [turnTimeSeconds, setTurnTimeSeconds] = useState(IMMEDIATE_GAME_TURN_SECONDS);
  const [maxScore, setMaxScore] = useState(SHORT_MAX_SCORE);
  const [busy, setBusy] = useState(false);
  const [selectedShipIds, setSelectedShipIds] = useState<Set<number>>(new Set());

  const constructedShipCount = ships.filter(
    (s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0,
  ).length;
  const canUseLobbies = constructedShipCount >= MIN_SHIPS_FOR_LOBBIES;

  const myLobby = useMemo(
    () =>
      lobbyList.lobbies.find(
        (l) => l.basic.creator === userId || l.players.joiner === userId,
      ),
    [lobbyList.lobbies, userId],
  );

  const openLobbies = useMemo(
    () =>
      lobbyList.lobbies.filter(
        (l) =>
          l.state.status === Web2LobbyStatus.Open &&
          l.basic.creator !== userId &&
          (!l.players.reservedJoiner || l.players.reservedJoiner === userId),
      ),
    [lobbyList.lobbies, userId],
  );

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = () =>
    run("create lobby", async () => {
      // Matches web3's Lobbies.tsx, which also has no real map picker (its
      // "Map" field is a locked input hardcoded to map 1) — this keeps both
      // modes on the same fixed map rather than leaving mapId unset (which
      // left games with no blocked/scoring tiles).
      await createLobby({ costLimit, turnTimeSeconds, maxScore, selectedMapId: 1 });
      toast.success("Lobby created");
    });

  const handleJoin = (lobbyId: number) =>
    run("join lobby", async () => {
      await joinLobby(lobbyId);
      toast.success("Joined lobby");
    });

  const handleLeave = (lobbyId: number) =>
    run("leave lobby", async () => {
      await leaveLobby(lobbyId);
      toast.success("Left lobby");
    });

  const handleReject = (lobbyId: number) =>
    run("reject invite", async () => {
      await rejectGame(lobbyId);
      toast.success("Invite declined");
    });

  const handleTimeoutJoiner = (lobbyId: number) =>
    run("timeout joiner", () => timeoutJoiner(lobbyId));

  const handleQuitWithPenalty = (lobbyId: number) =>
    run("quit with penalty", () => quitWithPenalty(lobbyId));

  const toggleShipSelect = (id: number) => {
    setSelectedShipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCost = ships
    .filter((s) => selectedShipIds.has(s.id))
    .reduce((sum, s) => sum + s.shipData.cost, 0);

  const handleSubmitFleet = (lobbyId: number) =>
    run("submit fleet", async () => {
      const result = await createFleet(lobbyId, Array.from(selectedShipIds));
      setSelectedShipIds(new Set());
      toast.success(
        result.gameId
          ? `Fleet submitted — game #${result.gameId} started`
          : "Fleet submitted — waiting on opponent",
      );
    });

  if (!canUseLobbies) {
    return (
      <div className="font-mono text-sm text-text-muted">
        You need at least {MIN_SHIPS_FOR_LOBBIES} constructed ships to use lobbies
        ({constructedShipCount}/{MIN_SHIPS_FOR_LOBBIES}).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {myLobby && (
        <LobbyPanel
          lobby={myLobby}
          userId={userId}
          ships={ships}
          selectedShipIds={selectedShipIds}
          selectedCost={selectedCost}
          onToggleShipSelect={toggleShipSelect}
          onLeave={() => handleLeave(myLobby.basic.id)}
          onReject={() => handleReject(myLobby.basic.id)}
          onTimeoutJoiner={() => handleTimeoutJoiner(myLobby.basic.id)}
          onQuitWithPenalty={() => handleQuitWithPenalty(myLobby.basic.id)}
          onSubmitFleet={() => handleSubmitFleet(myLobby.basic.id)}
          busy={busy}
        />
      )}

      {!myLobby && (
        <div className="flex flex-col gap-3 border border-solid p-3" style={{ borderColor: "var(--color-gunmetal)" }}>
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-text-primary">
            Create Lobby
          </h3>
          <PresetRow
            label="Threat limit"
            options={[SKIRMISH_THREAT_LIMIT, BATTLE_THREAT_LIMIT]}
            value={costLimit}
            onChange={setCostLimit}
            format={formatThreatShort}
          />
          <PresetRow
            label="Turn time"
            options={[IMMEDIATE_GAME_TURN_SECONDS, CORRESPONDENCE_GAME_TURN_SECONDS]}
            value={turnTimeSeconds}
            onChange={setTurnTimeSeconds}
            format={formatTurnShort}
          />
          <PresetRow
            label="Score to win"
            options={[SHORT_MAX_SCORE, MEDIUM_MAX_SCORE, LONG_MAX_SCORE]}
            value={maxScore}
            onChange={setMaxScore}
            format={formatScoreShort}
          />
          <button
            onClick={handleCreate}
            disabled={busy}
            className="self-start px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-phosphor-green)", color: "var(--color-phosphor-green)", borderRadius: 0 }}
          >
            Create Lobby
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-text-primary">
          [OPEN LOBBIES] — {openLobbies.length}
        </h3>
        {lobbyList.isLoading && <div className="font-mono text-sm text-text-muted">Loading…</div>}
        {openLobbies.length === 0 && !lobbyList.isLoading && (
          <div className="font-mono text-sm text-text-muted">No open lobbies right now.</div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {openLobbies.map((lobby) => (
            <div
              key={lobby.basic.id}
              className="flex flex-col gap-1 border border-solid p-2 font-mono text-xs"
              style={{ borderColor: "var(--color-gunmetal)" }}
            >
              <span className="text-text-primary">Lobby #{lobby.basic.id}</span>
              <span className="text-text-secondary">{formatThreatShort(lobby.basic.costLimit)}</span>
              <span className="text-text-secondary">{formatTurnShort(lobby.gameConfig.turnTime)}</span>
              <span className="text-text-secondary">{formatScoreShort(lobby.gameConfig.maxScore)}</span>
              <button
                onClick={() => handleJoin(lobby.basic.id)}
                disabled={busy || !!myLobby}
                className="mt-1 px-2 py-1 text-[11px] font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function PresetRow<T extends number>({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 font-mono text-xs text-text-secondary">{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid"
          style={{
            borderColor: value === opt ? "var(--color-cyan)" : "var(--color-gunmetal)",
            color: value === opt ? "var(--color-cyan)" : "var(--color-text-secondary)",
            borderRadius: 0,
          }}
        >
          {format(opt)}
        </button>
      ))}
    </div>
  );
}

function LobbyPanel({
  lobby,
  userId,
  ships,
  selectedShipIds,
  selectedCost,
  onToggleShipSelect,
  onLeave,
  onReject,
  onTimeoutJoiner,
  onQuitWithPenalty,
  onSubmitFleet,
  busy,
}: {
  lobby: Web2Lobby;
  userId: string | null;
  ships: ReturnType<typeof useOwnedShipsWeb2>["ships"];
  selectedShipIds: Set<number>;
  selectedCost: number;
  onToggleShipSelect: (id: number) => void;
  onLeave: () => void;
  onReject: () => void;
  onTimeoutJoiner: () => void;
  onQuitWithPenalty: () => void;
  onSubmitFleet: () => void;
  busy: boolean;
}) {
  const isCreator = lobby.basic.creator === userId;
  const isJoiner = lobby.players.joiner === userId;
  const isReservedInvite =
    lobby.state.status === Web2LobbyStatus.Open &&
    lobby.players.reservedJoiner === userId;
  const isFleetSelection = lobby.state.status === Web2LobbyStatus.FleetSelection;
  const isInGame = lobby.state.status === Web2LobbyStatus.InGame;

  const overBudget = lobby.basic.costLimit > 0 && selectedCost > lobby.basic.costLimit;

  return (
    <div className="flex flex-col gap-3 border-2 border-solid p-3" style={{ borderColor: "var(--color-cyan)" }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-text-primary">
          Your Lobby #{lobby.basic.id}
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          {Web2LobbyStatus[lobby.state.status]}
        </span>
      </div>

      {isInGame && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-amber">Game started.</span>
          <button
            onClick={navigateToGamesTab}
            className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid"
            style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
          >
            Go to Games
          </button>
        </div>
      )}

      {isReservedInvite && !isJoiner && (
        <button
          onClick={onReject}
          disabled={busy}
          className="self-start px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
          style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
        >
          Decline Invite
        </button>
      )}

      {isFleetSelection && (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-text-secondary">
            Select ships for your fleet — cost {selectedCost}
            {lobby.basic.costLimit > 0 ? ` / ${lobby.basic.costLimit}` : ""}
          </span>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
            {ships
              .filter((s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0 && (!s.shipData.inFleet || selectedShipIds.has(s.id)))
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => onToggleShipSelect(s.id)}
                  className="border-2 border-solid p-1 font-mono text-[10px] truncate"
                  style={{
                    borderColor: selectedShipIds.has(s.id) ? "var(--color-cyan)" : "var(--color-gunmetal)",
                    color: "var(--color-text-secondary)",
                    borderRadius: 0,
                  }}
                  title={s.name || `Ship #${s.id}`}
                >
                  {s.name || `#${s.id}`}
                </button>
              ))}
          </div>
          <button
            onClick={onSubmitFleet}
            disabled={busy || selectedShipIds.size === 0 || overBudget}
            className="self-start px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-phosphor-green)", color: "var(--color-phosphor-green)", borderRadius: 0 }}
          >
            Submit Fleet
          </button>
          {overBudget && (
            <span className="font-mono text-[11px] text-warning-red">
              Selected fleet exceeds the threat limit.
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!isInGame && (
          <button
            onClick={onLeave}
            disabled={busy}
            className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
          >
            Leave Lobby
          </button>
        )}
        {isCreator && isFleetSelection && (
          <button
            onClick={onTimeoutJoiner}
            disabled={busy}
            className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)", borderRadius: 0 }}
          >
            Timeout Joiner
          </button>
        )}
        {isJoiner && isFleetSelection && (
          <button
            onClick={onQuitWithPenalty}
            disabled={busy}
            className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)", borderRadius: 0 }}
          >
            Quit (Penalize Creator)
          </button>
        )}
      </div>
    </div>
  );
}

export default LobbiesWeb2;
