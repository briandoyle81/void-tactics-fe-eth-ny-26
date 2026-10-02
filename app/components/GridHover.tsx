"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type GridHoveredCell = {
  shipId: number;
  row: number;
  col: number;
  isCreator: boolean;
  fromFleet?: boolean;
} | null;

export type GridDestHoveredTile = { row: number; col: number } | null;

const NOOP_SET: (cell: GridHoveredCell) => void = () => {};
const NOOP_SET_DEST: (cell: GridDestHoveredTile) => void = () => {};

const GridHoverCellContext = createContext<GridHoveredCell>(null);
const GridHoverSetContext = createContext<(cell: GridHoveredCell) => void>(NOOP_SET);
const GridDestHoverTileContext = createContext<GridDestHoveredTile>(null);
const GridDestHoverSetContext = createContext<(cell: GridDestHoveredTile) => void>(
  NOOP_SET_DEST,
);

type Cell = { row: number; col: number };

function sameHoverCell<T extends Cell>(a: T | null, b: T | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.row !== b.row || a.col !== b.col) return false;
  const aa = a as Cell & { shipId?: number; fromFleet?: boolean };
  const bb = b as Cell & { shipId?: number; fromFleet?: boolean };
  return aa.shipId === bb.shipId && aa.fromFleet === bb.fromFleet;
}

/**
 * Pointer crossings fire leave(null) then enter(next). Deferring the null a
 * frame lets the enter cancel it, so a crossing is one commit instead of
 * two, and re-entering the same cell is a no-op.
 */
function useCoalescedHoverState<T extends Cell>() {
  const [value, setValue] = useState<T | null>(null);
  const clearRafRef = useRef(0);
  const set = useCallback((next: T | null) => {
    if (clearRafRef.current) {
      cancelAnimationFrame(clearRafRef.current);
      clearRafRef.current = 0;
    }
    if (next === null) {
      clearRafRef.current = requestAnimationFrame(() => {
        clearRafRef.current = 0;
        setValue(null);
      });
      return;
    }
    setValue((prev) => (sameHoverCell(prev, next) ? prev : next));
  }, []);
  useEffect(
    () => () => {
      if (clearRafRef.current) cancelAnimationFrame(clearRafRef.current);
    },
    [],
  );
  return [value, set] as const;
}

export function GridHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredCell, setHoveredCell] =
    useCoalescedHoverState<NonNullable<GridHoveredCell>>();
  const [destHoveredTile, setDestHoveredTile] =
    useCoalescedHoverState<NonNullable<GridDestHoveredTile>>();
  return (
    <GridHoverSetContext.Provider value={setHoveredCell}>
      <GridDestHoverSetContext.Provider value={setDestHoveredTile}>
        <GridHoverCellContext.Provider value={hoveredCell}>
          <GridDestHoverTileContext.Provider value={destHoveredTile}>
            {children}
          </GridDestHoverTileContext.Provider>
        </GridHoverCellContext.Provider>
      </GridDestHoverSetContext.Provider>
    </GridHoverSetContext.Provider>
  );
}

/** Dest-tile hover lives here so GameGrid's board tree does not recrawl 187 cells. */
export function DestHoverProvider({ children }: { children: ReactNode }) {
  const [destHoveredTile, setDestHoveredTile] =
    useCoalescedHoverState<NonNullable<GridDestHoveredTile>>();
  return (
    <GridDestHoverSetContext.Provider value={setDestHoveredTile}>
      <GridDestHoverTileContext.Provider value={destHoveredTile}>
        {children}
      </GridDestHoverTileContext.Provider>
    </GridDestHoverSetContext.Provider>
  );
}

export function useGridHoveredCell(): GridHoveredCell {
  return useContext(GridHoverCellContext);
}

export function useSetGridHoveredCell() {
  return useContext(GridHoverSetContext);
}

export function useGridDestHoveredTile(): GridDestHoveredTile {
  return useContext(GridDestHoverTileContext);
}

export function useSetGridDestHoveredTile() {
  return useContext(GridDestHoverSetContext);
}
