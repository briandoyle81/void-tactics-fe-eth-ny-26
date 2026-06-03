# Migration Plan: Ship Data Caching Instead of Image Caching

## Overview
Migrate from caching rendered ship images (SVG data URIs) to caching ship data (Ship objects), then render images on-demand using the local TypeScript renderer. This eliminates the need for `tokenURI` contract calls.

## Current State Analysis

### Where Ship Images Are Used:
1. **ManageNavy.tsx**: Uses `ShipCard` → `ShipImage` → `useShipImageCache`
2. **Lobbies.tsx**: Uses `ShipImage` directly in fleet selection modal
3. **GameDisplay.tsx**: Uses `ShipImage` in:
   - Map grid cells (via `MapDisplay`)
   - Ship details sidebar (via `ShipCard`)
4. **MapDisplay.tsx**: Uses `ShipImage` for ships on the map grid

### Current Data Flow:
1. Ship data fetched via `getShipsByIds` (already has full Ship objects)
2. `useShipImageCache` hook:
   - Checks localStorage for cached image (SVG data URI)
   - If not cached, calls `tokenURI` contract function
   - Parses tokenURI response to extract SVG
   - Caches the SVG data URI
   - Returns dataUrl for `<img>` tag

### Current Caching System:
- **Storage**: localStorage with key `warpflow-ship-image-{shipId}`
- **Data**: SVG data URI strings (base64 encoded)
- **Size**: ~50-200KB per ship image
- **Expiry**: 7 days
- **Max Size**: 50 images or 5MB

## Proposed Changes

### 1. Create New Ship Data Cache Hook (`useShipDataCache.ts`)

**Purpose**: Cache Ship objects instead of rendered images

**Key Features**:
- Cache key: `warpflow-ship-data-{shipId}`
- Store: Full Ship object (serialized to JSON)
- Size: ~1-5KB per ship (much smaller than images)
- Expiry: 7 days (same as current)
- Max Size: 1000 ships (can be much higher since data is smaller)

**Functions**:
```typescript
- getCachedShipData(shipId: bigint): Ship | null
- cacheShipData(ship: Ship): void
- clearShipDataCache(shipId: bigint): void
- clearAllShipDataCache(): void
- getShipDataCacheStats(): { count: number, size: number }
```

**Benefits**:
- Ship data is already fetched via `getShipsByIds` - no additional contract calls
- Much smaller cache size (1-5KB vs 50-200KB per ship)
- Can cache many more ships
- Images generated on-demand from cached data

### 2. Update `useShipImageCache.ts` → `useShipRenderer.ts`

**Rename and Refactor**:
- Rename hook to `useShipRenderer` (more accurate name)
- Remove `fetchImageFromContract` function entirely
- Remove `tokenURI` contract calls
- Always use local renderer when ship data is available
- Fallback to contract rendering only if local rendering is disabled AND ship data not available

**New Flow**:
1. Check if ship data is cached
2. If cached, use local renderer immediately
3. If not cached, check if ship data is available in props/context
4. If available, cache it and render
5. If not available, show loading state (ship data should be fetched by parent)

**Key Changes**:
- Remove all `tokenURI` contract calls
- Remove request queue for image fetching
- Simplify retry logic (only for ship data fetching, not image fetching)
- Cache rendered images in memory only (not localStorage) for performance

### 3. Update Components

#### 3.1 ManageNavy.tsx
**Current**: Ships fetched via `useOwnedShips` → already has Ship objects
**Change**:
- Ships already have full data, no changes needed
- `ShipCard` → `ShipImage` will automatically use cached ship data

#### 3.2 Lobbies.tsx (Fleet Selection)
**Current**:
- Fetches fleet ship IDs
- Fetches ship data via `useShipsRead("getShipsByIds")`
- Uses `ShipImage` component

**Change**:
- Ship data already fetched, no changes needed
- `ShipImage` will use cached ship data if available
- Cache ship data after fetching from contract

#### 3.3 GameDisplay.tsx
**Current**:
- Fetches ships via `useShipsByIds` for both fleets
- Uses `ShipImage` in map grid and ship details

**Change**:
- Ship data already fetched, no changes needed
- `ShipImage` will use cached ship data
- Cache ship data after fetching

#### 3.4 MapDisplay.tsx
**Current**: Receives ships array as prop, uses `ShipImage`
**Change**: No changes needed - receives Ship objects, passes to `ShipImage`

### 4. Cache Invalidation Strategy

**When to Invalidate**:
- Ship data changes (equipment, traits, etc.) - but this is rare
- Ship destroyed - update `timestampDestroyed` in cache
- Ship constructed - update `constructed` flag in cache
- User disconnects - clear cache (already implemented)

**Cache Key Strategy**:
- Primary key: `warpflow-ship-data-{shipId}`
- Include ship data hash in cache entry to detect changes
- If ship data hash changes, invalidate and re-cache

### 5. Migration Steps

#### Phase 1: Create Ship Data Cache Hook
1. Create `app/hooks/useShipDataCache.ts`
2. Implement caching functions
3. Add cache management utilities
4. Test with Ship Explorer component

#### Phase 2: Update Image Cache Hook
1. Rename `useShipImageCache.ts` → `useShipRenderer.ts`
2. Remove `fetchImageFromContract` function
3. Remove `tokenURI` contract calls
4. Update to use `useShipDataCache` internally
5. Always use local renderer when ship data available
6. Update exports in `app/hooks/index.ts`

#### Phase 3: Update Components
1. Update `ShipImage.tsx` to use new hook name
2. Update all imports of `useShipImageCache` → `useShipRenderer`
3. Add ship data caching after fetching in:
   - `useOwnedShips.ts` (after fetching ships)
   - `useShipsByIds.ts` (after fetching ships)
   - `Lobbies.tsx` (after fetching fleet ships)
   - `GameDisplay.tsx` (after fetching game ships)

#### Phase 4: Cleanup
1. Remove old image cache entries (optional - can leave for backward compatibility)
2. Update cache size limits
3. Remove unused code (request queue, retry logic for images)
4. Update documentation

### 6. Implementation Details

#### Ship Data Cache Structure
```typescript
interface CachedShipData {
  ship: Ship; // Full ship object
  timestamp: number; // Cache timestamp
  shipId: string; // Ship ID for quick lookup
  dataHash: string; // Hash of ship data for change detection
}
```

#### Cache Key Generation
```typescript
const CACHE_KEY_PREFIX = "warpflow-ship-data-";
const getCacheKey = (shipId: bigint) => `${CACHE_KEY_PREFIX}${shipId.toString()}`;
```

#### Data Hash Calculation
```typescript
function calculateShipDataHash(ship: Ship): string {
  // Hash the relevant ship properties that affect rendering
  const data = {
    equipment: ship.equipment,
    traits: ship.traits,
    shipData: {
      shiny: ship.shipData.shiny,
      constructed: ship.shipData.constructed,
      timestampDestroyed: ship.shipData.timestampDestroyed,
    },
  };
  return btoa(JSON.stringify(data)).slice(0, 16); // Simple hash
}
```

#### Updated useShipRenderer Hook Flow
```typescript
export function useShipRenderer(ship: Ship) {
  // 1. Check if ship data is cached
  const cachedShip = getCachedShipData(ship.id);

  // 2. If cached and data hasn't changed, use it
  if (cachedShip && cachedShip.dataHash === calculateShipDataHash(ship)) {
    // Render immediately from cached data
    return renderShip(cachedShip.ship);
  }

  // 3. Cache the current ship data
  cacheShipData(ship);

  // 4. Render from current ship data
  return renderShip(ship);
}
```

### 7. Benefits Summary

1. **No Contract Calls for Images**: Eliminates all `tokenURI` calls
2. **Smaller Cache**: 1-5KB per ship vs 50-200KB per image
3. **More Ships Cached**: Can cache 1000+ ships vs 50 images
4. **Faster Rendering**: No network delay, instant local rendering
5. **Better UX**: Images appear immediately when ship data is available
6. **Reduced RPC Load**: Fewer blockchain calls = lower costs
7. **Offline Capability**: Once ship data is cached, can render offline

### 8. Potential Issues & Solutions

#### Issue 1: Ship Data Changes
**Problem**: Ship data might change (e.g., equipment upgraded)
**Solution**: Use data hash to detect changes, invalidate cache when hash changes

#### Issue 2: Backward Compatibility
**Problem**: Old image cache entries still in localStorage
**Solution**:
- Keep old cache key prefix for now
- Gradually migrate or clear old entries
- Can run cleanup script to remove old entries

#### Issue 3: Memory Usage
**Problem**: Rendering many ships might use memory
**Solution**:
- Cache rendered images in memory (Map) with LRU eviction
- Limit in-memory cache to ~100 images
- Re-render from ship data when needed

#### Issue 4: Rendering Performance
**Problem**: Rendering 100+ ships might be slow
**Solution**:
- Use `useMemo` to cache rendered images per ship
- Only re-render when ship data changes
- Use React.memo for ShipImage component

### 9. Testing Strategy

1. **Unit Tests**:
   - Test ship data cache functions
   - Test cache invalidation
   - Test data hash calculation

2. **Integration Tests**:
   - Test rendering with cached ship data
   - Test rendering with fresh ship data
   - Test cache expiration

3. **E2E Tests**:
   - Test ManageNavy with cached ships
   - Test fleet selection with cached ships
   - Test game view with cached ships

### 10. Rollout Plan

1. **Phase 1** (Week 1): Create ship data cache hook, test in Ship Explorer
2. **Phase 2** (Week 2): Update image cache hook, test in ManageNavy
3. **Phase 3** (Week 3): Update all components, test in Lobbies and GameDisplay
4. **Phase 4** (Week 4): Cleanup, remove old code, optimize performance

### 11. Success Metrics

- **Contract Calls**: Reduce `tokenURI` calls by 100%
- **Cache Size**: Reduce from ~5MB to ~500KB for same number of ships
- **Cache Capacity**: Increase from 50 ships to 1000+ ships
- **Load Time**: Reduce image load time by 80%+ (no network delay)
- **RPC Costs**: Reduce by eliminating image-related contract calls
