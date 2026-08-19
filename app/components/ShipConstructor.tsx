"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Ship } from "../types/types";
import { renderShip } from "../utils/shipRenderer";
import { toShipVisual } from "../utils/toShipVisual";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useAccount, useReadContract } from "wagmi";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { invalidateShipAttributesByIdsCache } from "../utils/shipAttributesLocalCache";

const ShipConstructor: React.FC = () => {
  const { address } = useAccount();
  const selectedChainId = useSelectedChainId();
  const { ships, isLoading: isLoadingShips } = useOwnedShips();
  const [mode, setMode] = useState<"create" | "customize">("customize");
  const [selectedShipId, setSelectedShipId] = useState<bigint | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  // Store the original ship snapshot when it's first loaded
  const [originalShipSnapshot, setOriginalShipSnapshot] = useState<Ship | null>(
    null,
  );
  const isEditingExisting = mode === "customize";
  const controlsDisabled = isEditingExisting && !selectedShipId;

  // Equipment state
  const [mainWeapon, setMainWeapon] = useState<number>(0);
  const [armor, setArmor] = useState<number>(0);
  const [shields, setShields] = useState<number>(0);
  const [special, setSpecial] = useState<number>(0);

  // Traits state
  const [accuracy, setAccuracy] = useState<number>(0);
  const [hull, setHull] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [variant, setVariant] = useState<number>(0);
  const [shipName, setShipName] = useState<string>("Constructor Preview");

  // Colors state
  const [h1, setH1] = useState<number>(220);
  const [s1, setS1] = useState<number>(50);
  const [l1, setL1] = useState<number>(50);
  const [h2, setH2] = useState<number>(220);
  const [s2, setS2] = useState<number>(50);
  const [l2, setL2] = useState<number>(50);

  // ShipData state
  const [shiny, setShiny] = useState<boolean>(false);
  const [constructed, setConstructed] = useState<boolean>(true);

  // Load ship data when a ship is selected
  useEffect(() => {
    if (mode === "customize" && selectedShipId && ships) {
      // Only allow constructed ships to be customized
      const ship = ships.find(
        (s) => s.id === selectedShipId && s.shipData.constructed,
      );
      if (ship) {
        // Store a snapshot of the original ship for comparison
        setOriginalShipSnapshot({ ...ship });
        setShipName(ship.name);
        setMainWeapon(ship.equipment.mainWeapon);
        setArmor(ship.equipment.armor);
        setShields(ship.equipment.shields);
        setSpecial(ship.equipment.special);
        setAccuracy(ship.traits.accuracy);
        setHull(ship.traits.hull);
        setSpeed(ship.traits.speed);
        setVariant(ship.traits.variant);
        setH1(ship.traits.colors.h1);
        setS1(ship.traits.colors.s1);
        setL1(ship.traits.colors.l1);
        setH2(ship.traits.colors.h2);
        setS2(ship.traits.colors.s2);
        setL2(ship.traits.colors.l2);
        setShiny(ship.shipData.shiny);
        setConstructed(ship.shipData.constructed);
      }
    } else if (mode === "create") {
      // Reset to defaults when switching to create mode
      setShipName("Constructor Preview");
      setMainWeapon(0);
      setArmor(0);
      setShields(0);
      setSpecial(0);
      setAccuracy(0);
      setHull(0);
      setSpeed(0);
      setVariant(0);
      setH1(220);
      setS1(50);
      setL1(50);
      setH2(220);
      setS2(50);
      setL2(50);
      setShiny(false);
      setConstructed(true);
      setSelectedShipId(null);
      setOriginalShipSnapshot(null);
    }
  }, [mode, selectedShipId, ships]);

  // Create a mock ship object for rendering
  const mockShip: Ship = useMemo(
    () => ({
      name: shipName,
      id: selectedShipId || BigInt(0),
      equipment: {
        mainWeapon,
        armor,
        shields,
        special,
      },
      traits: {
        serialNumber: selectedShipId || BigInt(0),
        colors: {
          h1,
          s1,
          l1,
          h2,
          s2,
          l2,
        },
        variant,
        accuracy,
        hull,
        speed,
      },
      shipData: {
        shipsDestroyed: 0,
        costsVersion: 0,
        cost: 0,
        shiny,
        constructed,
        inFleet: false,
        timestampDestroyed: BigInt(0),
      },
      owner:
        address ||
        ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    }),
    [
      shipName,
      selectedShipId,
      mainWeapon,
      armor,
      shields,
      special,
      accuracy,
      hull,
      speed,
      variant,
      h1,
      s1,
      l1,
      h2,
      s2,
      l2,
      shiny,
      constructed,
      address,
    ],
  );

  // Render the ship using local renderer
  const shipImageDataUrl = useMemo(() => {
    try {
      return renderShip(toShipVisual(mockShip));
    } catch (error) {
      console.error("Error rendering ship:", error);
      return null;
    }
  }, [mockShip]);

  // Use the snapshot for comparison instead of looking it up each time
  // This ensures we're comparing against the original values when the ship was first loaded
  const originalShip = originalShipSnapshot;

  // Build the Ship struct in the format expected by DroneYard
  const buildDroneYardShipStruct = useMemo(() => {
    if (!selectedShipId || !originalShip) return null;

    // Colors and extra fields may not be present in the TypeScript type,
    // but they exist onchain and in the ABI, so we read them defensively.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorsAny = originalShip.traits.colors as any;
    const h3 = typeof colorsAny?.h3 === "number" ? colorsAny.h3 : 0;
    const s3 = typeof colorsAny?.s3 === "number" ? colorsAny.s3 : 0;
    const l3 = typeof colorsAny?.l3 === "number" ? colorsAny.l3 : 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shipDataAny = originalShip.shipData as any;
    const isFreeShip =
      typeof shipDataAny?.isFreeShip === "boolean"
        ? shipDataAny.isFreeShip
        : false;

    return [
      shipName, // name
      selectedShipId, // id
      [
        mainWeapon, // equipment.mainWeapon
        armor, // equipment.armor
        shields, // equipment.shields
        special, // equipment.special
      ],
      [
        BigInt(originalShip.traits.serialNumber), // traits.serialNumber (preserve original)
        [
          h1, // colors.h1
          s1, // colors.s1
          l1, // colors.l1
          h2, // colors.h2
          s2, // colors.s2
          l2, // colors.l2
          h3, // colors.h3 (preserve or default)
          s3, // colors.s3
          l3, // colors.l3
        ],
        variant, // traits.variant
        accuracy, // traits.accuracy
        hull, // traits.hull
        speed, // traits.speed
      ],
      [
        originalShip.shipData.shipsDestroyed, // shipData.shipsDestroyed
        originalShip.shipData.costsVersion, // shipData.costsVersion
        originalShip.shipData.cost, // shipData.cost
        typeof shipDataAny?.modified === "number" ? shipDataAny.modified : 0, // shipData.modified
        shiny, // shipData.shiny
        constructed, // shipData.constructed
        originalShip.shipData.inFleet, // shipData.inFleet
        isFreeShip, // shipData.isFreeShip
        BigInt(originalShip.shipData.timestampDestroyed), // shipData.timestampDestroyed
      ],
      address || "0x0000000000000000000000000000000000000000", // owner
    ];
  }, [
    address,
    accuracy,
    armor,
    constructed,
    h1,
    h2,
    l1,
    l2,
    mainWeapon,
    originalShip,
    s1,
    s2,
    selectedShipId,
    shiny,
    shields,
    shipName,
    special,
    hull,
    speed,
    variant,
  ]);

  // Read the onchain UTC cost to modify this ship via DroneYard
  const { data: modificationCost, refetch: refetchModificationCost } =
    useReadContract({
      address: CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: CONTRACT_ABIS.DRONE_YARD as any,
      functionName: "calculateCostToModify",
      args:
        mode === "customize" && selectedShipId && buildDroneYardShipStruct
          ? [selectedShipId, buildDroneYardShipStruct]
          : undefined,
      query: {
        enabled:
          mode === "customize" &&
          !!selectedShipId &&
          !!buildDroneYardShipStruct,
      },
    });

  // Read UTC allowance and balance for DroneYard
  const { data: utcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as any,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: mode === "customize" && !!address },
  });

  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as any,
    functionName: "allowance",
    args:
      address && CONTRACT_ADDRESSES.DRONE_YARD
        ? [address, CONTRACT_ADDRESSES.DRONE_YARD]
        : undefined,
    query: { enabled: mode === "customize" && !!address },
  });

  const needsApproval =
    mode === "customize" &&
    modificationCost !== undefined &&
    modificationCost !== null &&
    utcAllowance !== undefined &&
    (utcAllowance as bigint) < (modificationCost as bigint);

  // Calculate a human-readable list of changes (purely UI; cost is from contract)
  const changes = useMemo(() => {
    if (mode !== "customize" || !originalShip) return [];

    const list: string[] = [];

    // Equipment changes
    if (originalShip.equipment.mainWeapon !== mainWeapon) {
      list.push(
        `Main Weapon: ${originalShip.equipment.mainWeapon} → ${mainWeapon}`,
      );
    }
    if (originalShip.equipment.armor !== armor) {
      list.push(`Armor: ${originalShip.equipment.armor} → ${armor}`);
    }
    if (originalShip.equipment.shields !== shields) {
      list.push(`Shields: ${originalShip.equipment.shields} → ${shields}`);
    }
    if (originalShip.equipment.special !== special) {
      list.push(`Special: ${originalShip.equipment.special} → ${special}`);
    }

    // Traits changes
    if (originalShip.traits.accuracy !== accuracy) {
      list.push(`Accuracy: ${originalShip.traits.accuracy} → ${accuracy}`);
    }
    if (originalShip.traits.hull !== hull) {
      list.push(`Hull: ${originalShip.traits.hull} → ${hull}`);
    }
    if (originalShip.traits.speed !== speed) {
      list.push(`Speed: ${originalShip.traits.speed} → ${speed}`);
    }
    if (originalShip.traits.variant !== variant) {
      list.push(`Variant: ${originalShip.traits.variant} → ${variant}`);
    }

    // Color changes
    if (
      originalShip.traits.colors.h1 !== h1 ||
      originalShip.traits.colors.s1 !== s1 ||
      originalShip.traits.colors.l1 !== l1 ||
      originalShip.traits.colors.h2 !== h2 ||
      originalShip.traits.colors.s2 !== s2 ||
      originalShip.traits.colors.l2 !== l2
    ) {
      list.push("Colors: Modified");
    }

    // Ship data changes
    if (originalShip.name !== shipName) {
      list.push(`Name: "${originalShip.name}" → "${shipName}"`);
    }
    if (originalShip.shipData.shiny !== shiny) {
      list.push(
        `Shiny: ${originalShip.shipData.shiny ? "Yes" : "No"} → ${shiny ? "Yes" : "No"}`,
      );
    }
    if (originalShip.shipData.constructed !== constructed) {
      list.push(
        `Constructed: ${
          originalShip.shipData.constructed ? "Yes" : "No"
        } → ${constructed ? "Yes" : "No"}`,
      );
    }

    return list;
  }, [
    mode,
    originalShip,
    mainWeapon,
    armor,
    shields,
    special,
    accuracy,
    hull,
    speed,
    variant,
    h1,
    s1,
    l1,
    h2,
    s2,
    l2,
    shipName,
    shiny,
    constructed,
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div
        className="border border-cyan/30 bg-near-black p-3 md:p-6"
        style={{
          borderRadius: 0, // Square corners for industrial theme
        }}
      >
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div className="flex w-full items-center gap-4">
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <button
                onClick={() => setMode("customize")}
                className={`w-full border-2 px-3 py-2 text-xs font-mono font-bold tracking-wider transition-all duration-200 sm:w-auto sm:px-4 sm:text-sm ${
                  mode === "customize"
                    ? "border-amber text-amber bg-amber/10"
                    : "border-gunmetal text-text-muted hover:border-steel hover:text-text-muted"
                }`}
                style={{
                  borderRadius: 0, // Square corners for industrial theme
                }}
              >
                CUSTOMIZE
              </button>
              <button
                onClick={() => setMode("create")}
                className={`w-full border-2 px-3 py-2 text-xs font-mono font-bold tracking-wider transition-all duration-200 sm:w-auto sm:px-4 sm:text-sm ${
                  mode === "create"
                    ? "border-cyan text-cyan bg-cyan/10"
                    : "border-gunmetal text-text-muted hover:border-steel hover:text-text-muted"
                }`}
                style={{
                  borderRadius: 0, // Square corners for industrial theme
                }}
              >
                EXPLORE
              </button>
            </div>
          </div>
        </div>

        {mode === "customize" && (
          <div
            className="mb-4 border border-gunmetal bg-steel p-3 md:mb-6 md:p-4"
            style={{
              borderRadius: 0, // Square corners for industrial theme
            }}
          >
            <label className="block text-sm font-bold text-cyan mb-2 font-mono">
              SELECT SHIP TO CUSTOMIZE:
            </label>
            <select
              value={selectedShipId?.toString() || ""}
              onChange={(e) => {
                const shipId = e.target.value ? BigInt(e.target.value) : null;
                setSelectedShipId(shipId);
              }}
              disabled={isLoadingShips}
              className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan font-mono"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            >
              <option value="">-- Select a ship --</option>
              {ships
                ?.filter((ship) => ship.shipData.constructed)
                .map((ship) => (
                  <option key={ship.id.toString()} value={ship.id.toString()}>
                    {ship.name} (ID: {ship.id.toString()})
                  </option>
                ))}
            </select>
          </div>
        )}

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
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <div className="space-y-2">
                    <div className="font-bold text-cyan mb-3 text-center">
                      SHIP MODIFICATION
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      {/* Left Column - Cost Information */}
                      <div className="space-y-2 border-b border-cyan/30 pb-3 text-xs md:border-b-0 md:border-r md:pb-0 md:pr-4">
                        <p className="font-bold text-amber">
                          EXACT COST CALCULATION:
                        </p>
                        <p>
                          Base cost = Tier 0 price ÷ 5 = 4.99 UTC ÷ 5 ={" "}
                          <strong className="text-cyan">0.998 UTC</strong>
                        </p>
                        <p className="mt-1">
                          Total cost = Base cost × 2
                          <sup>(total modifications)</sup>
                        </p>

                        <p className="mt-3 font-bold text-amber">
                          COST BY MODIFICATION COUNT:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 font-mono text-xs">
                          <li>
                            0 modifications:{" "}
                            <strong className="text-phosphor-green">
                              0.998 UTC
                            </strong>{" "}
                            (base)
                          </li>
                          <li>
                            1 modification:{" "}
                            <strong className="text-phosphor-green">
                              1.996 UTC
                            </strong>{" "}
                            (×2)
                          </li>
                          <li>
                            2 modifications:{" "}
                            <strong className="text-amber">
                              3.992 UTC
                            </strong>{" "}
                            (×4)
                          </li>
                          <li>
                            3 modifications:{" "}
                            <strong className="text-amber">
                              7.984 UTC
                            </strong>{" "}
                            (×8)
                          </li>
                          <li>
                            4 modifications:{" "}
                            <strong className="text-amber">
                              15.968 UTC
                            </strong>{" "}
                            (×16)
                          </li>
                          <li>
                            5 modifications:{" "}
                            <strong className="text-amber">
                              31.936 UTC
                            </strong>{" "}
                            (×32)
                          </li>
                          <li>
                            6 modifications:{" "}
                            <strong className="text-warning-red">63.872 UTC</strong>{" "}
                            (×64)
                          </li>
                          <li>
                            7+ modifications:{" "}
                            <strong className="text-warning-red">
                              Exponentially higher
                            </strong>
                          </li>
                        </ul>
                        <p className="mt-2 text-xs opacity-80">
                          <strong>Total modifications</strong> = existing
                          ship&apos;s modification count + new changes
                        </p>

                        <p className="mt-3 font-bold text-amber">
                          WHAT COUNTS AS A MODIFICATION:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                          <li>
                            <strong>Equipment changes:</strong> +1 per changed
                            property (mainWeapon, armor, shields, special)
                          </li>
                          <li>
                            <strong>Trait changes:</strong> Sum of absolute
                            differences for accuracy, hull, speed (e.g.,
                            changing accuracy from 0→2 = +2 modifications)
                          </li>
                          <li>
                            <strong>Shiny status change:</strong> +3
                            modifications (toggling shiny on/off)
                          </li>
                        </ul>

                        <p className="mt-3 font-bold text-amber">
                          PAYMENT PROCESS:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                          <li>Approve UTC for the DroneYard contract</li>
                          <li>Pay the calculated modification cost in UTC</li>
                        </ul>
                        <p className="mt-2 text-xs opacity-80">
                          The exact cost will be displayed once you select a
                          ship and make changes.
                        </p>
                      </div>

                      {/* Right Column - Property Information */}
                      <div className="space-y-2 text-xs md:pl-4">
                        <p className="font-bold text-amber">
                          PROPERTIES YOU CAN CHANGE:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                          <li>
                            Equipment: Main Weapon, Armor, Shields, Special
                          </li>
                          <li>
                            Traits: Accuracy (0-2), Hull (0-2), Speed (0-2)
                          </li>
                          <li>Shiny status (costs 3 modifications)</li>
                        </ul>

                        <p className="mt-3 font-bold text-warning-red">
                          PROPERTIES YOU CANNOT CHANGE:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                          <li>Serial Number (immutable)</li>
                          <li>Colors (preserved from original ship)</li>
                          <li>Ship Name (preserved)</li>
                          <li>
                            Variant (cannot be changed when editing existing
                            ship)
                          </li>
                        </ul>

                        <p className="mt-3 font-bold text-amber">
                          RESTRICTIONS:
                        </p>
                        <ul className="list-disc list-inside ml-2 space-y-0.5 mt-1 text-xs">
                          <li>Ship must be constructed</li>
                          <li>Ship must not be in a fleet</li>
                          <li>Only ship owner can modify</li>
                          <li>
                            Armor and Shields cannot both be set (one must be
                            None)
                          </li>
                          <li>Trait values must be 0, 1, or 2</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Controls Panel */}
          <div
            className={`space-y-6 ${
              controlsDisabled ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {/* Equipment Section */}
            <div
              className="border border-gunmetal bg-steel p-3 md:p-4"
              style={{
                borderRadius: 0, // Square corners for industrial theme
              }}
            >
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
                EQUIPMENT
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Main Weapon
                  </label>
                  <select
                    value={mainWeapon}
                    onChange={(e) => setMainWeapon(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                      borderColor: "var(--color-cyan)",
                    }}
                  >
                    <option value={0}>Laser</option>
                    <option value={1}>Railgun</option>
                    <option value={2}>Missile</option>
                    <option value={3}>Plasma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Defense Type
                  </label>
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
                      <label className="block text-xs text-cyan mb-1">
                        Armor Level
                      </label>
                      <select
                        value={armor}
                        onChange={(e) => {
                          const newArmor = Number(e.target.value);
                          setArmor(newArmor);
                          if (newArmor > 0) setShields(0);
                        }}
                        className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                        style={{
                          borderRadius: 0, // Square corners for industrial theme
                          borderColor: "var(--color-cyan)",
                        }}
                      >
                        <option value={1}>Light</option>
                        <option value={2}>Medium</option>
                        <option value={3}>Heavy</option>
                      </select>
                    </div>
                  )}
                  {shields > 0 && (
                    <div>
                      <label className="block text-xs text-cyan mb-1">
                        Shield Level
                      </label>
                      <select
                        value={shields}
                        onChange={(e) => {
                          const newShields = Number(e.target.value);
                          setShields(newShields);
                          if (newShields > 0) setArmor(0);
                        }}
                        className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                        style={{
                          borderRadius: 0, // Square corners for industrial theme
                          borderColor: "var(--color-cyan)",
                        }}
                      >
                        <option value={1}>Basic</option>
                        <option value={2}>Enhanced</option>
                        <option value={3}>Advanced</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Special
                  </label>
                  <select
                    value={special}
                    onChange={(e) => setSpecial(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                      borderColor: "var(--color-cyan)",
                    }}
                  >
                    <option value={0}>None</option>
                    <option value={1}>EMP</option>
                    <option value={2}>Repair</option>
                    <option value={3}>Flak</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Traits Section */}
            <div
              className="border border-gunmetal bg-steel p-3 md:p-4"
              style={{
                borderRadius: 0, // Square corners for industrial theme
              }}
            >
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
                TRAITS
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Accuracy: {accuracy}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={accuracy}
                    onChange={(e) => setAccuracy(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Hull: {hull}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={hull}
                    onChange={(e) => setHull(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Speed: {speed}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Variant: {variant}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={variant}
                    onChange={(e) => setVariant(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan ${
                      isEditingExisting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
                  />
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div
              className="border border-gunmetal bg-steel p-3 md:p-4"
              style={{
                borderRadius: 0, // Square corners for industrial theme
              }}
            >
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
                COLORS (Primary)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Hue 1: {h1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={h1}
                    onChange={(e) => setH1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Saturation 1: {s1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={s1}
                    onChange={(e) => setS1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-cyan mb-2">
                    Lightness 1: {l1}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={l1}
                    onChange={(e) => setL1(Number(e.target.value))}
                    disabled={isEditingExisting}
                    className={`w-full ${isEditingExisting ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                </div>
              </div>
            </div>

            {/* Secondary colors currently unused; hide this section for now */}

            {/* ShipData Section */}
            <div
              className="border border-gunmetal bg-steel p-3 md:p-4"
              style={{
                borderRadius: 0, // Square corners for industrial theme
              }}
            >
              <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
                SHIP DATA
              </h3>
              <div className="space-y-3">
                {mode === "customize" && (
                  <div>
                    <label className="block text-sm text-cyan mb-2">
                      Ship Name
                    </label>
                    <input
                      type="text"
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      disabled={isEditingExisting}
                      className={`w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan font-mono ${
                        isEditingExisting ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      style={{
                        borderRadius: 0, // Square corners for industrial theme
                        borderColor: "var(--color-cyan)",
                      }}
                      placeholder="Enter ship name"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shiny}
                    onChange={(e) => setShiny(e.target.checked)}
                    className="w-4 h-4 text-cyan bg-black/60 border-cyan focus:ring-cyan focus:ring-2"
                    style={{
                      borderRadius: 0, // Square corners for industrial theme
                    }}
                  />
                  <span>Shiny</span>
                </label>
              </div>
            </div>

            {/* Approval and Customize Buttons (only in customize mode with selected ship) */}
            {mode === "customize" &&
              selectedShipId &&
              buildDroneYardShipStruct && (
                <div
                  className="border border-amber/50 bg-steel p-3 md:p-4"
                  style={{
                    borderRadius: 0, // Square corners for industrial theme
                  }}
                >
                  {needsApproval ? (
                    <TransactionButton
                      transactionId={`approve-drone-yard-${selectedShipId}-${address}`}
                      contractAddress={
                        CONTRACT_ADDRESSES.UNIVERSAL_CREDITS as `0x${string}`
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      abi={CONTRACT_ABIS.UNIVERSAL_CREDITS as any}
                      functionName="approve"
                      args={[
                        CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`,
                        modificationCost ?? 0n,
                      ]}
                      className="w-full px-6 py-3 mb-3 rounded-none border-2 border-amber text-amber hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      loadingText="[APPROVING UTC...]"
                      errorText="[ERROR APPROVING]"
                      onSuccess={() => {
                        toast.success("UTC approved for DroneYard");
                        refetchAllowance?.();
                      }}
                      validateBeforeTransaction={() => {
                        if (!address) return "Please connect your wallet";
                        if (!modificationCost) return "Cost not available";
                        if (
                          !utcBalance ||
                          (utcBalance as bigint) < (modificationCost as bigint)
                        ) {
                          return "Insufficient UTC balance";
                        }
                        return true;
                      }}
                    >
                      {modificationCost
                        ? `[APPROVE ${formatEther(modificationCost as bigint)} UTC]`
                        : "[APPROVE UTC]"}
                    </TransactionButton>
                  ) : null}

                  <TransactionButton
                    transactionId={`customize-ship-${selectedShipId}-${address}`}
                    contractAddress={
                      CONTRACT_ADDRESSES.DRONE_YARD as `0x${string}`
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi={CONTRACT_ABIS.DRONE_YARD as any}
                    functionName="modifyShip"
                    args={[selectedShipId, buildDroneYardShipStruct]}
                    className="w-full px-6 py-3 rounded-none border-2 border-amber text-amber hover:border-amber hover:text-amber hover:bg-amber/10 font-mono font-bold tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    loadingText="[CUSTOMIZING SHIP...]"
                    errorText="[ERROR CUSTOMIZING]"
                    disabled={
                      !modificationCost ||
                      !utcBalance ||
                      (utcBalance as bigint) < (modificationCost as bigint) ||
                      (utcAllowance !== undefined &&
                        (utcAllowance as bigint) < (modificationCost as bigint))
                    }
                    onSuccess={() => {
                      toast.success("Ship customized successfully!");
                      // After customization, refresh cost and allowance so
                      // the approve button and amount stay in sync with contracts.
                      refetchModificationCost?.();
                      refetchAllowance?.();
                      // DroneYard.modifyShip changes this ship's on-chain
                      // attributes (movement/range/etc.) with no other
                      // signal the attributes cache would ever pick up on —
                      // drop its cached entry so fleet selection stops
                      // showing the pre-modification numbers (see
                      // shipAttributesLocalCache.ts's cache-TTL doc).
                      invalidateShipAttributesByIdsCache(
                        selectedChainId,
                        selectedShipId ?? undefined,
                      );
                    }}
                    validateBeforeTransaction={() => {
                      if (!address) {
                        return "Please connect your wallet";
                      }
                      if (!selectedShipId) {
                        return "Please select a ship to customize";
                      }
                      if (!modificationCost) {
                        return "Cost not available";
                      }
                      if (
                        !utcBalance ||
                        (utcBalance as bigint) < (modificationCost as bigint)
                      ) {
                        return "Insufficient UTC balance";
                      }
                      if (
                        utcAllowance !== undefined &&
                        (utcAllowance as bigint) < (modificationCost as bigint)
                      ) {
                        return "Please approve UTC first";
                      }
                      return true;
                    }}
                  >
                    [CUSTOMIZE SHIP]
                  </TransactionButton>
                </div>
              )}
          </div>

          {/* Preview Panel */}
          <div
            className="border border-gunmetal bg-steel p-3 md:p-4"
            style={{
              borderRadius: 0, // Square corners for industrial theme
            }}
          >
            <h3 className="text-lg font-bold text-cyan mb-4 font-mono">
              PREVIEW
            </h3>
            <div
              className="flex min-h-[260px] flex-col items-center justify-center bg-near-black p-3 sm:min-h-[320px] md:min-h-[400px] md:p-4"
              style={{
                borderRadius: 0, // Square corners for industrial theme
              }}
            >
              {shipImageDataUrl ? (
                <img
                  src={shipImageDataUrl}
                  alt="Ship Preview"
                  className="max-w-full max-h-[500px] object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="text-warning-red">Error rendering ship</div>
              )}
            </div>
            {!constructed && (
              <div className="mt-2 text-xs text-amber text-center">
                Note: Unconstructed ships show a placeholder image
              </div>
            )}
            <div className="mt-4 text-xs text-text-muted font-mono space-y-1">
              <div>
                Equipment: Weapon={mainWeapon}, Armor={armor}, Shields={shields}
                , Special={special}
              </div>
              <div>
                Traits: Accuracy={accuracy}, Hull={hull}, Speed={speed},
                Variant={variant}
              </div>
              <div>
                Colors: H1={h1}, S1={s1}, L1={l1} | H2={h2}, S2={s2}, L2={l2}
              </div>
              <div>
                Shiny: {shiny ? "Yes" : "No"} | Constructed:{" "}
                {constructed ? "Yes" : "No"}
              </div>
            </div>

            {/* Changes and Cost (only in customize mode) */}
            {mode === "customize" && originalShip && (
              <div className="mt-6 pt-4 border-t border-gunmetal">
                <h4 className="text-sm font-bold text-amber mb-3 font-mono">
                  CUSTOMIZATION SUMMARY
                </h4>
                {changes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-cyan mb-2 font-mono">
                      CHANGES:
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {changes.map((change, index) => (
                        <div
                          key={index}
                          className="text-xs text-text-secondary font-mono pl-2 border-l-2 border-cyan/30"
                        >
                          • {change}
                        </div>
                      ))}
                    </div>
                    {modificationCost !== undefined &&
                      modificationCost !== null && (
                        <div className="mt-4 pt-3 border-t border-gunmetal">
                          <div className="text-sm font-bold text-amber font-mono">
                            COST TO MODIFY (ON-CHAIN):{" "}
                            {formatEther(modificationCost as bigint)} UTC
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-xs text-text-muted font-mono">
                    No changes detected
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipConstructor;
