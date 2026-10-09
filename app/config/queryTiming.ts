// How long contract reads of admin-edited data (maps, AI fleets, the
// Operations graph) stay fresh before a remount refetches them. They only
// change when an admin edits them, and the editors refetch explicitly after
// saving (refetch ignores staleTime), so players needn't re-read them on
// every screen visit.
export const ADMIN_DATA_STALE_MS = 5 * 60 * 1000;
