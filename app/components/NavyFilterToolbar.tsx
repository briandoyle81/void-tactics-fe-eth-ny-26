"use client";

import { navyFilterCategoryLabel, needsNavyFilterValue, type NavyFilterCategory, type NavyFilterCriterion, type NavySortField, type NavySortOrder } from "../utils/navyFilters";
import { NavyFilterControls } from "./NavyFilterControls";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "FILTER: [N] [CLEAR] <chips> ... SORT BY: [select] [↑↓]" row, plus the
// filter popover it opens (NavyFilterControls). Ship-type-agnostic; see
// NavyFilterControls.tsx for why `getSecondaryOptions` is caller-supplied.
interface NavyFilterToolbarProps {
  activeFilters: NavyFilterCriterion[];
  onRemoveFilter: (id: string) => void;
  onClearFilters: () => void;
  sortBy: NavySortField;
  onSortByChange: (field: NavySortField) => void;
  sortOrder: NavySortOrder;
  onToggleSortOrder: () => void;
  showFilterWindow: boolean;
  onOpenFilterWindow: (anchor: { top: number; left: number }) => void;
  onCloseFilterWindow: () => void;
  filterWindowAnchor: { top: number; left: number };
  draftCategory: NavyFilterCategory;
  getSecondaryOptions: (category: NavyFilterCategory) => { value: string; label: string }[];
  onSelectCategory: (category: NavyFilterCategory) => void;
  onToggleFilterValue: (category: NavyFilterCategory, value: string) => void;
  onSetThreatFilter: (value: string | null) => void;
  onSetDraftValue: (category: NavyFilterCategory, value: string) => void;
}

function formatCriterion(
  criterion: NavyFilterCriterion,
  getSecondaryOptions: (category: NavyFilterCategory) => { value: string; label: string }[],
): string {
  const categoryLabel = navyFilterCategoryLabel(criterion.category);
  if (!needsNavyFilterValue(criterion.category)) return categoryLabel;
  const opts = getSecondaryOptions(criterion.category);
  const valueLabel = opts.find((o) => o.value === criterion.value)?.label ?? criterion.value;
  return `${categoryLabel}: ${valueLabel}`;
}

export function NavyFilterToolbar(props: NavyFilterToolbarProps) {
  const { activeFilters, onRemoveFilter, onClearFilters, sortBy, onSortByChange, sortOrder, onToggleSortOrder, showFilterWindow, onOpenFilterWindow, onCloseFilterWindow, getSecondaryOptions } = props;

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label
          className="text-sm font-bold uppercase tracking-wider shrink-0"
          style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: "var(--color-cyan)" }}
        >
          FILTER:
        </label>
        <button
          type="button"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const windowWidth = Math.min(window.innerWidth * 0.96, 72 * 16);
            const left = Math.min(Math.max(12, rect.left), Math.max(0, window.innerWidth - windowWidth));
            onOpenFilterWindow({ top: rect.bottom + 8, left });
          }}
          className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
          style={{
            fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
            borderColor: "var(--color-cyan)",
            color: "var(--color-cyan)",
            backgroundColor: "var(--color-steel)",
            borderRadius: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-steel)"; }}
        >
          {activeFilters.length > 0 ? `[FILTERS ${activeFilters.length}]` : "[FILTERS]"}
        </button>
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-1 border border-warning-red text-warning-red hover:bg-warning-red/10 uppercase font-semibold tracking-wider text-xs transition-all duration-150"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
          >
            [CLEAR]
          </button>
        )}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((criterion) => (
              <button
                type="button"
                key={criterion.id}
                onClick={() => onRemoveFilter(criterion.id)}
                className="px-2 py-1 border border-cyan/60 text-primary hover:border-cyan hover:text-primary hover:bg-cyan/10 text-xs tracking-wide"
                style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
                title="Remove filter"
              >
                {formatCriterion(criterion, getSecondaryOptions)} ×
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
        <label
          className="shrink-0 text-sm font-bold uppercase tracking-wider"
          style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif", color: "var(--color-cyan)" }}
        >
          SORT BY:
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as NavySortField)}
          className="min-w-0 flex-1 px-3 py-1 text-sm font-semibold uppercase tracking-wider sm:min-w-[8rem] sm:flex-none"
          style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", appearance: "none", WebkitAppearance: "none", MozAppearance: "none" }}
        >
          <option value="id">ID</option>
          <option value="cost">THREAT</option>
          <option value="accuracy">ACCURACY</option>
          <option value="hull">HULL</option>
          <option value="speed">SPEED</option>
        </select>

        <button
          onClick={onToggleSortOrder}
          className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            borderColor: "var(--color-cyan)",
            color: "var(--color-cyan)",
            backgroundColor: "var(--color-steel)",
            borderRadius: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-steel)"; }}
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>
      </div>

      <NavyFilterControls
        show={showFilterWindow}
        onClose={onCloseFilterWindow}
        anchor={props.filterWindowAnchor}
        draftCategory={props.draftCategory}
        activeFilters={activeFilters}
        getSecondaryOptions={getSecondaryOptions}
        onSelectCategory={props.onSelectCategory}
        onToggleFilterValue={props.onToggleFilterValue}
        onSetThreatFilter={props.onSetThreatFilter}
        onSetDraftValue={props.onSetDraftValue}
      />
    </>
  );
}
