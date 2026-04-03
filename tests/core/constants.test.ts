import { describe, expect, test } from "bun:test";
import {
  SPECIES,
  RARITIES,
  RARITY_WEIGHTS,
  RARITY_BASE_STATS,
  EYES,
  HATS,
  STAT_NAMES,
  ORIGINAL_SALT,
} from "../../src/core/constants.ts";

describe("constants integrity", () => {
  test("SPECIES has 18 entries", () => {
    expect(SPECIES).toHaveLength(18);
  });

  test("SPECIES has no duplicates", () => {
    expect(new Set(SPECIES).size).toBe(SPECIES.length);
  });

  test("RARITIES has 5 entries", () => {
    expect(RARITIES).toHaveLength(5);
  });

  test("RARITY_WEIGHTS sums to 100", () => {
    const sum = RARITY_WEIGHTS.reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  test("RARITY_WEIGHTS length matches RARITIES", () => {
    expect(RARITY_WEIGHTS).toHaveLength(RARITIES.length);
  });

  test("RARITY_BASE_STATS has entry for every rarity", () => {
    for (const rarity of RARITIES) {
      expect(RARITY_BASE_STATS[rarity]).toBeDefined();
      expect(RARITY_BASE_STATS[rarity]).toBeGreaterThan(0);
    }
  });

  test("RARITY_BASE_STATS increases with rarity", () => {
    for (let i = 1; i < RARITIES.length; i++) {
      expect(RARITY_BASE_STATS[RARITIES[i]]).toBeGreaterThan(
        RARITY_BASE_STATS[RARITIES[i - 1]],
      );
    }
  });

  test("EYES has 6 entries", () => {
    expect(EYES).toHaveLength(6);
  });

  test("HATS has 8 entries", () => {
    expect(HATS).toHaveLength(8);
  });

  test("HATS includes none", () => {
    expect(HATS).toContain("none");
  });

  test("STAT_NAMES has 5 entries", () => {
    expect(STAT_NAMES).toHaveLength(5);
  });

  test("STAT_NAMES has no duplicates", () => {
    expect(new Set(STAT_NAMES).size).toBe(STAT_NAMES.length);
  });

  test("ORIGINAL_SALT is 15 characters", () => {
    expect(ORIGINAL_SALT).toHaveLength(15);
  });
});
