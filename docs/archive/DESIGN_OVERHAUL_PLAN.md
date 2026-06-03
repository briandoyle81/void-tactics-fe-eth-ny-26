# UI/UX Design Overhaul Plan
## Faction 01: Industrial Military Human Theme

**Theme Anchor:** Battlestar Galactica, Naval Combat Systems, Submarine War Room, Industrial Sci-Fi

---

## Phase 1: Foundation Setup

### 1.1 Typography System
**Status:** ⏳ Pending

**Actions:**
- [ ] Install Google Fonts: Rajdhani (primary UI), JetBrains Mono (stats/numbers)
- [ ] Update `app/layout.tsx` to load new fonts
- [ ] Remove Geist Sans and Geist Mono
- [ ] Configure font variables in `globals.css`
- [ ] Set up font fallbacks

**Font Stack:**
```typescript
// Primary UI (labels, buttons, HUD)
Rajdhani: weights 400, 500, 600, 700
Fallback: 'Arial Black', sans-serif

// Secondary (numbers, stats, logs)
JetBrains Mono: weights 400, 500, 600
Fallback: 'Courier New', monospace
```

**Implementation:**
- Update `layout.tsx` with new font imports
- Replace `--font-geist-sans` → `--font-rajdhani`
- Replace `--font-geist-mono` → `--font-jetbrains-mono`
- Set `font-smoothing: none` for pixel-perfect rendering

---

### 1.2 Color Token System
**Status:** ⏳ Pending

**Actions:**
- [ ] Define CSS custom properties in `globals.css`
- [ ] Configure Tailwind v4 theme tokens
- [ ] Remove all purple/cyan gradient references
- [ ] Update scrollbar, selection, and slider styles

**Color Palette:**

```css
/* Base Colors (Dominant) */
--color-near-black: #0c1117;      /* Backgrounds */
--color-slate: #1a2430;           /* Panels */
--color-steel: #223041;           /* HUD containers */
--color-gunmetal: #2b2f36;        /* Command bars */

/* Accent Colors (Functional Only) */
--color-phosphor-green: #6bff8f;  /* Targeting / Success */
--color-amber: #ffb84d;            /* Energy / Readiness / Cooldown */
--color-cyan: #56d6ff;             /* Navigation / Movement / Sensors */
--color-warning-red: #ff4d4d;      /* Damage / Danger / Critical */

/* Text Colors */
--color-text-primary: #e2e8f0;     /* Main text */
--color-text-secondary: #94a3b8;    /* Secondary text */
--color-text-muted: #64748b;       /* Muted text */
```

**Tailwind Config:**
- Map colors to Tailwind utilities
- Remove gradient utilities where inappropriate
- Create semantic color classes (e.g., `bg-panel`, `text-accent-targeting`)

---

### 1.3 Base Styles & Reset
**Status:** ⏳ Pending

**Actions:**
- [ ] Remove all gradient backgrounds
- [ ] Remove rounded corners (replace with square or 2px chamfer)
- [ ] Remove soft shadows and glows
- [ ] Add pixel-perfect rendering rules
- [ ] Update scrollbar styling
- [ ] Add film grain/noise overlay utility
- [ ] Add scanline/CRT effect utility

**Key CSS Rules:**
```css
/* Pixel-perfect rendering */
* {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* Remove font smoothing for pixel art compatibility */
body {
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

/* Panel base style */
.panel {
  background: var(--color-slate);
  border: 1px solid var(--color-gunmetal);
  border-top-color: var(--color-steel);
  border-left-color: var(--color-steel);
  /* 2px chamfered corners */
  clip-path: polygon(
    2px 0%, 100% 0%, 100% calc(100% - 2px), 
    calc(100% - 2px) 100%, 0% 100%, 0% 2px
  );
}
```

---

## Phase 2: Component System

### 2.1 Button Component
**Status:** ⏳ Pending

**Actions:**
- [ ] Create reusable `Button` component with military states
- [ ] Define states: idle, armed, active, disabled, cooling-down
- [ ] Remove rounded pills, use rectangular chunky buttons
- [ ] All caps text with Rajdhani font
- [ ] Mechanical feedback (subtle pulse for armed/active)

**Button States:**
```typescript
type ButtonState = 'idle' | 'armed' | 'active' | 'disabled' | 'cooling-down';

// Visual mapping:
// idle: Steel background, gunmetal border
// armed: Amber accent border, subtle pulse
// active: Phosphor green border, 1-2px glow
// disabled: Muted colors, no interaction
// cooling-down: Amber with progress indicator
```

**Implementation:**
- Create `app/components/ui/Button.tsx`
- Use functional color accents (amber for energy, green for ready, etc.)
- No hover glow unless it represents readiness

---

### 2.2 Panel Component
**Status:** ⏳ Pending

**Actions:**
- [ ] Create base `Panel` component
- [ ] Implement 2-tone border (dark outer, lighter inner)
- [ ] Add optional corner notches (military hardware look)
- [ ] Support system labels (SYS-01, NAV-02, etc.)
- [ ] Add optional rivet/bolted edge styling

**Panel Variants:**
```typescript
type PanelVariant = 'default' | 'command' | 'status' | 'tactical';

// Features:
// - Flat backgrounds (no gradients)
// - 1-2px inner strokes
// - Optional corner notches
// - System label support
// - Film grain overlay option
```

---

### 2.3 Typography Components
**Status:** ⏳ Pending

**Actions:**
- [ ] Create `Heading` component (all caps, Rajdhani)
- [ ] Create `Label` component (system labels, monospace)
- [ ] Create `Stat` component (numbers, JetBrains Mono)
- [ ] Create `Log` component (tactical logs, monospace)

**Typography Hierarchy:**
- Major controls: Rajdhani, all caps, 600-700 weight
- System labels: JetBrains Mono, uppercase, 500 weight
- Stats/numbers: JetBrains Mono, regular weight
- Body text: Rajdhani, regular weight

---

## Phase 3: Layout System

### 3.1 Main Layout Restructure
**Status:** ⏳ Pending

**Actions:**
- [ ] Remove centered hero layouts
- [ ] Implement asymmetric, left-anchored or bottom-anchored command bars
- [ ] Define layout zones (left: status, bottom: actions, right: targeting, corner: minimap)
- [ ] Remove floating glass cards
- [ ] Add heavy framing and segmented zones

**Layout Zones:**
```
┌─────────────────────────────────────────┐
│ Header (full width, top)                │
├──────────┬──────────────────┬───────────┤
│          │                  │           │
│ Ship     │   Game Board     │ Enemy     │
│ Status   │   / Map          │ Info      │
│ Systems  │                  │ Targeting │
│          │                  │           │
├──────────┴──────────────────┴───────────┤
│ Action Bar (full width, bottom)         │
└─────────────────────────────────────────┘
```

**Implementation:**
- Update `app/page.tsx` layout structure
- Create zone components: `StatusPanel`, `ActionBar`, `TargetingPanel`
- Use CSS Grid for asymmetric layout

---

### 3.2 Header Redesign
**Status:** ⏳ Pending

**Actions:**
- [ ] Remove gradient backgrounds (`from-slate-900 via-purple-900`)
- [ ] Remove cyan/purple/pink gradient text
- [ ] Use industrial typography (Rajdhani, all caps)
- [ ] Replace rounded badges with rectangular panels
- [ ] Remove glow effects
- [ ] Add system label styling (e.g., "SYS-HEADER-01")

**Current Issues:**
- Line 75: `bg-gradient-to-r from-slate-900 via-purple-900`
- Line 82: `bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400`
- Line 89: `border-amber-400` with `bg-black/30` (needs update)
- Multiple glow/shadow effects

---

### 3.3 Tab Navigation
**Status:** ⏳ Pending

**Actions:**
- [ ] Remove rounded corners (`rounded-lg`)
- [ ] Remove cyan glow effects
- [ ] Use rectangular, chunky buttons
- [ ] All caps text
- [ ] Functional color accents (cyan for active navigation, amber for selected)

**Current Issues:**
- Line 124: `rounded-lg border-2` → square corners
- Line 126: `border-cyan-300 text-cyan-300 bg-cyan-400/20 shadow-cyan-400/40` → remove glow
- Line 127: `hover:shadow-cyan-400/40` → remove hover glow

---

## Phase 4: Component Updates

### 4.1 ShipCard Component
**Status:** ⏳ Pending

**Actions:**
- [ ] Replace rounded cards with rectangular panels
- [ ] Add system label styling
- [ ] Update color scheme to industrial palette
- [ ] Remove decorative gradients
- [ ] Add mechanical states (idle, selected, active)

---

### 4.2 GameDisplay Component
**Status:** ⏳ Pending

**Actions:**
- [ ] Update HUD panels to industrial style
- [ ] Implement tactical grid with military styling
- [ ] Update ship status displays
- [ ] Add system labels (WPN-01, NAV-02, etc.)
- [ ] Remove all glow effects except functional feedback

---

### 4.3 ManageNavy Component
**Status:** ⏳ Pending

**Actions:**
- [ ] Update ship grid layout
- [ ] Replace card styling with panel components
- [ ] Update filter/sort controls to industrial buttons
- [ ] Add system labels where appropriate

---

### 4.4 Form Controls
**Status:** ⏳ Pending

**Actions:**
- [ ] Update input fields (rectangular, industrial)
- [ ] Update sliders (remove rounded thumbs, use rectangular)
- [ ] Update checkboxes/radios (square, mechanical)
- [ ] Update dropdowns (panel-style, no rounded corners)

**Slider Updates:**
- Remove `border-radius: 50%` (current line 33, 43)
- Use rectangular thumbs
- Remove glow effects (lines 37, 47, 55-56, 60-61)
- Use functional color (amber for energy, cyan for navigation)

---

## Phase 5: Effects & Feedback

### 5.1 Allowed Effects
**Status:** ⏳ Pending

**Actions:**
- [ ] Implement subtle pulse for: target lock, shield charging, weapon primed
- [ ] Add 1-2px glow outline only for: active targeting, critical hits
- [ ] Add scanline/CRT noise overlay (2-5% opacity)
- [ ] Add film grain texture overlay

**Implementation:**
```css
/* Subtle pulse (functional only) */
@keyframes pulse-functional {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.pulse-target-lock {
  animation: pulse-functional 1.5s ease-in-out infinite;
  outline: 1px solid var(--color-phosphor-green);
}

/* Scanline overlay */
.scanline-overlay {
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  pointer-events: none;
}
```

---

### 5.2 Remove Disallowed Effects
**Status:** ⏳ Pending

**Actions:**
- [ ] Remove all soft shadows (`shadow-lg`, `shadow-cyan-400/20`, etc.)
- [ ] Remove drop shadows
- [ ] Remove glass blur effects
- [ ] Remove glow on non-functional UI elements
- [ ] Remove particle sparkles
- [ ] Remove motion blur transitions

**Search & Replace Targets:**
- `shadow-*` classes → remove or replace with functional outlines
- `backdrop-blur` → remove
- `bg-*/20`, `bg-*/10` opacity overlays → remove unless functional
- `animate-pulse` → replace with functional pulse only

---

## Phase 6: Iconography

### 6.1 Icon System
**Status:** ⏳ Pending

**Actions:**
- [ ] Audit existing icons
- [ ] Replace decorative icons with monochrome, line/block icons
- [ ] Ensure pixel-perfect rendering
- [ ] Use functional colors only (no gradients)

**Icon Style:**
- Monochrome (white/gray on dark, or functional accent colors)
- Line or block style (no filled gradients)
- Pixel-perfect (no anti-aliasing)
- Military/industrial theme (crosshair, shield, reactor, thruster, target reticle, radar sweep)

---

## Phase 7: Microcopy & Labels

### 7.1 Text Updates
**Status:** ⏳ Pending

**Actions:**
- [ ] Update button labels to tactical tone
- [ ] Add system labels (SYS-01, NAV-02, WPN-03)
- [ ] Update microcopy to military style
- [ ] Use all caps for major controls

**Examples:**
- "TARGET LOCKED"
- "WEAPONS ARMED"
- "REACTOR ONLINE"
- "HULL CRITICAL"
- "END TURN"
- "EXECUTE"

---

## Phase 8: Testing & Refinement

### 8.1 Visual Audit
**Status:** ⏳ Pending

**Actions:**
- [ ] Review all pages for gradient removal
- [ ] Verify no purple/pink colors remain
- [ ] Check all rounded corners are removed
- [ ] Verify pixel-perfect alignment
- [ ] Test with pixel art ships
- [ ] Verify functional color usage only

---

### 8.2 Component Testing
**Status:** ⏳ Pending

**Actions:**
- [ ] Test button states (idle, armed, active, disabled, cooling-down)
- [ ] Test panel variations
- [ ] Test layout responsiveness
- [ ] Verify typography hierarchy
- [ ] Test color contrast (accessibility)

---

## Implementation Order

### Week 1: Foundation
1. Typography system (1.1)
2. Color token system (1.2)
3. Base styles & reset (1.3)

### Week 2: Core Components
4. Button component (2.1)
5. Panel component (2.2)
6. Typography components (2.3)

### Week 3: Layout
7. Main layout restructure (3.1)
8. Header redesign (3.2)
9. Tab navigation (3.3)

### Week 4: Component Updates
10. ShipCard (4.1)
11. GameDisplay (4.2)
12. ManageNavy (4.3)
13. Form controls (4.4)

### Week 5: Polish
14. Effects & feedback (5.1, 5.2)
15. Iconography (6.1)
16. Microcopy (7.1)
17. Testing & refinement (8.1, 8.2)

---

## Files to Modify

### High Priority
- `app/globals.css` - Complete overhaul
- `app/layout.tsx` - Font loading
- `app/page.tsx` - Main layout, tabs
- `app/components/Header.tsx` - Header redesign

### Medium Priority
- `app/components/Button.tsx` (new) - Button component
- `app/components/ui/Panel.tsx` (new) - Panel component
- `app/components/ShipCard.tsx` - Card updates
- `app/components/ManageNavy.tsx` - Layout updates
- `app/components/GameDisplay.tsx` - HUD updates

### Lower Priority
- All other component files (systematic update)
- Form components
- Modal components
- Toast notifications (react-hot-toast config)

---

## Success Criteria

✅ **Visual:**
- No gradients on UI panels
- No purple or pink colors
- No rounded corners (except 2px chamfer)
- No soft shadows or decorative glows
- Pixel-perfect alignment
- Industrial, military aesthetic

✅ **Functional:**
- All buttons have mechanical states
- Functional colors used appropriately
- System labels present where needed
- Tactical microcopy throughout
- Clear visual hierarchy

✅ **Technical:**
- CSS variables for all colors
- Reusable component system
- Tailwind v4 theme configured
- Pixel-perfect rendering
- Performance maintained

---

## Notes

- **Pixel Art Compatibility:** All UI must align to pixel grid, no subpixel movement
- **No AI-Generated Look:** Avoid soft futurism, gradients, rounded SaaS aesthetics
- **Functional Over Pretty:** Every visual element must serve a purpose
- **Battlestar Galactica Reference:** Keep naval war room, submarine console aesthetic in mind
- **Faction Baseline:** This is the visual foundation for all future factions

---

## Next Steps

1. **Lock color tokens** - Finalize exact hex values and create CSS variables
2. **Define component specs** - Button heights, border widths, panel padding
3. **Sketch HUD layout** - Concrete Warpflow match HUD consistent with faction theme
4. **Begin Phase 1** - Start with typography and color system

---

**Last Updated:** 2026-01-24
**Status:** Planning Complete - Ready for Implementation
