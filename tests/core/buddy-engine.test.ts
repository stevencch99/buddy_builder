import { describe, expect, test } from "bun:test";
import {
  hash,
  createPRNG,
  rollRarity,
  rollSpecies,
  rollEyes,
  rollHat,
  rollShiny,
  generateStats,
  generateBones,
} from "../../src/core/buddy-engine.ts";
import { SPECIES, RARITIES, EYES, HATS, STAT_NAMES } from "../../src/core/constants.ts";

describe("hash", () => {
  test("returns a 32-bit unsigned integer", () => {
    const result = hash("test-string");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  test("is deterministic", () => {
    expect(hash("hello")).toBe(hash("hello"));
  });

  test("different inputs produce different hashes", () => {
    expect(hash("a")).not.toBe(hash("b"));
  });
});

describe("createPRNG", () => {
  test("is deterministic for the same seed", () => {
    const rng1 = createPRNG(42);
    const rng2 = createPRNG(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  test("produces values in [0, 1)", () => {
    const rng = createPRNG(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test("different seeds produce different sequences", () => {
    const rng1 = createPRNG(1);
    const rng2 = createPRNG(2);
    const seq1 = Array.from({ length: 5 }, () => rng1());
    const seq2 = Array.from({ length: 5 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

describe("rollRarity", () => {
  test("returns a valid rarity", () => {
    const rng = createPRNG(42);
    const rarity = rollRarity(rng);
    expect(RARITIES).toContain(rarity);
  });

  test("distribution roughly matches weights over many rolls", () => {
    const counts: Record<string, number> = {};
    for (const r of RARITIES) counts[r] = 0;

    for (let seed = 0; seed < 10000; seed++) {
      const rng = createPRNG(seed);
      counts[rollRarity(rng)]++;
    }

    // Common should be ~60%, allow generous margin
    expect(counts["common"]).toBeGreaterThan(5000);
    expect(counts["common"]).toBeLessThan(7000);
    // Legendary should be ~1%
    expect(counts["legendary"]).toBeGreaterThan(30);
    expect(counts["legendary"]).toBeLessThan(300);
  });
});

describe("rollSpecies", () => {
  test("returns a valid species", () => {
    const rng = createPRNG(42);
    const species = rollSpecies(rng);
    expect(SPECIES).toContain(species);
  });
});

describe("rollEyes", () => {
  test("returns a valid eye", () => {
    const rng = createPRNG(42);
    const eye = rollEyes(rng);
    expect(EYES).toContain(eye);
  });
});

describe("rollHat", () => {
  test("common rarity always returns none", () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = createPRNG(seed);
      expect(rollHat(rng, "common")).toBe("none");
    }
  });

  test("non-common returns a valid hat", () => {
    const rng = createPRNG(42);
    const hat = rollHat(rng, "legendary");
    expect(HATS).toContain(hat);
  });
});

describe("rollShiny", () => {
  test("returns a boolean", () => {
    const rng = createPRNG(42);
    expect(typeof rollShiny(rng)).toBe("boolean");
  });

  test("shiny rate is roughly 1%", () => {
    let shinyCount = 0;
    for (let seed = 0; seed < 10000; seed++) {
      const rng = createPRNG(seed);
      if (rollShiny(rng)) shinyCount++;
    }
    expect(shinyCount).toBeGreaterThan(30);
    expect(shinyCount).toBeLessThan(300);
  });
});

describe("generateStats", () => {
  test("produces all 5 stat names", () => {
    const rng = createPRNG(42);
    const stats = generateStats(rng, "rare");
    for (const name of STAT_NAMES) {
      expect(stats[name]).toBeDefined();
      expect(stats[name]).toBeGreaterThanOrEqual(1);
      expect(stats[name]).toBeLessThanOrEqual(100);
    }
  });

  test("has exactly one boosted and one nerfed stat", () => {
    const rng = createPRNG(42);
    const stats = generateStats(rng, "legendary");
    const base = 50;
    const values = STAT_NAMES.map((n) => stats[n]);

    // Boosted: min(100, base + 50 + [0,30)) → [100, 100] for legendary
    const boosted = values.filter((v) => v >= base + 50);
    expect(boosted.length).toBe(1);

    // Nerfed: max(1, base - 10 + [0,15)) → [40, 54] for legendary
    const nerfed = values.filter((v) => v < base);
    expect(nerfed.length).toBe(1);
  });
});

describe("generateBones", () => {
  test("is deterministic", () => {
    const bones1 = generateBones("test-user-id", "friend-2026-401");
    const bones2 = generateBones("test-user-id", "friend-2026-401");
    expect(bones1).toEqual(bones2);
  });

  test("returns all required fields", () => {
    const bones = generateBones("test-user-id");
    expect(bones.species).toBeDefined();
    expect(bones.rarity).toBeDefined();
    expect(bones.eye).toBeDefined();
    expect(bones.hat).toBeDefined();
    expect(typeof bones.shiny).toBe("boolean");
    expect(bones.stats).toBeDefined();
    expect(Object.keys(bones.stats)).toHaveLength(5);
  });

  test("different userIds produce different bones", () => {
    const bones1 = generateBones("user-a");
    const bones2 = generateBones("user-b");
    // Extremely unlikely to be identical
    expect(
      bones1.species !== bones2.species ||
        bones1.rarity !== bones2.rarity ||
        bones1.eye !== bones2.eye,
    ).toBe(true);
  });

  test("common rarity always has hat=none", () => {
    // Find a seed that produces common rarity
    for (let i = 0; i < 1000; i++) {
      const userId = `common-search-${i}`;
      const bones = generateBones(userId);
      if (bones.rarity === "common") {
        expect(bones.hat).toBe("none");
        return;
      }
    }
  });
});
