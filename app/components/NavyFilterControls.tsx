"use client";

import {
  NAVY_FILTER_GROUPS,
  navyFilterCategoryLabel,
  needsNavyFilterValue,
  isEquipmentOrTraitFilterCategory,
  type NavyFilterCategory,
  type NavyFilterCriterion,
} from "../utils/navyFilters";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// filter-selection popover. Ship-type-agnostic: secondary option lists
// (which weapon/armor/trait values exist in the fleet) are supplied by the
// caller via `getSecondaryOptions`, wired to app/utils/navyFilters.ts's
// `navyFilterSecondaryOptions` (web3) or navyFiltersWeb2.ts's
// `navyFilterSecondaryOptionsWeb2` (web2).
interface NavyFilterControlsProps {
  show: boolean;
  onClose: () => void;
  anchor: { top: number; left: number };
  draftCategory: NavyFilterCategory;
  activeFilters: NavyFilterCriterion[];
  getSecondaryOptions: (category: NavyFilterCategory) => { value: string; label: string }[];
  onSelectCategory: (category: NavyFilterCategory) => void;
  onToggleFilterValue: (category: NavyFilterCategory, value: string) => void;
  onSetThreatFilter: (value: string | null) => void;
  onSetDraftValue: (category: NavyFilterCategory, value: string) => void;
}

export function NavyFilterControls({
  show,
  onClose,
  anchor,
  draftCategory,
  activeFilters,
  getSecondaryOptions,
  onSelectCategory,
  onToggleFilterValue,
  onSetThreatFilter,
  onSetDraftValue,
}: NavyFilterControlsProps) {
  if (!show) return null;

  const draftValueOptions = getSecondaryOptions(draftCategory);
  const threatValue = activeFilters.find((f) => f.category === "data_threat")?.value ?? "";
  const draftValue = activeFilters.find((f) => f.category === draftCategory)?.value ?? "";

  return (
    <>
      <div className="fixed inset-0 z-[259]" onMouseDown={onClose} />
      <div className="fixed z-[260] p-2" style={{ top: `${anchor.top}px`, left: `${anchor.left}px` }}>
        <div
          className="max-h-[78vh] w-[min(96vw,72rem)] overflow-auto border border-cyan/70 bg-near-black p-4"
          style={{ borderRadius: 0 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between border-b border-cyan/30 pb-3">
            <h4
              className="text-lg font-black uppercase tracking-[0.08em] text-primary"
              style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
            >
              Manage Navy Filters
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 border border-cyan/80 text-primary hover:bg-cyan/10 text-xs uppercase tracking-wider"
              style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
            >
              [CLOSE]
            </button>
          </div>

          <section className="border border-cyan/30 p-3" style={{ borderRadius: 0 }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h5 className="text-sm font-bold uppercase tracking-wider text-primary">Select filter criteria</h5>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted">Threat at or below</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={threatValue}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "") {
                      onSetThreatFilter(null);
                      return;
                    }
                    const parsed = Number(next);
                    if (Number.isInteger(parsed) && parsed >= 0) {
                      onSetThreatFilter(String(parsed));
                    }
                  }}
                  className="px-3 py-1 w-28 font-semibold tracking-wider text-sm"
                  style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
                />
              </div>
              {needsNavyFilterValue(draftCategory) &&
                !isEquipmentOrTraitFilterCategory(draftCategory) &&
                draftCategory !== "data_threat" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-muted">
                      {navyFilterCategoryLabel(draftCategory)} value
                    </span>
                    <select
                      value={draftValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next) onSetDraftValue(draftCategory, next);
                      }}
                      disabled={draftValueOptions.length === 0}
                      className="px-3 py-1 uppercase font-semibold tracking-wider text-sm disabled:opacity-40"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        borderRadius: 0,
                      }}
                    >
                      {draftValueOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {NAVY_FILTER_GROUPS.map((group) => (
                <div key={group.label} className="border border-cyan/20 p-2" style={{ borderRadius: 0 }}>
                  <div className="mb-2 text-xs uppercase tracking-wider text-cyan">{group.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.categories.map((category) => (
                      <div key={category} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectCategory(category)}
                          className={`px-2 py-1 text-xs uppercase tracking-wide border ${
                            draftCategory === category
                              ? "border-cyan bg-cyan/20 text-primary"
                              : "border-gunmetal text-secondary hover:border-cyan hover:text-primary"
                          }`}
                          style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
                        >
                          {navyFilterCategoryLabel(category)}
                        </button>
                        {isEquipmentOrTraitFilterCategory(category) && (
                          <div className="ml-1 flex flex-wrap gap-1">
                            {getSecondaryOptions(category).map((option) => {
                              const isSelected = activeFilters.some(
                                (f) => f.category === category && f.value === option.value,
                              );
                              return (
                                <button
                                  type="button"
                                  key={`${category}-${option.value}`}
                                  onClick={() => onToggleFilterValue(category, option.value)}
                                  className={`px-2 py-0.5 text-[11px] uppercase tracking-wide border ${
                                    isSelected
                                      ? "border-phosphor-green bg-phosphor-green/20 text-phosphor-green"
                                      : "border-gunmetal text-text-secondary hover:border-phosphor-green/50 hover:text-phosphor-green"
                                  }`}
                                  style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", borderRadius: 0 }}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
