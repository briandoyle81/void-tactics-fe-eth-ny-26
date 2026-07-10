"use client";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) —
// prev/next + page count, pure number props.
interface NavyPaginationProps {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function NavyPagination({ page, pageCount, onPrev, onNext }: NavyPaginationProps) {
  const atStart = page === 0;
  const atEnd = page + 1 >= pageCount;
  return (
    <>
      <button
        onClick={onPrev}
        disabled={atStart}
        className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          borderColor: atStart ? "var(--color-gunmetal)" : "var(--color-cyan)",
          color: atStart ? "var(--color-text-secondary)" : "var(--color-cyan)",
          backgroundColor: "var(--color-steel)",
          borderRadius: 0,
          opacity: atStart ? 0.4 : 1,
        }}
      >
        &lt; PREV
      </button>
      <span
        className="text-sm uppercase tracking-wider"
        style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace", color: "var(--color-text-secondary)" }}
      >
        {page + 1} / {pageCount}
      </span>
      <button
        onClick={onNext}
        disabled={atEnd}
        className="px-3 py-1 border-2 border-solid uppercase font-semibold tracking-wider text-sm transition-colors duration-150"
        style={{
          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          borderColor: atEnd ? "var(--color-gunmetal)" : "var(--color-cyan)",
          color: atEnd ? "var(--color-text-secondary)" : "var(--color-cyan)",
          backgroundColor: "var(--color-steel)",
          borderRadius: 0,
          opacity: atEnd ? 0.4 : 1,
        }}
      >
        NEXT &gt;
      </button>
    </>
  );
}
