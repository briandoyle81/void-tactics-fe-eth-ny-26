"use client";

import { useEffect } from "react";

// Primary navigation for the game client: shoulder tabs under the HUD on
// desktop (Q/E cycle them, like a controller's shoulder buttons) and a
// bottom tab bar on phones.

export type GameSection = "Play" | "Fleet" | "Store" | "Battles" | "Profile";

export const GAME_SECTIONS: readonly GameSection[] = ["Play", "Fleet", "Store", "Battles", "Profile"];

const SECTION_ICONS: Record<GameSection, string> = {
  Play: "◆",
  Fleet: "▲",
  Store: "◈",
  Battles: "⚔",
  Profile: "●",
};

const DISPLAY_FONT = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function GameNav({
  active,
  onSelect,
  battlesAlert,
}: {
  active: GameSection;
  onSelect: (section: GameSection) => void;
  /** Shows a dot on Battles (it's your turn somewhere). */
  battlesAlert: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      // A modal is open (checkout, confirmations, editors): switching the
      // section behind it would unmount the screen it belongs to.
      if (document.querySelector('[aria-modal="true"], [role="alertdialog"]')) return;
      const key = event.key.toLowerCase();
      if (key !== "q" && key !== "e") return;
      const index = GAME_SECTIONS.indexOf(active);
      const step = key === "e" ? 1 : -1;
      onSelect(GAME_SECTIONS[(index + step + GAME_SECTIONS.length) % GAME_SECTIONS.length]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onSelect]);

  return (
    <>
      <nav
        aria-label="Game sections"
        className="hidden items-stretch justify-center gap-1 border-b px-4 py-2 md:flex"
        style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-near-black)" }}
      >
        <kbd className="self-center border px-1.5 font-mono text-[11px] text-text-muted" style={{ borderColor: "var(--color-gunmetal)" }} title="Previous section">
          Q
        </kbd>
        {GAME_SECTIONS.map((section) => {
          const isActive = section === active;
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSelect(section)}
              aria-current={isActive ? "page" : undefined}
              className={`relative border-b-2 px-6 py-1.5 text-lg font-bold uppercase tracking-[0.12em] transition-colors duration-150 ${
                isActive ? "border-cyan text-cyan" : "border-transparent text-text-secondary hover:text-cyan"
              }`}
              style={DISPLAY_FONT}
            >
              {section}
              {section === "Battles" && battlesAlert && (
                <span className="absolute right-2 top-1.5 h-2 w-2 bg-phosphor-green" aria-label="Your turn" />
              )}
            </button>
          );
        })}
        <kbd className="self-center border px-1.5 font-mono text-[11px] text-text-muted" style={{ borderColor: "var(--color-gunmetal)" }} title="Next section">
          E
        </kbd>
      </nav>

      <nav
        aria-label="Game sections"
        className="fixed inset-x-0 bottom-0 z-[250] grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ borderColor: "var(--color-gunmetal)", backgroundColor: "var(--color-slate)" }}
      >
        {GAME_SECTIONS.map((section) => {
          const isActive = section === active;
          return (
            <button
              key={section}
              type="button"
              onClick={() => onSelect(section)}
              aria-current={isActive ? "page" : undefined}
              className={`relative grid justify-items-center gap-0.5 pb-2.5 pt-2 text-[11px] uppercase tracking-wider ${
                isActive ? "text-cyan" : "text-text-muted"
              }`}
              style={DISPLAY_FONT}
            >
              <span className="text-lg leading-none" aria-hidden>
                {SECTION_ICONS[section]}
              </span>
              {section}
              {section === "Battles" && battlesAlert && (
                <span className="absolute right-[30%] top-1.5 h-2 w-2 bg-phosphor-green" aria-label="Your turn" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
