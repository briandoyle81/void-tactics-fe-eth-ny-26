import React from "react";

// Hand-drawn inline SVG icons for the equipment row labels (Weapon/
// Armor-Shields/Special) — no icon library dependency for three glyphs.
// All use `currentColor` so they inherit each row's accent/opacity classes
// the same way the text labels they replaced did.

interface EquipmentIconProps {
  className?: string;
}

/** Targeting reticle — stands in for "Weapon". */
export const WeaponIcon: React.FC<EquipmentIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <path
      d="M12 1.5V4.5M12 19.5V22.5M1.5 12H4.5M19.5 12H22.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/** Shield silhouette — stands in for "Armor"/"Shields". */
export const DefenseIcon: React.FC<EquipmentIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 2.5L19.5 5.5V11C19.5 16 16.5 19.8 12 21.5C7.5 19.8 4.5 16 4.5 11V5.5L12 2.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

/** Four-point sparkle burst — stands in for "Special" (innate ability). */
export const SpecialIcon: React.FC<EquipmentIconProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
      fill="currentColor"
    />
  </svg>
);
