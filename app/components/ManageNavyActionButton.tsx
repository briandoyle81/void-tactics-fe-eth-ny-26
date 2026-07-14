"use client";

import React from "react";

export type ManageNavyActionVariant = "green" | "cyan" | "red" | "amber" | "muted";

const VARIANT_CLASSES: Record<ManageNavyActionVariant, string> = {
  green: "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10",
  cyan: "border-cyan text-cyan hover:border-cyan/80 hover:text-cyan/80 hover:bg-cyan/10",
  red: "border-warning-red text-warning-red hover:bg-warning-red/10",
  amber: "border-amber text-amber hover:bg-amber/10",
  muted: "border-gunmetal text-text-muted",
};

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// bulk-action button chrome (Construct All, Buy New Ships, Claim Free
// Ships, Recycle Selected), ported verbatim from ManageNavy.tsx. Web3's
// contract-backed buttons (`ShipActionButton`, `FreeShipClaimButton`,
// `TransactionButton`) manage their own pending state internally and take
// `className` as a raw string, so they use `manageNavyActionButtonClassName`
// directly rather than this component; web2's plain REST-backed buttons
// render this component directly.
export function manageNavyActionButtonClassName(
  variant: ManageNavyActionVariant,
): string {
  return `w-full justify-center px-6 py-3 rounded-none border-2 ${VARIANT_CLASSES[variant]} font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto`;
}

interface ManageNavyActionButtonProps {
  variant: ManageNavyActionVariant;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ManageNavyActionButton({
  variant,
  onClick,
  disabled = false,
  children,
}: ManageNavyActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={manageNavyActionButtonClassName(variant)}
    >
      {children}
    </button>
  );
}
