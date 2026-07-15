"use client";

import React from "react";

interface TournamentOptionCardProps {
  checked: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
}

// Reusable option card — same visual language as the Lobbies create form.
export const TournamentOptionCard: React.FC<TournamentOptionCardProps> = ({
  checked,
  onSelect,
  title,
  sub,
}) => (
  <label
    className={`flex min-w-0 cursor-pointer items-start gap-3 border p-3 transition-colors has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-cyan ${
      checked ? "border-cyan bg-cyan/5" : "border-gunmetal bg-black/40 hover:border-steel"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onSelect}
      className="mt-0.5 h-4 w-4 shrink-0 accent-cyan"
    />
    <span>
      <span className={`block font-mono font-bold ${checked ? "text-cyan" : "text-text-secondary"}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-text-muted">{sub}</span>
    </span>
  </label>
);
