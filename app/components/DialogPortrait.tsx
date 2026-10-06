"use client";

import React from "react";
import { STYLE_LABEL } from "../styles/fontStyles";
import type { DialogCharacter } from "../types/dialog";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// A dialog character's portrait, shared by the in-mission comms panel
// (MissionDialogPanel) and mission briefings (MissionBriefing). Falls back to
// an initials tile in the character's color when the image is missing.
export function DialogPortrait({
  character,
  name,
  color,
  sizeClass,
  fallbackText,
}: {
  character: DialogCharacter | undefined;
  name: string;
  color: string;
  /** Tailwind size classes, e.g. "h-16 w-16". */
  sizeClass: string;
  /** Overrides the initials in the fallback tile (e.g. "!" for an error). */
  fallbackText?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => setImageFailed(false), [character?.image]);

  if (character && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={character.image}
        alt={name}
        className={`${sizeClass} shrink-0 border border-solid object-cover`}
        style={{ borderColor: color, borderRadius: 0 }}
        onError={() => setImageFailed(true)}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center border border-solid text-lg font-bold`}
      style={{ ...STYLE_LABEL, borderColor: color, color, borderRadius: 0 }}
      aria-hidden
    >
      {fallbackText ?? initials(name)}
    </div>
  );
}
