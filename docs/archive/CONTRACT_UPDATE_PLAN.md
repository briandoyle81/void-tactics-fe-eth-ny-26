# Contract Update Execution Plan

## Overview
This plan outlines the required frontend updates to sync with the latest contract changes. The contracts have been swapped in, but the frontend code needs updates to match the new function signatures and tier system.

## Critical Breaking Changes Summary

1. **Tier System: 0-based indexing (0-4) instead of 1-based (1-5)**
2. **`getPurchaseInfo()` now returns 2 values instead of 3** (removed `purchaseTiers` array)
3. **`purchaseUTCWithFlow` now mints UTC 1:1 with FLOW** (not recycle-based)
4. **All purchase functions require `_variant` parameter**
5. **`claimFreeShips` requires `_variant` parameter** (already implemented)

## Detailed Update Tasks

### Phase 1: Tier System Updates (0-based indexing)

#### Task 1.1: Update SHIP_PURCHASE_TIERS Configuration
**File:** `app/config/contracts.ts`
- **Current:** `tiers: [1, 2, 3, 4, 5]`
- **Update to:** `tiers: [0, 1, 2, 3, 4]`
- **Impact:** This is the source of truth for tier display throughout the app

#### Task 1.2: Update useShipPurchasing Hook
**File:** `app/hooks/useShipPurchasing.ts`
- **Line 105:** Change validation from `tier < 1 || tier > tiers.length` to `tier < 0 || tier >= tiers.length`
- **Line 111:** Remove `tier - 1` conversion (tier is already 0-based)
- **Line 132:** Verify tier is passed correctly (already using `tier - 1`, needs to be just `tier`)
- **Line 160:** Remove `tier - 1` conversion in `getPurchaseCosts`
- **Line 181:** Remove `tier - 1` conversion in `canAfford`

#### Task 1.3: Update ShipPurchaseInterface Component
**File:** `app/components/ShipPurchaseInterface.tsx`
- **Line 65-80:** Update tier display to show "TIER 0", "TIER 1", etc. instead of "TIER 1", "TIER 2"
- **Line 69:** Update `getTierColors` to handle tiers 0-4 instead of 1-5
- **Line 74:** Pass tier directly (already 0-based from array index)

#### Task 1.4: Update ShipPurchaseButton Component
**File:** `app/components/ShipPurchaseButton.tsx`
- **Line 77:** Remove `tier - 1` conversion - tier prop should already be 0-based
- **Note:** Component receives tier from parent, verify parent passes 0-based tier

#### Task 1.5: Update UTCPurchaseModal Component
**File:** `app/components/UTCPurchaseModal.tsx`
- **Line 116-117:** Update display tier logic - currently shows `index + 1`, should show `index` (0-based)
- **Line 118:** Update `getTierColors` to handle tiers 0-4
- **Line 132:** Update display to show "TIER 0", "TIER 1", etc.

### Phase 2: Function Signature Updates

#### Task 2.1: Update UTCPurchaseButton ABI
**File:** `app/components/UTCPurchaseButton.tsx`
- **Line 25:** Change `_tier` type from `uint256` to `uint8` in ABI
- **Line 79:** Verify tier is passed as number (0-255), not BigInt

#### Task 2.2: Verify claimFreeShips Implementation
**File:** `app/hooks/useFreeShipClaiming.ts`
- **Line 271:** Already has variant parameter `[1]` - ✅ Correct
- **Verify:** Function signature matches new contract

#### Task 2.3: Check for getPurchaseInfo Calls
**Search for:** All `getPurchaseInfo` usages
- **Update:** Destructure 2 values `[shipsPerTier, prices]` instead of 3 `[tiers, shipsPerTier, prices]`
- **Status:** Currently using hard-coded `SHIP_PURCHASE_TIERS`, no contract calls found

#### Task 2.4: Search for customizeShip/constructSpecificShip
**Search for:** Any calls to `customizeShip` or `constructSpecificShip`
- **Action:** Remove `_rerollName` and `_rerollColors` parameters if found
- **Status:** No calls found in codebase (likely not used in frontend)

#### Task 2.5: Search for createShips Calls
**Search for:** Any calls to `createShips`
- **Action:** Add `_tier` parameter (uint8, 0-4) if missing
- **Status:** No direct calls found (likely admin-only function)

### Phase 3: UTC Purchase Updates

#### Task 3.1: Verify UTC Purchase Expectations
**File:** `app/components/UTCPurchaseModal.tsx`
- **Line 108-109:** Already updated to show 1:1 rate ✅
- **Line 119:** Already using 1:1 calculation ✅
- **Status:** UI already reflects 1:1 rate, verify backend matches

### Phase 4: Rank Calculation Verification

#### Task 4.1: Verify Rank Calculation
**File:** `app/utils/shipLevel.ts`
- **Status:** Already using threshold-based system ✅
- **Lines 21-33:** Correctly implements new rank thresholds
- **No changes needed**

### Phase 5: Testing & Validation

#### Task 5.1: Test Tier Purchase Flows
- Test purchasing ships at each tier (0-4)
- Verify correct number of ships received
- Verify preset ranks for tier-based purchases

#### Task 5.2: Test UTC Purchase
- Verify 1:1 FLOW to UTC conversion
- Test all tier levels (0-4)

#### Task 5.3: Test Free Ship Claiming
- Verify variant parameter is passed correctly
- Verify ships are generated randomly (no tier ranks)

## Files Requiring Updates

### High Priority (Breaking Changes)
1. `app/config/contracts.ts` - Tier array update
2. `app/hooks/useShipPurchasing.ts` - Tier validation and conversion logic
3. `app/components/ShipPurchaseInterface.tsx` - Tier display
4. `app/components/ShipPurchaseButton.tsx` - Tier parameter passing
5. `app/components/UTCPurchaseModal.tsx` - Tier display and ABI
6. `app/components/UTCPurchaseButton.tsx` - ABI type update

### Medium Priority (Verification)
7. `app/hooks/useFreeShipClaiming.ts` - Verify variant parameter
8. Any files using `getPurchaseInfo()` - Update destructuring

### Low Priority (Already Correct)
9. `app/utils/shipLevel.ts` - Already updated ✅

## Implementation Order

1. **Start with config** - Update `SHIP_PURCHASE_TIERS` (affects everything)
2. **Update hooks** - Fix tier validation and conversion logic
3. **Update components** - Fix tier display and parameter passing
4. **Verify functions** - Check all contract calls match new signatures
5. **Test thoroughly** - Test all purchase and claim flows

## Risk Assessment

### High Risk
- Tier indexing changes affect all purchase flows
- Incorrect tier values will cause contract call failures

### Medium Risk
- Display inconsistencies (showing Tier 1 vs Tier 0)
- UTC amount calculations (already 1:1, but verify)

### Low Risk
- Rank calculation (already correct)
- Free ship claiming (already has variant)

## Success Criteria

✅ All tier references use 0-based indexing (0-4)
✅ All purchase functions pass correct tier values
✅ UI displays "Tier 0", "Tier 1", etc. correctly
✅ UTC purchases show 1:1 rate correctly
✅ All contract calls match new function signatures
✅ No console errors or transaction failures

## Notes

- The rank calculation system is already updated and correct
- Free ship claiming already includes variant parameter
- Most tier conversion issues are in display logic, not contract calls
- The main work is updating the tier system from 1-based to 0-based throughout the UI
