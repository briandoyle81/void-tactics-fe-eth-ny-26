import { describe, it, expect } from "vitest";
import { requireShipValue, readShipValue, resolveActionRange } from "../requireShipValue";
import { requireSpecialConfigWeb2 } from "../specialConfigWeb2";

describe("requireShipValue", () => {
  it("accepts a finite number, including 0", () => {
    expect(requireShipValue("range", 3)).toBe(3);
    expect(requireShipValue("movement", 0)).toBe(0);
    expect(requireShipValue("specialRange", 3n)).toBe(3);
  });

  it("throws when the value is missing", () => {
    expect(() => requireShipValue("specialRange", undefined)).toThrow(
      "Missing ship value: specialRange",
    );
    expect(() => requireShipValue("specialRange", null)).toThrow(
      "Missing ship value: specialRange",
    );
  });

  it("throws when the value is unreadable instead of substituting a default", () => {
    expect(() => requireShipValue("range", "nope")).toThrow("Invalid ship value range");
    expect(() => requireShipValue("range", Number.NaN)).toThrow("Invalid ship value range");
  });
});

describe("readShipValue", () => {
  it("returns undefined for an unloaded value and throws for a bad one", () => {
    expect(readShipValue("specialRange", undefined)).toBeUndefined();
    expect(() => readShipValue("specialRange", "x")).toThrow("Invalid ship value specialRange");
  });
});

describe("resolveActionRange", () => {
  it("does not fall back to gun range when a special range has not loaded", () => {
    expect(
      resolveActionRange({
        selectedWeaponType: "special",
        gunRange: 3,
      }),
    ).toBeUndefined();
  });

  it("uses the special range when present", () => {
    expect(
      resolveActionRange({
        selectedWeaponType: "special",
        specialRange: 3n,
        gunRange: 5,
      }),
    ).toBe(3);
  });
});

describe("requireSpecialConfigWeb2", () => {
  it("throws when the special slot is missing", () => {
    expect(() => requireSpecialConfigWeb2(2, 0)).toThrow("Missing ship value: special");
    expect(() => requireSpecialConfigWeb2(1, 9)).toThrow("Missing special config");
    expect(() => requireSpecialConfigWeb2(2, 5)).toThrow("Missing special config");
  });
});
