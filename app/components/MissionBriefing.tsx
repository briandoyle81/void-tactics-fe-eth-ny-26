"use client";

import React from "react";
import { STYLE_LABEL } from "../styles/fontStyles";
import { getDialogCharacter } from "../data/dialog/characters";
import { MISSION_BRIEFING_SPEAKERS } from "../data/dialog/briefings";
import { nodeContentTextClass, type NodeContentStatus } from "../hooks/useNodeContent";
import { isSameMission } from "../utils/missionDialog";
import type { DialogMission } from "../types/dialog";
import { DialogPortrait } from "./DialogPortrait";
import { HighlightedText } from "./HighlightedText";

// A mission's description, presented as a transmission from the character
// assigned in MISSION_BRIEFING_SPEAKERS: portrait with a name plate floated
// into the text, in a panel edged in the character's color. The body uses the
// primary text color — a long briefing in an accent color is hard to read;
// the character's color carries the name, frame and edge instead. Shared by
// CampaignNodePreview(Web2) and RoguelikeGraph(Web2). Loading/missing text
// and missions with no assigned speaker render as plain description text.
export function MissionBriefing({
  mission,
  text,
  status,
}: {
  mission: DialogMission;
  text: string;
  status: NodeContentStatus | undefined;
}) {
  const speakerId = MISSION_BRIEFING_SPEAKERS.find((s) => isSameMission(s.mission, mission))
    ?.characterId;
  const character = speakerId ? getDialogCharacter(speakerId) : undefined;

  if (!character || status !== "ok") {
    return (
      <p className={`whitespace-pre-line text-sm leading-relaxed ${nodeContentTextClass(status, "text-text-secondary")}`}>
        {status === "ok" ? <HighlightedText text={text} /> : text}
      </p>
    );
  }

  const color = character.textColor;
  return (
    <div className="border-l-2 bg-near-black/60 p-4" style={{ borderColor: color }}>
      {/* Portrait floats so the transmission wraps around and then under it
          — no empty column beside a long briefing. */}
      <div className="float-left mb-2 mr-4 w-24 sm:w-32">
        <DialogPortrait
          character={character}
          name={character.name}
          color={color}
          sizeClass="h-24 w-24 sm:h-32 sm:w-32"
        />
        <div
          className="border border-t-0 border-solid px-1 py-1 text-center"
          style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <div
            className="truncate text-xs font-bold uppercase tracking-widest"
            style={{ ...STYLE_LABEL, color }}
          >
            {character.name}
          </div>
        </div>
      </div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.2em]" style={{ color }}>
        {"// Incoming transmission"}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
        <HighlightedText text={text} />
      </p>
      <div className="clear-both" />
    </div>
  );
}
