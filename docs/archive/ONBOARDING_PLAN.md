# Onboarding Experience - Implementation Plan

## Overview
Create a simulated, step-by-step onboarding experience that teaches new players the core game mechanics without requiring any blockchain transactions. The experience should look and feel identical to the real game, but with simulated game state and action restrictions.

## Architecture

### 1. Core Components

#### 1.1 OnboardingTutorial Component (`app/components/OnboardingTutorial.tsx`)
- Main container component that manages the tutorial flow
- Handles step progression, state management, and UI overlays
- Wraps a simulated GameDisplay component
- Manages tutorial state (current step, allowed actions, etc.)

#### 1.2 SimulatedGameDisplay Component (`app/components/SimulatedGameDisplay.tsx`)
- Modified version of GameDisplay that:
  - Uses simulated game data instead of blockchain data
  - Intercepts action handlers to validate against tutorial step
  - Shows simulated transaction approval dialogs
  - Prevents non-allowed actions
  - Uses the same visual components (MapDisplay, ShipCard, etc.)

#### 1.3 TutorialStepOverlay Component (`app/components/TutorialStepOverlay.tsx`)
- Overlay that displays:
  - Current step instructions
  - Highlighted UI elements (using CSS/pointer-events)
  - Progress indicator
  - Skip/Next buttons (where appropriate)

#### 1.4 SimulatedTransactionDialog Component (`app/components/SimulatedTransactionDialog.tsx`)
- Modal dialog that simulates wallet transaction approval
- Shows transaction details (action type, ship, target, etc.)
- "Approve" and "Reject" buttons
- Only appears for steps that require transaction simulation

### 2. Data Structures

#### 2.1 Tutorial Step Definition
```typescript
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instructions: string | React.ReactNode;
  allowedActions: {
    selectShip?: bigint[]; // Specific ship IDs that can be selected
    moveShip?: { shipId: bigint; allowedPositions: Position[] };
    shoot?: { shipId: bigint; allowedTargets: bigint[] };
    useSpecial?: { shipId: bigint; allowedTargets: bigint[] };
    assist?: { shipId: bigint; allowedTargets: bigint[] };
    claimPoints?: boolean;
  };
  highlightElements?: {
    ships?: bigint[];
    mapPositions?: Position[];
    uiElements?: string[]; // CSS selectors or component refs
  };
  requiresTransaction?: boolean; // Show transaction dialog
  onStepComplete?: (actionData: any) => void; // Custom validation
  nextStepCondition?: (gameState: SimulatedGameState) => boolean;
}
```

#### 2.2 Simulated Game State
```typescript
interface SimulatedGameState {
  gameId: bigint; // Fixed tutorial game ID
  metadata: {
    gameId: bigint;
    creator: Address; // Player's address
    joiner: Address; // Simulated opponent
    creatorFleetId: bigint;
    joinerFleetId: bigint;
    creatorGoesFirst: boolean;
    startedAt: bigint;
    winner: Address;
  };
  turnState: {
    currentTurn: Address;
    turnTime: bigint;
    turnStartTime: bigint;
    currentRound: bigint;
  };
  gridDimensions: { gridWidth: number; gridHeight: number };
  maxScore: bigint;
  creatorScore: bigint;
  joinerScore: bigint;
  shipIds: bigint[];
  shipAttributes: Attributes[];
  shipPositions: ShipPosition[];
  creatorActiveShipIds: bigint[];
  joinerActiveShipIds: bigint[];
  creatorMovedShipIds: bigint[];
  joinerMovedShipIds: bigint[];
}
```

#### 2.3 Simulated Ships
- Pre-defined ship configurations for both player and opponent
- Fixed IDs, attributes, and starting positions
- Same visual representation as real ships
- Deterministic behavior for consistent experience

### 3. Tutorial Steps

#### Step 1: Welcome & Map Overview
- **Goal**: Introduce the game and explain the map
- **Actions**: None (read-only)
- **Content**:
  - Welcome message
  - Explain grid layout (25x13)
  - Explain blocked tiles (purple borders) - line of sight blockers
  - Explain scoring tiles (yellow/blue) - victory points
  - Explain deployment zones (left 5 cols for creator, right 5 cols for joiner)
- **UI**: Highlight map elements with tooltips

#### Step 2: Game Goals & Victory Conditions
- **Goal**: Explain how to win
- **Actions**: None (read-only)
- **Content**:
  - Explain scoring system (control scoring tiles)
  - Explain maxScore (first to reach X points wins)
  - Show current scores (0-0)
  - Explain ship destruction mechanics
- **UI**: Highlight score display, scoring tiles

#### Step 3: Ship Selection & Information
- **Goal**: Learn to select ships and view information
- **Actions**:
  - `selectShip`: Allow clicking on player's ships
- **Content**:
  - "Click on one of your ships to view its details"
  - Explain ship attributes (hull, range, movement, etc.)
  - Explain equipment (weapon, armor, shield, special)
- **UI**: Highlight player's ships, show tooltip on hover

#### Step 4: Moving Ships
- **Goal**: Learn ship movement
- **Actions**:
  - `selectShip`: Specific ship (e.g., ship with ID 1001n)
  - `moveShip`: Move to specific highlighted position
- **Content**:
  - "Select your ship and move it to the highlighted position"
  - Explain movement range (highlighted tiles)
  - Explain that ships can move and act in the same turn
- **Transaction**: Simulate transaction approval for move action
- **UI**: Highlight selected ship, highlight valid move positions, dim invalid areas

#### Step 5: Scoring Points
- **Goal**: Learn to claim points from scoring tiles
- **Actions**:
  - `selectShip`: Ship that can reach a scoring tile
  - `moveShip`: Move to a scoring tile
  - `claimPoints`: Automatically claim points (or show button)
- **Content**:
  - "Move your ship to a scoring tile to claim points"
  - Explain automatic scoring when ship ends turn on scoring tile
  - Show score increase animation
- **Transaction**: Simulate transaction approval
- **UI**: Highlight scoring tiles, show score increase

#### Step 6: Firing Weapons
- **Goal**: Learn to shoot at enemy ships
- **Actions**:
  - `selectShip`: Ship with weapon
  - `shoot`: Target specific enemy ship
- **Content**:
  - "Select your ship and target an enemy ship"
  - Explain weapon range (highlighted area)
  - Explain line of sight (blocked tiles)
  - Show damage calculation preview
- **Transaction**: Simulate transaction approval
- **UI**: Highlight shooting range, highlight valid targets, show damage preview

#### Step 7: Using Special Abilities - EMP
- **Goal**: Learn EMP special ability
- **Actions**:
  - `selectShip`: Ship with EMP special
  - `useSpecial`: Target enemy ship with EMP
- **Content**:
  - "Use your EMP to disable an enemy ship"
  - Explain EMP effects (disables enemy)
  - Explain special range vs weapon range
- **Transaction**: Simulate transaction approval
- **UI**: Highlight special range, highlight valid targets

#### Step 8: Using Special Abilities - Repair
- **Goal**: Learn Repair special ability
- **Actions**:
  - `selectShip`: Ship with Repair special
  - `useSpecial`: Target friendly disabled ship
- **Content**:
  - "Use Repair to heal a disabled friendly ship"
  - Explain repair effects (restores hull)
  - Show before/after hull points
- **Transaction**: Simulate transaction approval
- **UI**: Highlight repair range, highlight disabled friendly ships

#### Step 9: Rescuing Disabled Ships
- **Goal**: Learn to assist/rescue disabled ships
- **Actions**:
  - `selectShip`: Ship that can assist
  - `assist`: Target disabled friendly ship
- **Content**:
  - "Move next to a disabled friendly ship and assist it"
  - Explain assist mechanics (prevents destruction, restores some hull)
  - Explain reactor critical timer
- **Transaction**: Simulate transaction approval
- **UI**: Highlight disabled ships, highlight assist range

#### Step 10: Destroying Disabled Enemy Ships
- **Goal**: Learn to finish off disabled enemies
- **Actions**:
  - `selectShip`: Ship that can shoot
  - `shoot`: Target disabled enemy ship
- **Content**:
  - "Shoot a disabled enemy ship to destroy it and increase reactor overload"
  - Explain destruction mechanics
  - Explain reactor overload increase
  - Show ship destruction animation
- **Transaction**: Simulate transaction approval
- **UI**: Highlight disabled enemy ships, show destruction effect

#### Step 11: Completion
- **Goal**: Complete tutorial
- **Actions**: None
- **Content**:
  - Congratulations message
  - Summary of learned mechanics
  - Link to start real game
- **UI**: Celebration animation, next steps

### 4. Implementation Details

#### 4.1 State Management
- Use React Context (`OnboardingContext`) to manage:
  - Current step index
  - Simulated game state
  - Action restrictions
  - Transaction dialog state
- Update simulated game state after each action (deterministic)

#### 4.2 Action Validation
- Intercept all game actions in SimulatedGameDisplay
- Check against current step's `allowedActions`
- Show error message if action not allowed
- Only allow actions that match the current step

#### 4.3 Transaction Simulation
- When action requires transaction:
  1. Show SimulatedTransactionDialog
  2. Wait for user to click "Approve"
  3. Update simulated game state
  4. Show success message
  4. Progress to next step

#### 4.4 Visual Feedback
- Highlight allowed elements (ships, positions) with CSS overlays
- Dim/disable non-allowed elements
- Show tooltips with step instructions
- Animate state changes (ship movement, damage, etc.)

#### 4.5 Deterministic Game State
- All ships, positions, and outcomes are pre-determined
- Same experience for every player
- No randomness in tutorial
- Fixed opponent responses (if any)

### 5. File Structure

```
app/
  components/
    OnboardingTutorial.tsx          # Main tutorial container
    SimulatedGameDisplay.tsx        # Modified GameDisplay for simulation
    TutorialStepOverlay.tsx         # Instruction overlay
    SimulatedTransactionDialog.tsx  # Transaction approval dialog
  hooks/
    useOnboardingTutorial.ts        # Tutorial state management hook
    useSimulatedGameState.ts        # Simulated game state hook
  types/
    onboarding.ts                   # Tutorial-specific types
  data/
    tutorialShips.ts                # Pre-defined tutorial ships
    tutorialSteps.ts                # Step definitions
    tutorialGameState.ts            # Initial game state
```

### 6. Integration Points

#### 6.1 Entry Point
- Add "Tutorial" button/tab in main navigation (Header or page.tsx)
- Or show tutorial prompt for new players
- Store completion status in localStorage

#### 6.2 Component Reuse
- Reuse existing components:
  - `MapDisplay` (with simulated props)
  - `ShipCard` (for ship details)
  - `ShipImage` (for ship rendering)
  - All visual styling from GameDisplay

#### 6.3 Styling
- Use same CSS classes and styling as real game
- Add tutorial-specific overlays with z-index management
- Ensure tutorial UI doesn't break game UI

### 7. Technical Considerations

#### 7.1 Performance
- Pre-render tutorial assets
- Lazy load tutorial only when accessed
- Optimize simulated game state updates

#### 7.2 Accessibility
- Keyboard navigation support
- Screen reader friendly instructions
- Clear visual indicators

#### 7.3 Error Handling
- Handle edge cases (user tries invalid action)
- Provide clear error messages
- Allow step retry/reset

#### 7.4 Testing
- Test each step independently
- Test action validation
- Test state transitions
- Test transaction simulation

### 8. Future Enhancements

- Advanced tutorial (advanced mechanics)
- Interactive hints system
- Progress saving (resume tutorial)
- Analytics (track completion rates)
- Localization support

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create OnboardingTutorial component
2. Create SimulatedGameDisplay component
3. Create tutorial state management
4. Create simulated game state system

### Phase 2: Tutorial Steps
1. Implement Step 1-3 (read-only steps)
2. Implement Step 4 (movement)
3. Implement Step 5 (scoring)
4. Implement Step 6 (shooting)

### Phase 3: Advanced Steps
1. Implement Step 7-8 (special abilities)
2. Implement Step 9 (rescuing)
3. Implement Step 10 (destroying disabled ships)
4. Implement Step 11 (completion)

### Phase 4: Polish
1. Add visual highlights and animations
2. Add transaction simulation dialogs
3. Add error handling and validation
4. Add completion tracking

### Phase 5: Testing & Refinement
1. Test all steps
2. Fix bugs and edge cases
3. Improve instructions and UI
4. Performance optimization

## Success Criteria

1. ✅ Tutorial looks identical to real game
2. ✅ All core mechanics are covered
3. ✅ Step-by-step instructions are clear
4. ✅ Actions are properly restricted per step
5. ✅ Transaction simulation feels realistic
6. ✅ Experience is deterministic (same for all players)
7. ✅ No blockchain transactions are called
8. ✅ Tutorial can be completed in 10-15 minutes
9. ✅ Players understand all core mechanics after completion
