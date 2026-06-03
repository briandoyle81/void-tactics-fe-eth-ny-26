# Design Tokens - Faction 01: Industrial Military Human

Quick reference for color tokens, typography, spacing, and component specifications.

---

## Color Tokens

### Base Colors (Dominant)

```css
--color-near-black: #0c1117; /* Primary backgrounds */
--color-slate: #1a2430; /* Panels, containers */
--color-steel: #223041; /* HUD containers, elevated panels */
--color-gunmetal: #2b2f36; /* Command bars, borders */
```

### Accent Colors (Functional Only)

```css
--color-phosphor-green: #6bff8f; /* Targeting, success, locked */
--color-amber: #ffb84d; /* Energy, readiness, cooldown */
--color-cyan: #56d6ff; /* Navigation, movement, sensors */
--color-warning-red: #ff4d4d; /* Damage, danger, critical */
```

### Text Colors

```css
--color-text-primary: #e2e8f0; /* Main text on dark */
--color-text-secondary: #94a3b8; /* Secondary text */
--color-text-muted: #64748b; /* Muted/disabled text */
```

### Border Colors

```css
--color-border-outer: #0c1117; /* Dark outer stroke */
--color-border-inner: #223041; /* Lighter inner stroke */
--color-border-accent: var(--color-cyan); /* Active borders */
```

---

## Typography

### Font Families

```css
--font-primary: "Rajdhani", "Arial Black", sans-serif;
--font-mono: "JetBrains Mono", "Courier New", monospace;
```

### Font Weights

```css
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Font Sizes (Pixel-Perfect)

```css
--font-size-xs: 10px; /* Small labels */
--font-size-sm: 12px; /* Secondary text */
--font-size-base: 14px; /* Body text */
--font-size-lg: 16px; /* Buttons, controls */
--font-size-xl: 20px; /* Headings */
--font-size-2xl: 24px; /* Major headings */
--font-size-3xl: 32px; /* Hero text */
```

### Typography Rules

- **UI Labels & Buttons:** Rajdhani, all caps, 600-700 weight
- **System Labels:** JetBrains Mono, uppercase, 500 weight
- **Stats/Numbers:** JetBrains Mono, regular weight
- **Body Text:** Rajdhani, regular weight, sentence case

---

## Spacing System

### Base Unit: 4px (pixel grid alignment)

```css
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
```

---

## Component Specifications

### Button

```css
/* Dimensions */
--button-height-sm: 32px;
--button-height-md: 40px;
--button-height-lg: 48px;
--button-padding-x: 16px;
--button-padding-y: 8px;

/* Typography */
--button-font: var(--font-primary);
--button-font-size: 16px;
--button-font-weight: 600;
--button-text-transform: uppercase;
--button-letter-spacing: 0.05em;

/* Borders */
--button-border-width: 2px;
--button-border-radius: 0px; /* Square */

/* States */
--button-idle-bg: var(--color-steel);
--button-idle-border: var(--color-gunmetal);
--button-idle-text: var(--color-text-primary);

--button-armed-bg: var(--color-steel);
--button-armed-border: var(--color-amber);
--button-armed-text: var(--color-amber);

--button-active-bg: var(--color-steel);
--button-active-border: var(--color-phosphor-green);
--button-active-text: var(--color-phosphor-green);
--button-active-glow: 0 0 2px var(--color-phosphor-green);

--button-disabled-bg: var(--color-slate);
--button-disabled-border: var(--color-gunmetal);
--button-disabled-text: var(--color-text-muted);
```

### Panel

```css
/* Dimensions */
--panel-padding: 16px;
--panel-padding-sm: 12px;
--panel-padding-lg: 24px;

/* Background */
--panel-bg: var(--color-slate);
--panel-bg-elevated: var(--color-steel);

/* Borders */
--panel-border-width-outer: 1px;
--panel-border-width-inner: 1px;
--panel-border-color-outer: var(--color-gunmetal);
--panel-border-color-inner: var(--color-steel);
--panel-border-radius: 0px; /* Square or 2px chamfer */

/* Corner Notch (optional) */
--panel-notch-size: 4px;
```

### Input Field

```css
/* Dimensions */
--input-height: 40px;
--input-padding-x: 12px;
--input-padding-y: 8px;

/* Typography */
--input-font: var(--font-mono);
--input-font-size: 14px;

/* Borders */
--input-border-width: 2px;
--input-border-color: var(--color-gunmetal);
--input-border-color-focus: var(--color-cyan);
--input-border-radius: 0px;

/* Background */
--input-bg: var(--color-near-black);
--input-bg-focus: var(--color-slate);
```

### System Label

```css
/* Typography */
--label-font: var(--font-mono);
--label-font-size: 12px;
--label-font-weight: 500;
--label-text-transform: uppercase;
--label-letter-spacing: 0.1em;

/* Colors */
--label-text: var(--color-text-secondary);
--label-bg: transparent;
--label-border: 1px solid var(--color-gunmetal);
--label-padding: 4px 8px;
```

---

## Effects

### Pulse (Functional Only)

```css
@keyframes pulse-functional {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

--pulse-duration: 1.5s;
--pulse-timing: ease-in-out;
```

### Glow (Functional Only)

```css
--glow-width: 1px;
--glow-width-active: 2px;
--glow-color-targeting: var(--color-phosphor-green);
--glow-color-critical: var(--color-warning-red);
```

### Scanline Overlay

```css
--scanline-opacity: 0.03;
--scanline-line-height: 2px;
--scanline-color: rgba(0, 0, 0, var(--scanline-opacity));
```

### Film Grain

```css
--grain-opacity: 0.02;
--grain-size: 1px;
```

---

## Layout Zones

### Grid System

```css
--layout-zone-status-width: 280px; /* Left panel */
--layout-zone-main-min-width: 600px; /* Center game area */
--layout-zone-targeting-width: 240px; /* Right panel */
--layout-action-bar-height: 80px; /* Bottom bar */
--layout-header-height: 64px; /* Top header */
```

### Spacing Between Zones

```css
--zone-gap: 16px;
--zone-padding: 16px;
```

---

## Icon Specifications

### Size

```css
--icon-size-sm: 16px;
--icon-size-md: 24px;
--icon-size-lg: 32px;
```

### Style

- Monochrome (white/gray or functional accent)
- Line or block style
- Pixel-perfect (no anti-aliasing)
- 1-2px stroke width

---

## Microcopy Examples

### Button Labels

- "TARGET LOCKED"
- "WEAPONS ARMED"
- "REACTOR ONLINE"
- "HULL CRITICAL"
- "END TURN"
- "EXECUTE"
- "ABORT"
- "CONFIRM"

### System Labels

- "SYS-01" (System 01)
- "NAV-02" (Navigation 02)
- "WPN-03" (Weapon 03)
- "SHL-04" (Shield 04)
- "RCT-05" (Reactor 05)

### Status Messages

- "TARGET LOCKED"
- "SHIELDS CHARGING"
- "WEAPON PRIMED"
- "SYSTEM OFFLINE"
- "HULL INTEGRITY: 45%"
- "ENERGY: 78/100"

---

## Tailwind v4 Configuration

### Color Mapping

```javascript
// In globals.css @theme inline block
--color-near-black: #0c1117;
--color-slate: #1a2430;
--color-steel: #223041;
--color-gunmetal: #2b2f36;
--color-phosphor-green: #6bff8f;
--color-amber: #ffb84d;
--color-cyan: #56d6ff;
--color-warning-red: #ff4d4d;
```

### Usage in Tailwind

```html
<!-- Backgrounds -->
<div class="bg-near-black">...</div>
<div class="bg-slate">...</div>
<div class="bg-steel">...</div>

<!-- Accents (functional only) -->
<div class="border-phosphor-green">Targeting</div>
<div class="border-amber">Energy</div>
<div class="border-cyan">Navigation</div>
<div class="border-warning-red">Critical</div>

<!-- Text -->
<p class="text-text-primary">Main text</p>
<p class="text-text-secondary">Secondary</p>
```

---

## Pixel-Perfect Rules

### Rendering

```css
* {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

body {
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}
```

### Alignment

- All dimensions must be multiples of 4px (base unit)
- Borders must be even pixel thickness (1px, 2px)
- No fractional values (0.5px, 1.5px, etc.)
- No subpixel positioning

---

## Do Not Use

❌ **Colors:**

- Purple (#9333ea, #a855f7, etc.)
- Pink (#ec4899, #f472b6, etc.)
- Blue gradients
- Neon Web3 colors

❌ **Effects:**

- Soft shadows (`box-shadow: 0 4px 6px rgba(...)`)
- Drop shadows
- Glass blur (`backdrop-blur`)
- Decorative glows
- Particle effects
- Motion blur

❌ **Shapes:**

- Rounded corners > 2px
- Rounded pills
- Circular buttons (except functional indicators)

❌ **Typography:**

- Thin fonts (100-300 weight)
- Rounded fonts (Inter, SF Pro, DM Sans, Poppins)
- Playful/geometric fonts
- Lowercase for major controls

---

**Last Updated:** 2026-01-24
