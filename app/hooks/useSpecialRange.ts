// Special ranges match the server-side SPECIAL_CONFIG in app/api/games/[id]/action/route.ts
const SPECIAL_RANGES: Record<number, number> = {
  1: 3, // EMP
  2: 2, // Repair
  3: 3, // Flak
};

export function useSpecialRange(special: number) {
  return {
    specialRange: SPECIAL_RANGES[special] as number | undefined,
    isLoading: false,
    error: null,
  };
}
