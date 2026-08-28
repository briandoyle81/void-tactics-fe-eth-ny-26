"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { renderShip } from "../utils/shipRenderer";
import type { ShipVisual } from "../types/shipVisual";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { Web2Ship } from "../types/web2Ship";

// Web2-mode counterpart to `ShipConstructor.tsx` — but customize-only.
// Web3's EXPLORE/"create" mode is a local rendering sandbox with no
// contract call and no persisted effect at all (confirmed: no
// TransactionButton is ever wired for it), so it isn't part of the drone
// economy this component's REAL job is to give web2 parity for; only the
// CUSTOMIZE flow (DroneYard.modifyShip's web2 equivalent,
// `/api/ships/[id]/customize`) has an actual gap to close. Cost preview
// comes from the same route's GET handler instead of an on-chain
// `calculateCostToModify` read, and there's no UTC-approval step since web2
// balances are debited server-side, not via ERC20 allowance.

interface CostPreview {
  cost: number;
  newMods: number;
  totalModsAfter: number;
}

const ShipConstructorWeb2: React.FC = () => {
  const { ships, isLoading: isLoadingShips, refetch } = useOwnedShipsWeb2();
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [originalShip, setOriginalShip] = useState<Web2Ship | null>(null);

  const [mainWeapon, setMainWeapon] = useState(0);
  const [armor, setArmor] = useState(0);
  const [shields, setShields] = useState(0);
  const [special, setSpecial] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [hull, setHull] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [shiny, setShiny] = useState(false);

  const [costPreview, setCostPreview] = useState<CostPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedShipId == null || !ships) {
      setOriginalShip(null);
      return;
    }
    const ship = ships.find((s) => s.id === selectedShipId && s.shipData.constructed);
    if (!ship) {
      setOriginalShip(null);
      return;
    }
    setOriginalShip(ship);
    setMainWeapon(ship.equipment.mainWeapon);
    setArmor(ship.equipment.armor);
    setShields(ship.equipment.shields);
    setSpecial(ship.equipment.special);
    setAccuracy(ship.traits.accuracy);
    setHull(ship.traits.hull);
    setSpeed(ship.traits.speed);
    setShiny(ship.shipData.shiny);
    setError(null);
  }, [selectedShipId, ships]);

  const mockShipVisual: ShipVisual = useMemo(
    () => ({
      equipment: { mainWeapon, armor, shields, special },
      traits: {
        colors: originalShip?.traits.colors ?? { h1: 220, s1: 50, l1: 50, h2: 220, s2: 50, l2: 50 },
        variant: originalShip?.traits.variant ?? 0,
        accuracy,
        hull,
        speed,
      },
      shipData: {
        shipsDestroyed: originalShip?.shipData.shipsDestroyed ?? 0,
        shiny,
        constructed: true,
        timestampDestroyed: 0,
      },
    }),
    [mainWeapon, armor, shields, special, accuracy, hull, speed, shiny, originalShip],
  );

  const shipImageDataUrl = useMemo(() => {
    try {
      return renderShip(mockShipVisual);
    } catch (e) {
      console.error("Error rendering ship:", e);
      return null;
    }
  }, [mockShipVisual]);

  const changes = useMemo(() => {
    if (!originalShip) return [];
    const list: string[] = [];
    if (originalShip.equipment.mainWeapon !== mainWeapon) list.push(`Main Weapon: ${originalShip.equipment.mainWeapon} → ${mainWeapon}`);
    if (originalShip.equipment.armor !== armor) list.push(`Armor: ${originalShip.equipment.armor} → ${armor}`);
    if (originalShip.equipment.shields !== shields) list.push(`Shields: ${originalShip.equipment.shields} → ${shields}`);
    if (originalShip.equipment.special !== special) list.push(`Special: ${originalShip.equipment.special} → ${special}`);
    if (originalShip.traits.accuracy !== accuracy) list.push(`Accuracy: ${originalShip.traits.accuracy} → ${accuracy}`);
    if (originalShip.traits.hull !== hull) list.push(`Hull: ${originalShip.traits.hull} → ${hull}`);
    if (originalShip.traits.speed !== speed) list.push(`Speed: ${originalShip.traits.speed} → ${speed}`);
    if (originalShip.shipData.shiny !== shiny) list.push(`Shiny: ${originalShip.shipData.shiny ? "Yes" : "No"} → ${shiny ? "Yes" : "No"}`);
    return list;
  }, [originalShip, mainWeapon, armor, shields, special, accuracy, hull, speed, shiny]);

  // Cost preview — mirrors web3's on-chain calculateCostToModify read, but
  // as a plain GET so it never mutates anything.
  useEffect(() => {
    if (selectedShipId == null || changes.length === 0) {
      setCostPreview(null);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({
      mainWeapon: String(mainWeapon),
      armor: String(armor),
      shields: String(shields),
      special: String(special),
      accuracy: String(accuracy),
      hull: String(hull),
      speed: String(speed),
      shiny: String(shiny),
    });
    apiFetch<CostPreview>(`/api/ships/${selectedShipId}/customize?${q.toString()}`)
      .then((res) => {
        if (!cancelled) setCostPreview(res);
      })
      .catch(() => {
        if (!cancelled) setCostPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedShipId, mainWeapon, armor, shields, special, accuracy, hull, speed, shiny, changes.length]);

  const handleCustomize = async () => {
    if (selectedShipId == null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiMutate(`/api/ships/${selectedShipId}/customize`, "POST", {
        equipment: { mainWeapon, armor, shields, special },
        traits: { accuracy, hull, speed },
        shiny,
      });
      toast.success("Ship customized successfully!");
      await refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Customization failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const controlsDisabled = !selectedShipId;
  const shipInFleet = originalShip?.shipData.inFleet ?? false;

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="border border-cyan/30 bg-near-black p-3 md:p-6" style={{ borderRadius: 0 }}>
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <h2 className="text-lg font-mono font-bold tracking-wider text-amber">CUSTOMIZE</h2>
        </div>

        <div className="mb-4 border border-gunmetal bg-steel p-3 md:mb-6 md:p-4" style={{ borderRadius: 0 }}>
          <label className="block text-sm font-bold text-cyan mb-2 font-mono">
            SELECT SHIP TO CUSTOMIZE:
          </label>
          <select
            value={selectedShipId?.toString() ?? ""}
            onChange={(e) => setSelectedShipId(e.target.value ? Number(e.target.value) : null)}
            disabled={isLoadingShips}
            className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan font-mono"
            style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
          >
            <option value="">-- Select a ship --</option>
            {ships
              .filter((ship) => ship.shipData.constructed)
              .map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.name} (ID: {ship.id})
                </option>
              ))}
          </select>
        </div>

        {controlsDisabled && (
          <div className="mb-3 flex items-center gap-2 text-sm font-mono text-amber">
            <span>Select a constructed ship to enable controls.</span>
            <div className="relative inline-block">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-5 h-5 flex items-center justify-center border text-cyan hover:bg-cyan/10 transition-colors font-bold text-xs"
                style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                aria-label="Ship modification help"
              >
                ?
              </button>
              {showTooltip && (
                <div
                  className="absolute left-0 top-full z-50 mt-2 max-h-[80vh] w-[min(700px,92vw)] overflow-y-auto border-2 bg-near-black p-3 text-sm font-mono text-cyan md:w-[700px] md:p-4"
                  style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                >
                  <div className="space-y-2">
                    <div className="font-bold text-cyan mb-3 text-center">SHIP MODIFICATION</div>
                    <p className="font-bold text-amber">COST:</p>
                    <p>Cost doubles per total modification (equipment/trait changes stack; toggling shiny costs 3 at once) — same formula as web3&apos;s DroneYard.</p>
                    <p className="mt-3 font-bold text-amber">RESTRICTIONS:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                      <li>Ship must be constructed</li>
                      <li>Ship must not be in a fleet</li>
                      <li>Only ship owner can modify</li>
                      <li>Armor and Shields cannot both be set (one must be None)</li>
                      <li>Trait values must be 0, 1, or 2</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {originalShip && shipInFleet && (
          <div className="mb-4 border-2 border-warning-red p-3 text-sm font-mono text-warning-red" style={{ borderRadius: 0 }}>
            This ship is in a fleet — remove it from any fleet before customizing.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className={`space-y-6 ${controlsDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="border border-gunmetal bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">EQUIPMENT</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">Main Weapon</label>
                  <select
                    value={mainWeapon}
                    onChange={(e) => setMainWeapon(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                    style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                  >
                    <option value={0}>Laser</option>
                    <option value={1}>Railgun</option>
                    <option value={2}>Missile</option>
                    <option value={3}>Plasma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">Defense Type</label>
                  <div className="mb-3 flex flex-wrap gap-3 sm:gap-4">
                    <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={armor === 0 && shields === 0}
                        onChange={() => {
                          setArmor(0);
                          setShields(0);
                        }}
                        className="w-4 h-4 text-cyan bg-black/60 border-cyan focus:ring-cyan focus:ring-2"
                      />
                      <span>None</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={armor > 0 && shields === 0}
                        onChange={() => {
                          if (armor === 0) setArmor(1);
                          setShields(0);
                        }}
                        className="w-4 h-4 text-cyan bg-black/60 border-cyan focus:ring-cyan focus:ring-2"
                      />
                      <span>Armor</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                      <input
                        type="radio"
                        name="defenseType"
                        checked={shields > 0 && armor === 0}
                        onChange={() => {
                          if (shields === 0) setShields(1);
                          setArmor(0);
                        }}
                        className="w-4 h-4 text-cyan bg-black/60 border-cyan focus:ring-cyan focus:ring-2"
                      />
                      <span>Shields</span>
                    </label>
                  </div>
                  {armor > 0 && (
                    <div>
                      <label className="block text-xs text-cyan mb-1">Armor Level</label>
                      <select
                        value={armor}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setArmor(v);
                          if (v > 0) setShields(0);
                        }}
                        className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                        style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                      >
                        <option value={1}>Light</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Heavy</option>
                      </select>
                    </div>
                  )}
                  {shields > 0 && (
                    <div>
                      <label className="block text-xs text-cyan mb-1">Shield Level</label>
                      <select
                        value={shields}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setShields(v);
                          if (v > 0) setArmor(0);
                        }}
                        className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                        style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                      >
                        <option value={1}>Basic</option>
                        <option value={2}>Enhanced</option>
                        <option value={3}>Advanced</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">Special</label>
                  <select
                    value={special}
                    onChange={(e) => setSpecial(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                    style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                  >
                    <option value={0}>None</option>
                    <option value={1}>EMP</option>
                    <option value={2}>Repair</option>
                    <option value={3}>Flak</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border border-gunmetal bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">TRAITS</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">Accuracy: {accuracy}</label>
                  <input type="range" min="0" max="2" value={accuracy} onChange={(e) => setAccuracy(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">Hull: {hull}</label>
                  <input type="range" min="0" max="2" value={hull} onChange={(e) => setHull(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">Speed: {speed}</label>
                  <input type="range" min="0" max="2" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">Variant: {originalShip?.traits.variant ?? 0}</label>
                  <input
                    type="number"
                    value={originalShip?.traits.variant ?? 0}
                    disabled
                    className="w-full px-3 py-2 bg-near-black border text-cyan opacity-50 cursor-not-allowed"
                    style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                  />
                  <p className="mt-1 text-[10px] text-text-muted">Variant is preserved from the original ship.</p>
                </div>
              </div>
            </div>

            <div className="border border-gunmetal bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">COLORS (Preserved)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">Hue 1: {originalShip?.traits.colors.h1 ?? 0}</label>
                  <input type="range" min="0" max="360" value={originalShip?.traits.colors.h1 ?? 0} disabled className="w-full opacity-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">Saturation 1: {originalShip?.traits.colors.s1 ?? 0}</label>
                  <input type="range" min="0" max="100" value={originalShip?.traits.colors.s1 ?? 0} disabled className="w-full opacity-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">Lightness 1: {originalShip?.traits.colors.l1 ?? 0}</label>
                  <input type="range" min="0" max="100" value={originalShip?.traits.colors.l1 ?? 0} disabled className="w-full opacity-50 cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="border border-gunmetal bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">SHIP DATA</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">Ship Name</label>
                  <input
                    type="text"
                    value={originalShip?.name ?? ""}
                    disabled
                    className="w-full px-3 py-2 bg-near-black border text-cyan opacity-50 cursor-not-allowed font-mono"
                    style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shiny}
                    onChange={(e) => setShiny(e.target.checked)}
                    className="w-4 h-4 text-cyan bg-black/60 border-cyan focus:ring-cyan focus:ring-2"
                    style={{ borderRadius: 0 }}
                  />
                  <span>Shiny</span>
                </label>
              </div>
            </div>

            {selectedShipId != null && originalShip && !shipInFleet && (
              <div className="border border-amber/50 bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
                <button
                  type="button"
                  onClick={() => void handleCustomize()}
                  disabled={isSubmitting || changes.length === 0}
                  className="w-full px-6 py-3 rounded-none border-2 border-amber text-amber hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "[CUSTOMIZING SHIP...]" : "[CUSTOMIZE SHIP]"}
                </button>
                {error && <p className="mt-2 text-xs text-warning-red font-mono break-words">{error}</p>}
              </div>
            )}
          </div>

          <div className="border border-gunmetal bg-steel p-3 md:p-4" style={{ borderRadius: 0 }}>
            <h3 className="text-lg font-bold text-cyan mb-4 font-mono">PREVIEW</h3>
            <div className="flex min-h-[260px] flex-col items-center justify-center bg-near-black p-3 sm:min-h-[320px] md:min-h-[400px] md:p-4" style={{ borderRadius: 0 }}>
              {shipImageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shipImageDataUrl} alt="Ship Preview" className="max-w-full max-h-[500px] object-contain" style={{ imageRendering: "pixelated" }} />
              ) : (
                <div className="text-warning-red">{originalShip ? "Error rendering ship" : "Select a ship to preview"}</div>
              )}
            </div>
            <div className="mt-4 text-xs text-text-muted font-mono space-y-1">
              <div>
                Equipment: Weapon={mainWeapon}, Armor={armor}, Shields={shields}, Special={special}
              </div>
              <div>
                Traits: Accuracy={accuracy}, Hull={hull}, Speed={speed}, Variant={originalShip?.traits.variant ?? 0}
              </div>
              <div>Shiny: {shiny ? "Yes" : "No"}</div>
            </div>

            {originalShip && (
              <div className="mt-6 pt-4 border-t border-gunmetal">
                <h4 className="text-sm font-bold text-amber mb-3 font-mono">CUSTOMIZATION SUMMARY</h4>
                {changes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-cyan mb-2 font-mono">CHANGES:</div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {changes.map((change, index) => (
                        <div key={index} className="text-xs text-text-secondary font-mono pl-2 border-l-2 border-cyan/30">
                          • {change}
                        </div>
                      ))}
                    </div>
                    {costPreview && (
                      <div className="mt-4 pt-3 border-t border-gunmetal">
                        <div className="text-sm font-bold text-amber font-mono">
                          COST TO MODIFY: {costPreview.cost} UTC
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted font-mono">No changes detected</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipConstructorWeb2;
