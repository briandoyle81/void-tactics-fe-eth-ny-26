"use client";

import React, { useRef, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUtcBalance } from "../hooks/useUtcBalance";
import { useCurrentUser } from "../hooks/useCurrentUser";

const PACKAGES = [
  { id: 0, utcAmount: 500,  priceUsdCents: 499,  label: "500 UTC" },
  { id: 1, utcAmount: 1200, priceUsdCents: 999,  label: "1,200 UTC" },
  { id: 2, utcAmount: 2500, priceUsdCents: 1999, label: "2,500 UTC" },
] as const;

export function HeaderUtcWidget() {
  const { isLoggedIn } = useCurrentUser();
  const { balance, refetch } = useUtcBalance();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!isLoggedIn) return null;

  const handlePurchase = async (pkgId: number) => {
    setPending(pkgId);
    try {
      const res = await fetch("/api/user/utc/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkgId }),
      });
      if (!res.ok) throw new Error("Purchase failed");
      const data = await res.json() as { added: number };
      toast.success(`+${data.added.toLocaleString()} UTC added`);
      refetch();
      setOpen(false);
    } catch {
      toast.error("UTC purchase failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 border border-solid px-3 transition-colors duration-150"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--color-amber)",
          backgroundColor: "var(--color-near-black)",
          borderColor: "rgba(245, 158, 11, 0.6)",
          borderRadius: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-near-black)"; }}
      >
        <span style={{ color: "var(--color-amber)", opacity: 0.7 }}>◈</span>
        <span>{balance.toLocaleString()} UTC</span>
        <span className="text-[9px] opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+4px)] z-[130] w-56 border border-solid"
          style={{
            backgroundColor: "var(--color-near-black)",
            borderColor: "rgba(245, 158, 11, 0.6)",
          }}
        >
          <div
            className="border-b px-3 py-2 text-[10px] uppercase tracking-wider"
            style={{
              borderColor: "rgba(245, 158, 11, 0.3)",
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: "var(--color-text-muted)",
            }}
          >
            Buy UTC
          </div>

          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={pending !== null}
              onClick={() => handlePurchase(pkg.id)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors duration-100"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: pending === pkg.id ? "var(--color-text-muted)" : "var(--color-amber)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => { if (pending === null) e.currentTarget.style.backgroundColor = "var(--color-slate)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span>{pending === pkg.id ? "..." : pkg.label}</span>
              <span
                className="text-[10px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                ${(pkg.priceUsdCents / 100).toFixed(2)}
              </span>
            </button>
          ))}

          <div
            className="border-t px-3 py-1.5 text-[9px] uppercase tracking-wider"
            style={{
              borderColor: "rgba(245, 158, 11, 0.3)",
              fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
              color: "var(--color-text-muted)",
            }}
          >
            Used to purchase ships in-game
          </div>
        </div>
      )}
    </div>
  );
}
