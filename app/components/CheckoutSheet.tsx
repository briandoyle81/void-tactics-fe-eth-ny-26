"use client";

import { useEffect, type ReactNode } from "react";

// Checkout for a Store purchase: what you're buying, how to pay (each option
// with its own price), and the action for the chosen method. A drawer from
// the right on desktop, a bottom sheet on phones. Shared by web3 and web2 —
// callers supply the options and the confirm action, since paying differs
// (wallet transaction, Fireblocks Flow, or an API call).

export interface CheckoutOption {
  id: string;
  label: string;
  priceLabel: string;
  /** Short line under the label, e.g. "Fireblocks Flow". */
  note?: string;
  /** Set when this method can't be used; shown instead of the note. */
  disabledReason?: string;
}

interface CheckoutSheetProps {
  title: string;
  /** What's being bought, e.g. the pack's tier card. */
  summary: ReactNode;
  options: CheckoutOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Extra lines for the chosen method, e.g. balance after purchase. */
  details?: ReactNode;
  /** The purchase action for the chosen method. */
  confirm: ReactNode;
  onCancel: () => void;
}

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;
const MONO_FONT = { fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" } as const;

export function CheckoutSheet({
  title,
  summary,
  options,
  selectedId,
  onSelect,
  details,
  confirm,
  onCancel,
}: CheckoutSheetProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[450]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-y-auto border-t-2 bg-near-black p-4 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[26rem] md:border-l-2 md:border-t-0 md:p-6"
        style={{ borderColor: "var(--color-cyan)", boxShadow: "-1.5rem 0 3rem rgba(0,0,0,0.6)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-2xl font-bold uppercase tracking-wider text-cyan" style={DISPLAY_FONT}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-2xl font-bold leading-none text-text-muted hover:text-text-primary"
            aria-label="Close checkout"
          >
            ×
          </button>
        </div>

        <div className="relative mb-4 border border-gunmetal bg-black/30 p-3">{summary}</div>

        <div className="mb-2 text-[11px] uppercase tracking-widest text-text-muted" style={MONO_FONT}>
          Pay with
        </div>
        <div className="mb-4 grid gap-2" role="radiogroup" aria-label="Payment method">
          {options.map((option) => {
            const isSelected = option.id === selectedId;
            const disabled = Boolean(option.disabledReason);
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelect(option.id)}
                className={`flex items-center justify-between gap-3 border-2 border-solid px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected ? "border-cyan bg-steel" : "border-gunmetal hover:border-steel"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full border-2 ${isSelected ? "border-cyan bg-cyan" : "border-text-muted"}`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-base font-bold uppercase tracking-wider text-text-primary" style={DISPLAY_FONT}>
                      {option.label}
                    </span>
                    {(option.disabledReason ?? option.note) && (
                      <span className="block text-[11px] text-text-muted" style={MONO_FONT}>
                        {option.disabledReason ?? option.note}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-amber" style={MONO_FONT}>
                  {option.priceLabel}
                </span>
              </button>
            );
          })}
        </div>

        {details && <div className="mb-4 space-y-1.5 border border-gunmetal bg-black/30 p-3">{details}</div>}

        <div className="mt-auto grid gap-2 pt-2">
          {confirm}
          <button
            type="button"
            onClick={onCancel}
            className="border border-gunmetal px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-text-secondary hover:border-steel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/** A label/value row for CheckoutSheet's `details`. */
export function CheckoutDetail({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="flex justify-between gap-3 font-mono text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-bold ${tone === "warn" ? "text-warning-red" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}

/** Styling for the confirm action inside CheckoutSheet. */
export const CHECKOUT_CONFIRM_CLASS =
  "w-full border-2 border-phosphor-green px-4 py-3 font-mono text-sm font-bold uppercase tracking-wider text-phosphor-green transition-colors duration-150 hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-50";
