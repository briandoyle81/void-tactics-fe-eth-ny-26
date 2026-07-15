"use client";

import React from "react";

interface WinLossBadgeProps {
  wins: number;
  losses: number;
}

export const WinLossBadge: React.FC<WinLossBadgeProps> = ({ wins, losses }) => (
  <div
    className="flex items-center gap-2 text-base font-bold tabular-nums"
    style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
  >
    <span className="text-phosphor-green">{wins}W</span>
    <span
      className="text-[10px] font-normal"
      style={{ color: "color-mix(in srgb, var(--color-text-muted) 40%, transparent)" }}
    >
      /
    </span>
    <span className="text-warning-red">{losses}L</span>
  </div>
);
