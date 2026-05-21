import React from "react";

/** Same typography as `TutorialGridTaskPanel` brief body. */
export const MANAGE_NAVY_TUTORIAL_MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
};

/** Checkbox + Not now row for Manage Navy tutorial briefs (desktop side panels). */
export function ManageNavyTutorialDismissFooter({
  onNotNow,
}: {
  onNotNow: (dontShowAgain: boolean) => void;
}) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <label className="flex max-w-[14rem] cursor-pointer items-start gap-2 text-left text-xs text-secondary sm:max-w-none">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-none border border-gunmetal bg-near-black accent-cyan"
        />
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          Don&apos;t show this again
        </span>
      </label>
      <button
        type="button"
        onClick={() => onNotNow(dontShowAgain)}
        className="shrink-0 self-end px-2 py-0.5 text-sm bg-steel text-text-secondary rounded-none font-mono hover:bg-gunmetal whitespace-nowrap sm:self-auto"
      >
        Not now
      </button>
    </div>
  );
}

/** Mobile bottom sheet: Close (this session), Not now (respects checkbox), never show again. */
export function ManageNavyTutorialDismissFooterSheet({
  onNotNow,
}: {
  onNotNow: (dontShowAgain: boolean) => void;
}) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-cyan/25 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-2">
        <button
          type="button"
          onClick={() => onNotNow(false)}
          className="w-full rounded-none border border-cyan/70 px-3 py-2 text-sm font-mono font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/15 sm:w-auto"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => onNotNow(dontShowAgain)}
          className="w-full rounded-none border border-gunmetal bg-near-black px-3 py-2 text-sm font-mono text-text-primary transition-colors hover:bg-steel sm:w-auto"
        >
          Not now
        </button>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-left text-xs text-text-secondary">
        <input
          type="checkbox"
          checked={dontShowAgain}
          onChange={(e) => setDontShowAgain(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-none border border-gunmetal bg-near-black accent-cyan"
        />
        <span style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
          Don&apos;t show this again (applies when you choose Not now)
        </span>
      </label>
    </div>
  );
}

type ManageNavyMobileTutorialKind = "construct" | "buy" | "drone";

export function ManageNavyMobileTutorialSheet({
  kind,
  constructButtonLabel,
  onNotNow,
}: {
  kind: ManageNavyMobileTutorialKind;
  constructButtonLabel: "[CONSTRUCT ALL SHIPS]" | "[CONSTRUCT 150 SHIPS]";
  onNotNow: (dontShowAgain: boolean) => void;
}) {
  const title =
    kind === "construct"
      ? "Ready for delivery"
      : kind === "buy"
        ? "Materials and energy"
        : "Drone factories online";
  const stepLabel =
    kind === "construct" ? "STEP 2 OF 3" : kind === "buy" ? "STEP 3 OF 3" : "STEP 1 OF 3";
  const progressPct = kind === "construct" ? "66%" : kind === "buy" ? "100%" : "33%";
  const body =
    kind === "construct"
      ? `Admiral, your new ships are staged for fit and finishing. The yard will not release them until you give the word.

Tell the drones you are ready for delivery with ${constructButtonLabel} when you choose. You can close this briefing and come back anytime.`
      : kind === "buy"
        ? `Admiral, you can order more hulls from the drone yards by supplying them with materials and energy.

Big orders make the drones happy. The more hulls you order in one go, the higher the guaranteed floor on quality you can expect.

Use [BUY NEW SHIPS] when you want to open purchasing. Nothing here requires you to buy before you dismiss this tip.`
        : `Admiral, your faction has access to drone-based factories that stay hard at work producing new ships.

The drones make ships efficiently, but they are not very responsive when you demand exact specifications. In any given run you never know what they will produce.

Use [CLAIM FREE SHIPS] when you are ready to draw from the next batch.`;

  return (
    <div
      className="fixed inset-0 z-[280] flex flex-col md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-navy-mobile-tutorial-title"
    >
      <button
        type="button"
        className="min-h-0 w-full flex-1 cursor-default border-0 bg-black/50 p-0"
        aria-label="Close tutorial"
        onClick={() => onNotNow(false)}
      />
      <aside
        className="max-h-[min(72vh,28rem)] w-full shrink-0 overflow-y-auto border-t-2 bg-near-black px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
        style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3
              id="manage-navy-mobile-tutorial-title"
              className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan"
              style={{
                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
              }}
            >
              {title}
            </h3>
            <span
              className="text-[10px] font-bold tracking-widest text-text-muted"
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              {stepLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNotNow(false)}
            className="shrink-0 rounded-none border border-cyan/70 px-2 py-1 text-sm font-mono text-cyan hover:bg-cyan/15"
            aria-label="Close tutorial"
          >
            ×
          </button>
        </div>
        <div className="mb-3 h-1 w-full shrink-0 bg-steel">
          <div
            className="h-1 bg-cyan transition-all duration-300"
            style={{ width: progressPct }}
          />
        </div>
        <p
          className="whitespace-pre-line text-sm leading-relaxed text-primary"
          style={MANAGE_NAVY_TUTORIAL_MONO}
        >
          {body}
        </p>
        <ManageNavyTutorialDismissFooterSheet onNotNow={onNotNow} />
      </aside>
    </div>
  );
}

export function ManageNavyDroneFactoryBrief({
  onNotNow,
  className = "",
}: {
  onNotNow: (dontShowAgain: boolean) => void;
  /** e.g. absolute positioning so the panel does not shift the three-button row */
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto hidden min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 bg-near-black p-3 md:flex ${className}`}
      style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
      role="region"
      aria-label="Drone factory briefing"
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          Drone factories online
        </h3>
        <span
          className="text-[10px] font-bold tracking-widest text-text-muted shrink-0 ml-3"
          style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
        >
          STEP 1 OF 3
        </span>
      </div>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gunmetal">
        <div
          className="h-1 bg-cyan transition-all duration-300"
          style={{ width: "33%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-text-primary whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, your faction has access to drone-based factories that stay hard at work producing new ships.

The drones make ships efficiently, but they are not very responsive when you demand exact specifications. In any given run you never know what they will produce.

Use the highlighted [CLAIM FREE SHIPS] control to draw from the next production batch.`}
      </p>
      <ManageNavyTutorialDismissFooter onNotNow={onNotNow} />
    </aside>
  );
}

export function ManageNavyConstructDeliveryBrief({
  onNotNow,
  constructButtonLabel,
  className = "",
}: {
  onNotNow: (dontShowAgain: boolean) => void;
  constructButtonLabel: "[CONSTRUCT ALL SHIPS]" | "[CONSTRUCT 150 SHIPS]";
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto hidden min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 bg-near-black p-3 md:flex ${className}`}
      style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
      role="region"
      aria-label="Construct delivery briefing"
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          Ready for delivery
        </h3>
        <span
          className="text-[10px] font-bold tracking-widest text-text-muted shrink-0 ml-3"
          style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
        >
          STEP 2 OF 3
        </span>
      </div>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gunmetal">
        <div
          className="h-1 bg-cyan transition-all duration-300"
          style={{ width: "66%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-text-primary whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, your new ships are staged for fit and finishing. The yard will not release them until you give the word.

Tell the drones you are ready for delivery with the highlighted ${constructButtonLabel} control.`}
      </p>
      <ManageNavyTutorialDismissFooter onNotNow={onNotNow} />
    </aside>
  );
}

export function ManageNavyBuyShipsBrief({
  onNotNow,
  className = "",
}: {
  onNotNow: (dontShowAgain: boolean) => void;
  className?: string;
}) {
  return (
    <aside
      className={`pointer-events-auto hidden min-w-0 w-[min(calc(100vw-2rem),28.75rem)] max-w-[28.75rem] flex-col border-2 bg-near-black p-3 md:flex ${className}`}
      style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
      role="region"
      aria-label="Buy ships briefing"
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold uppercase leading-tight tracking-wide text-cyan"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          Materials and energy
        </h3>
        <span
          className="text-[10px] font-bold tracking-widest text-text-muted shrink-0 ml-3"
          style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
        >
          STEP 3 OF 3
        </span>
      </div>
      <div className="mb-2 mt-2 h-1 w-full shrink-0 bg-gunmetal">
        <div
          className="h-1 bg-cyan transition-all duration-300"
          style={{ width: "100%" }}
        />
      </div>
      <p
        className="text-sm leading-relaxed text-text-primary whitespace-pre-line"
        style={MANAGE_NAVY_TUTORIAL_MONO}
      >
        {`Admiral, you can order more hulls from the drone yards by supplying them with materials and energy.

Big orders make the drones happy. The more hulls you order in one go, the higher the guaranteed floor on quality you can expect.`}
      </p>
      <ManageNavyTutorialDismissFooter onNotNow={onNotNow} />
    </aside>
  );
}
