"use client";

import type { ReactNode } from "react";

/** Sub-section tabs under a screen (Store, Fleet). `trailing` sits at the right end. */
export function SubTabs<T extends string>({
  tabs,
  active,
  onSelect,
  label,
  trailing,
}: {
  tabs: readonly { id: T; label: string; count?: number }[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <div
      className="mb-5 flex items-center gap-1 overflow-x-auto border-b [scrollbar-width:none] md:mb-6 md:gap-4"
      style={{ borderColor: "var(--color-gunmetal)" }}
    >
      <div className="flex shrink-0 gap-1 md:gap-4" role="tablist" aria-label={label}>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.id)}
              className={`-mb-px shrink-0 border-b-2 px-2 py-2 text-sm font-bold uppercase tracking-wider transition-colors duration-150 md:px-1 md:text-base ${
                isActive ? "border-cyan text-cyan" : "border-transparent text-text-secondary hover:text-cyan"
              }`}
              style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
            >
              {tab.label}
              {tab.count != null && <span className="ml-1.5 font-mono text-xs text-text-muted">{tab.count}</span>}
            </button>
          );
        })}
      </div>
      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );
}
