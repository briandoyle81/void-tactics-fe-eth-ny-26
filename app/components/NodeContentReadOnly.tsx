"use client";

import { nodeContentTextClass, type ResolvedNodeContent } from "../hooks/useNodeContent";

// Web3 node editors show the node's title and description but don't edit
// them: they ship in app/data/dialog/nodeContent.ts (edit that file and
// deploy). Shared by CampaignNodeEditPanel and RoguelikeNodeEditPanel.
export function NodeContentReadOnly({
  node,
}: {
  node: Partial<Pick<ResolvedNodeContent, "title" | "description" | "titleStatus" | "descriptionStatus">> | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 text-xs text-text-muted">
        Title
        <span className={`text-sm ${nodeContentTextClass(node?.titleStatus, "text-cyan")}`}>
          {node?.title || "—"}
        </span>
      </div>
      <div className="flex flex-col gap-1 text-xs text-text-muted">
        Description
        <p className={`whitespace-pre-line text-sm ${nodeContentTextClass(node?.descriptionStatus, "text-text-secondary")}`}>
          {node?.description || "—"}
        </p>
      </div>
      <p className="text-[11px] text-text-muted">
        Title and description ship with the app: edit app/data/dialog/nodeContent.ts.
      </p>
    </div>
  );
}
