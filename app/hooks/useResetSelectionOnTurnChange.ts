import { useRef, useEffect } from "react";

export function useResetSelectionOnTurnChange(
  currentTurn: string,
  reset: () => void,
) {
  const prevRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const key = currentTurn.toLowerCase();
    const prev = prevRef.current;
    prevRef.current = key;
    if (prev === undefined || prev === key) return;
    reset();
  }, [currentTurn, reset]);
}
