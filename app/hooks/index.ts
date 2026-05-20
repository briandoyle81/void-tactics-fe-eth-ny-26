// Contract hooks
export {
  useShipsContract,
  useShipsRead,
  useShipsWrite,
} from "./useShipsContract";
export {
  useLobbiesChainParams,
  useLobbiesContract,
  useLobbiesRead,
  useLobbiesWrite,
  useLobby,
  usePlayerLobbyState,
  useLobbyCount,
  useLobbySettings,
  useIsLobbyOpenForJoining,
} from "./useLobbiesContract";
export { useLobbies } from "./useLobbies";
export { useLobbyList } from "./useLobbyList";
export { useOwnedShips } from "./useOwnedShips";
export { useShipActions } from "./useShipActions";
export { useShipDetails } from "./useShipDetails";

// Phase 3: Real-time & Performance hooks
export { useContractEvents } from "./useContractEvents";

// Phase 4: Ship Purchasing with FLOW
export { useShipPurchasing } from "./useShipPurchasing";
export { useShipsPurchaseInfo } from "./useShipsPurchaseInfo";
export { useShipPurchaserPurchaseInfo } from "./useShipPurchaserPurchaseInfo";
export { useFreeShipClaiming } from "./useFreeShipClaiming";

// Legacy image cache utilities (clears old localStorage entries from pre-renderer system)
export {
  clearAllShipImageCache,
  getUseLocalRendering,
  setUseLocalRendering,
} from "./useShipImageCache";

// Ship Renderer (new - uses local rendering with ship data cache)
export {
  useShipRenderer,
  getCachedShipData,
  cacheShipData,
  clearShipDataCache,
  clearAllShipDataCache,
  getShipDataCacheStats,
  cacheShipsData,
} from "./useShipRenderer";

// Ship Data Cache (direct access)
export {
  getCachedShipData as getCachedShipDataDirect,
  cacheShipData as cacheShipDataDirect,
  clearShipDataCache as clearShipDataCacheDirect,
  clearAllShipDataCache as clearAllShipDataCacheDirect,
  getShipDataCacheStats as getShipDataCacheStatsDirect,
  cacheShipsData as cacheShipsDataDirect,
} from "./useShipDataCache";

// Types
export type { ShipsReadFunction, ShipsWriteFunction } from "./useShipsContract";
