"use client";

import React from "react";
import { splitHighlights } from "../utils/highlightTerms";

/**
 * Dialog text with the shared vocabulary highlighted (same terms and colors
 * as the tutorial — app/data/dialog/highlightTerms.ts). Used for comms
 * messages, the comms log, the result-screen debrief and mission briefings.
 */
export function HighlightedText({ text }: { text: string }) {
  const segments = React.useMemo(() => splitHighlights(text), [text]);
  return (
    <>
      {segments.map((segment, i) =>
        segment.className ? (
          <span key={i} className={segment.className}>
            {segment.text}
          </span>
        ) : (
          <React.Fragment key={i}>{segment.text}</React.Fragment>
        ),
      )}
    </>
  );
}
