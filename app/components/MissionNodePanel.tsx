"use client";

import React from "react";
import { nodeContentTextClass, type NodeContentStatus } from "../hooks/useNodeContent";

// Layout shell for a selected mission node, shared by CampaignNodePreview(Web2)
// and RoguelikeGraph(Web2). Modeled on XCOM 2 / Battletech mission screens:
// the narrative transmission takes the main column, and a compact dossier
// beside it carries the decision data and the launch action. The map and
// enemy fleet aren't repeated here; the deploy screen shows them.
export function MissionNodePanel({
  title,
  titleStatus,
  meta,
  briefing,
  dossier,
  children,
}: {
  title: string;
  titleStatus: NodeContentStatus | undefined;
  /** Small line beside the title (node kind, id, ...). */
  meta?: React.ReactNode;
  /** Usually a MissionBriefing. */
  briefing: React.ReactNode;
  /** Usually a MissionDossier. */
  dossier: React.ReactNode;
  /** Rendered after the panel content (e.g. a launch modal). */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative border-2 border-cyan font-mono" style={{ borderRadius: 0 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-steel px-5 py-3">
        <h3 className={`text-xl font-bold ${nodeContentTextClass(titleStatus, "text-cyan")}`}>
          {title}
        </h3>
        {meta && <div className="text-xs uppercase tracking-wider text-text-muted">{meta}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 p-5">{briefing}</div>
        <div className="border-t border-steel lg:border-l lg:border-t-0">{dossier}</div>
      </div>

      {children}
    </div>
  );
}
