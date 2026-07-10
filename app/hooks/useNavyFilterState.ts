"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isEquipmentOrTraitFilterCategory,
  needsNavyFilterValue,
  type NavyFilterCategory,
  type NavyFilterCriterion,
  type NavySortField,
  type NavySortOrder,
} from "../utils/navyFilters";
import { newFleetCompositionId } from "../utils/fleetCompositionStorage";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — pure
// filter/sort/pagination UI state, no Ship/Web2Ship dependency at all (the
// actual filtering/sorting math lives in the type-specific twin modules,
// app/utils/navyFilters.ts / navyFiltersWeb2.ts — this hook only owns the
// criteria/sort-field/page state and the handlers that mutate it).
export function useNavyFilterState(shipsPerPage: number) {
  const [showFilterWindow, setShowFilterWindow] = useState(false);
  const [filterWindowAnchor, setFilterWindowAnchor] = useState<{ top: number; left: number }>({ top: 120, left: 24 });
  const [draftCategory, setDraftCategory] = useState<NavyFilterCategory>("constructed");
  const [draftValue, setDraftValue] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<NavyFilterCriterion[]>([]);
  const [sortBy, setSortBy] = useState<NavySortField>("id");
  const [sortOrder, setSortOrder] = useState<NavySortOrder>("asc");
  const [page, setPage] = useState(0);

  const upsertFilter = useCallback((category: NavyFilterCategory, value: string) => {
    setActiveFilters((prev) => {
      const existsExact = prev.some((x) => x.category === category && x.value === value);
      if (existsExact) return prev;
      const nextWithoutCategory = isEquipmentOrTraitFilterCategory(category)
        ? prev
        : prev.filter((x) => x.category !== category);
      return [...nextWithoutCategory, { id: newFleetCompositionId(), category, value }];
    });
  }, []);

  const toggleBooleanFilter = useCallback((category: NavyFilterCategory) => {
    setActiveFilters((prev) => {
      const hasCategory = prev.some((x) => x.category === category && x.value === "");
      if (hasCategory) {
        return prev.filter((x) => x.category !== category);
      }
      const nextWithoutCategory = prev.filter((x) => x.category !== category);
      return [...nextWithoutCategory, { id: newFleetCompositionId(), category, value: "" }];
    });
  }, []);

  const toggleFilterValue = useCallback((category: NavyFilterCategory, value: string) => {
    setActiveFilters((prev) => {
      const hasExact = prev.some((x) => x.category === category && x.value === value);
      if (hasExact) {
        return prev.filter((x) => !(x.category === category && x.value === value));
      }
      const nextBase = isEquipmentOrTraitFilterCategory(category) ? prev : prev.filter((x) => x.category !== category);
      return [...nextBase, { id: newFleetCompositionId(), category, value }];
    });
  }, []);

  const removeFilterById = useCallback((id: string) => {
    setActiveFilters((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearFilters = useCallback(() => setActiveFilters([]), []);

  /** Threat-at-or-below numeric input: `null` clears the criterion entirely, matching ManageNavy.tsx's original `onChange`. */
  const setThreatFilter = useCallback((value: string | null) => {
    if (value === null) {
      setActiveFilters((prev) => prev.filter((f) => f.category !== "data_threat"));
      return;
    }
    upsertFilter("data_threat", value);
  }, [upsertFilter]);

  /**
   * Click handler for a filter-group category button — mirrors
   * ManageNavy.tsx's original inline logic exactly. `getSecondaryOptions`
   * is the caller's type-specific `navyFilterSecondaryOptions`/Web2 twin.
   */
  const selectDraftCategory = useCallback(
    (category: NavyFilterCategory, getSecondaryOptions: (category: NavyFilterCategory) => { value: string; label: string }[]) => {
      setDraftCategory(category);
      if (!needsNavyFilterValue(category)) {
        toggleBooleanFilter(category);
        return;
      }
      if (isEquipmentOrTraitFilterCategory(category)) return;
      if (category === "data_threat") {
        setActiveFilters((prev) => {
          const existing = prev.find((f) => f.category === "data_threat");
          const next = existing?.value ?? "100";
          setDraftValue(next);
          if (existing) return prev;
          return [...prev, { id: newFleetCompositionId(), category: "data_threat", value: next }];
        });
        return;
      }
      const opts = getSecondaryOptions(category);
      setDraftValue((prevDraft) => {
        const preferred = opts.find((o) => o.value === prevDraft)?.value;
        const chosen = preferred ?? opts[0]?.value ?? "";
        if (chosen) upsertFilter(category, chosen);
        return chosen || prevDraft;
      });
    },
    [toggleBooleanFilter, upsertFilter],
  );

  // Reset to page 0 whenever the effective result set could have changed shape.
  useEffect(() => {
    setPage(0);
  }, [activeFilters, sortBy, sortOrder]);

  const pageCount = useCallback((totalCount: number) => Math.max(1, Math.ceil(totalCount / shipsPerPage)), [shipsPerPage]);

  const nextPage = useCallback(
    (totalCount: number) => setPage((p) => Math.min(pageCount(totalCount) - 1, p + 1)),
    [pageCount],
  );
  const prevPage = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);

  const paginate = useCallback(<T,>(items: T[]): T[] => items.slice(page * shipsPerPage, (page + 1) * shipsPerPage), [page, shipsPerPage]);

  return {
    showFilterWindow,
    setShowFilterWindow,
    filterWindowAnchor,
    setFilterWindowAnchor,
    draftCategory,
    setDraftCategory,
    draftValue,
    setDraftValue,
    activeFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    upsertFilter,
    toggleBooleanFilter,
    toggleFilterValue,
    removeFilterById,
    clearFilters,
    setThreatFilter,
    selectDraftCategory,
    pageCount,
    nextPage,
    prevPage,
    paginate,
  };
}
