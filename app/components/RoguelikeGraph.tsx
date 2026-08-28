"use client";

import React from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind, type RoguelikeRun } from "../types/roguelike";
import {
  useGetRoguelikeNode,
  useCampaignAutoHealPercent,
} from "../hooks/useRoguelikeNodeMap";
import {
  useAreRoguelikeNodesDefeated,
  useAreRoguelikeNodesLocked,
  useIsRoguelikeNodeDefeated,
} from "../hooks/useRoguelikeRun";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import { useMapEnemyThreat } from "../hooks/useAIEncountersContract";
import { RoguelikeCombatModal } from "./RoguelikeCombatModal";
import { RoguelikeResupplyPanel } from "./RoguelikeResupplyPanel";

interface RoguelikeGraphProps {
  run: RoguelikeRun;
  onRunEnded: () => void;
}

// Active-run view: the current node plus reachable children (filtered by
// lock state), not the whole mission tree — a much smaller, more localized
// graph than the original campaign's full 30-node map. RoguelikeNodeMap's
// data model is children-with-lockout, not prerequisites-with-ANY-of-unlock,
// so this is deliberately its own layout, not a reuse of CampaignGraph.tsx.
export function RoguelikeGraph({ run, onRunEnded }: RoguelikeGraphProps) {
  const { address } = useAccount();
  const { retreatRun, enterResupplyNode } = useRoguelikeMatch();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<bigint | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<bigint | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);

  const { data: currentNode, isLoading: currentNodeLoading, refetch: refetchCurrentNode } =
    useGetRoguelikeNode(run.currentNodeId);
  const { data: autoHealPercent } = useCampaignAutoHealPercent(run.campaignId);

  const childIds = React.useMemo(
    () => (currentNode?.children ?? []).map((c) => c.childId),
    [currentNode],
  );
  const { lockedByNodeId } = useAreRoguelikeNodesLocked(address, childIds);
  const { defeatedByNodeId } = useAreRoguelikeNodesDefeated(address, childIds);
  const { data: isCurrentNodeDefeated } = useIsRoguelikeNodeDefeated(
    address,
    run.currentNodeId,
  );
  // enemyThreat is no longer a stored RoguelikeNodeMap field — derived from
  // the map's actual AI placements instead (see useMapEnemyThreat).
  const { totalThreat: currentNodeThreat } = useMapEnemyThreat(currentNode?.mapId);

  const reachableChildren = React.useMemo(
    () =>
      (currentNode?.children ?? []).filter(
        (edge) => !lockedByNodeId.get(edge.childId.toString()),
      ),
    [currentNode, lockedByNodeId],
  );

  const { data: combatTargetNode } = useGetRoguelikeNode(combatTargetNodeId ?? undefined);

  const handleEnterResupply = async (nodeId: bigint) => {
    setEnteringResupply(nodeId);
    try {
      await enterResupplyNode(nodeId);
      await refetchCurrentNode();
    } catch (error) {
      console.error("Failed to enter resupply node:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("CannotAdvance")) {
        toast.error("This node isn't reachable from your current position.");
      } else if (message.includes("WrongNodeKind")) {
        toast.error("This node isn't a resupply node.");
      } else {
        toast.error(`Failed to enter resupply node: ${message}`);
      }
    } finally {
      setEnteringResupply(null);
    }
  };

  // The current node itself needs a "fight this" action only in the one
  // case where it hasn't been cleared yet — right after startRun, when
  // currentNodeId is the campaign root and it's Combat-kind (the root is
  // "always enterable" per the doc, targetable even though it equals
  // currentNodeId, not a child move). Once cleared, currentNodeId stays put
  // (advancing only happens by entering a child), so this is also the
  // common "returned to a node already won" case — gated on
  // isCurrentNodeDefeated via RoguelikeRun.isNodeDefeated rather than
  // relying solely on catching CannotAdvance/NodeAlreadyDefeated.
  const handleFightCurrentNode = () => {
    if (!currentNode) return;
    setCombatTargetNodeId(currentNode.id);
  };

  // A live combat match (run.activeGameId != 0) must be forfeited first —
  // retreatRun(0) alone reverts ActiveGameInProgress while one is still in
  // progress. Forfeiting doesn't necessarily end the run by itself, so
  // retreatRun(0) still follows; if forfeiting already ended it, that
  // second call reverts NoActiveRun, which is treated as success rather
  // than a real failure. See docs/update/Frontend_Updates_2026-08-26.md.
  const handleRetreat = async () => {
    setIsRetreating(true);
    try {
      if (run.activeGameId !== 0n) {
        await retreatRun(run.activeGameId);
      }
      try {
        await retreatRun(0n);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("NoActiveRun")) throw error;
      }
      toast.success("Run retreated.");
      onRunEnded();
    } catch (error) {
      console.error("Failed to retreat run:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ActiveGameInProgress")) {
        toast.error(
          "A match is still in progress — return to it or let it finish before retreating.",
        );
      } else {
        toast.error(`Failed to retreat: ${message}`);
      }
    } finally {
      setIsRetreating(false);
    }
  };

  if (currentNodeLoading || !currentNode) {
    return (
      <div className="border-2 border-cyan p-6 font-mono text-sm text-text-muted" style={{ borderRadius: 0 }}>
        Loading run position…
      </div>
    );
  }

  if (currentNode.kind === RoguelikeNodeKind.Resupply) {
    return <RoguelikeResupplyPanel run={run} node={currentNode} onDone={() => refetchCurrentNode()} />;
  }

  return (
    <div className="flex flex-col gap-6 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-cyan">
            [RUN — NODE #{currentNode.id.toString()}]
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Roster: {run.rosterShipIds.length} ships · Cost cap: {run.currentCostCap.toString()}
            {autoHealPercent != null && autoHealPercent > 0 && (
              <> · Auto-heal on win: {autoHealPercent}%</>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={isRetreating}
          onClick={() => void handleRetreat()}
          className="border-2 border-warning-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-red transition-colors hover:bg-warning-red/10 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isRetreating ? "[RETREATING...]" : "[RETREAT RUN]"}
        </button>
      </div>

      {isCurrentNodeDefeated ? (
        <p className="text-sm text-phosphor-green">
          This node is cleared — pick where to go next below.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleFightCurrentNode}
          className="self-start border-2 border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10"
          style={{ borderRadius: 0 }}
        >
          [FIGHT THIS NODE] — Threat {currentNodeThreat}
        </button>
      )}

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">
          Where next?
        </h4>
        {reachableChildren.length === 0 ? (
          <p className="text-sm text-text-muted">
            No further missions from here — clearing this node ends the run.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reachableChildren.map((edge) => (
              <RoguelikeChildCard
                key={edge.childId.toString()}
                nodeId={edge.childId}
                isDefeated={!!defeatedByNodeId.get(edge.childId.toString())}
                isEntering={enteringResupply === edge.childId}
                onEnterCombat={() => setCombatTargetNodeId(edge.childId)}
                onEnterResupply={() => void handleEnterResupply(edge.childId)}
              />
            ))}
          </div>
        )}
      </div>

      {combatTargetNodeId != null && combatTargetNode && (
        <RoguelikeCombatModal
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}
    </div>
  );
}

function RoguelikeChildCard({
  nodeId,
  isDefeated,
  isEntering,
  onEnterCombat,
  onEnterResupply,
}: {
  nodeId: bigint;
  isDefeated: boolean;
  isEntering: boolean;
  onEnterCombat: () => void;
  onEnterResupply: () => void;
}) {
  const { data: node, isLoading } = useGetRoguelikeNode(nodeId);
  // enemyThreat is no longer a stored RoguelikeNodeMap field — derived from
  // the map's actual AI placements instead (see useMapEnemyThreat).
  const { totalThreat: nodeThreat } = useMapEnemyThreat(node?.mapId);

  if (isLoading || !node) {
    return (
      <div className="border border-gunmetal p-3 text-xs text-text-muted">
        Loading node #{nodeId.toString()}…
      </div>
    );
  }

  const isCombat = node.kind === RoguelikeNodeKind.Combat;
  // Resupply hubs have no "defeated" concept — only a Combat node already
  // cleared earlier this run (reachable again via a twoWay back-edge) needs
  // gating; re-entering it otherwise reverts NodeAlreadyDefeated.
  const isBlocked = isCombat && isDefeated;

  return (
    <div className="flex flex-col gap-2 border-2 border-gunmetal p-3">
      <span className="text-xs uppercase tracking-wider text-text-secondary">
        Node #{node.id.toString()} — {isCombat ? "Combat" : "Resupply"}
      </span>
      {isCombat ? (
        <span className="text-xs text-amber">
          {isDefeated ? "Cleared" : `Threat ${nodeThreat}`}
        </span>
      ) : (
        <span className="text-xs text-cyan">Repair & roster changes</span>
      )}
      <button
        type="button"
        disabled={isEntering || isBlocked}
        onClick={isCombat ? onEnterCombat : onEnterResupply}
        className="mt-1 self-start border-2 border-cyan px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderRadius: 0 }}
      >
        {isEntering ? "[ENTERING...]" : isBlocked ? "[ALREADY CLEARED]" : "[ENTER]"}
      </button>
    </div>
  );
}
