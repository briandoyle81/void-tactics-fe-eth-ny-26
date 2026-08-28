"use client";

import React from "react";
import { toast } from "react-hot-toast";
import {
  useRoguelikeMatchWeb2,
  useRoguelikeNodeWeb2,
  type RoguelikeRunWeb2,
} from "../hooks/useRoguelikeWeb2";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";
import { RoguelikeCombatModalWeb2 } from "./RoguelikeCombatModalWeb2";
import { RoguelikeResupplyPanelWeb2 } from "./RoguelikeResupplyPanelWeb2";

interface RoguelikeGraphWeb2Props {
  run: RoguelikeRunWeb2;
  onRunEnded: () => void;
}

// Web2 counterpart to RoguelikeGraph.tsx — same "current node + reachable
// children" localized view, number-native instead of bigint-native.
export function RoguelikeGraphWeb2({ run, onRunEnded }: RoguelikeGraphWeb2Props) {
  const { retreatRun, enterResupplyNode } = useRoguelikeMatchWeb2();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<number | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);

  const { node: currentNode, isLoading: currentNodeLoading } = useRoguelikeNodeWeb2(run.currentNodeId);
  const { node: combatTargetNode } = useRoguelikeNodeWeb2(combatTargetNodeId ?? undefined);
  const { totalThreat: currentNodeThreat } = useMapEnemyThreatWeb2(currentNode?.mapId);

  const defeatedSet = React.useMemo(() => new Set(run.defeatedNodeIds), [run.defeatedNodeIds]);
  const isCurrentNodeDefeated = defeatedSet.has(run.currentNodeId);

  const reachableChildIds = React.useMemo(
    () => currentNode?.childEdges.map((e) => e.childId) ?? [],
    [currentNode],
  );

  const handleEnterResupply = async (nodeId: number) => {
    setEnteringResupply(nodeId);
    try {
      await enterResupplyNode(nodeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enter resupply node");
    } finally {
      setEnteringResupply(null);
    }
  };

  const handleRetreat = async () => {
    setIsRetreating(true);
    try {
      await retreatRun();
      toast.success("Run retreated.");
      onRunEnded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retreat");
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

  if (currentNode.kind === 1) {
    return (
      <RoguelikeResupplyPanelWeb2
        run={run}
        node={currentNode}
        onDone={() => {}}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-cyan">[RUN — NODE #{currentNode.id}]</h3>
          <p className="mt-1 text-xs text-text-muted">
            Roster: {run.roster.length} ships · Cost cap: {run.currentCostCap}
            {run.campaign.autoHealPercent > 0 && (
              <> · Auto-heal on win: {run.campaign.autoHealPercent}%</>
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
        <p className="text-sm text-phosphor-green">This node is cleared — pick where to go next below.</p>
      ) : (
        <button
          type="button"
          onClick={() => setCombatTargetNodeId(currentNode.id)}
          className="self-start border-2 border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10"
          style={{ borderRadius: 0 }}
        >
          [FIGHT THIS NODE] — Threat {currentNodeThreat}
        </button>
      )}

      <div>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-text-muted">Where next?</h4>
        {reachableChildIds.length === 0 ? (
          <p className="text-sm text-text-muted">
            No further missions from here — clearing this node ends the run.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reachableChildIds.map((childId) => (
              <RoguelikeChildCardWeb2
                key={childId}
                nodeId={childId}
                isDefeated={defeatedSet.has(childId)}
                isEntering={enteringResupply === childId}
                onEnterCombat={() => setCombatTargetNodeId(childId)}
                onEnterResupply={() => void handleEnterResupply(childId)}
              />
            ))}
          </div>
        )}
      </div>

      {combatTargetNodeId != null && combatTargetNode && (
        <RoguelikeCombatModalWeb2
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}
    </div>
  );
}

function RoguelikeChildCardWeb2({
  nodeId,
  isDefeated,
  isEntering,
  onEnterCombat,
  onEnterResupply,
}: {
  nodeId: number;
  isDefeated: boolean;
  isEntering: boolean;
  onEnterCombat: () => void;
  onEnterResupply: () => void;
}) {
  const { node, isLoading } = useRoguelikeNodeWeb2(nodeId);
  const { totalThreat: nodeThreat } = useMapEnemyThreatWeb2(node?.mapId);

  if (isLoading || !node) {
    return (
      <div className="border border-gunmetal p-3 text-xs text-text-muted">
        Loading node #{nodeId}…
      </div>
    );
  }

  const isCombat = node.kind === 0;
  const isBlocked = isCombat && isDefeated;

  return (
    <div className="flex flex-col gap-2 border-2 border-gunmetal p-3">
      <span className="text-xs uppercase tracking-wider text-text-secondary">
        Node #{node.id} — {isCombat ? "Combat" : "Resupply"}
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
