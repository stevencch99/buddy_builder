import {
  SPECIES,
  RARITIES,
  RARITY_WEIGHTS,
  RARITY_BASE_STATS,
  EYES,
  HATS,
  STAT_NAMES,
  ORIGINAL_SALT,
} from "./constants.ts";
import type { BuddyBones, Rarity, Species, Eye, Hat, Stats } from "./types.ts";

/**
 * Bun wyhash64 truncated to 32-bit unsigned integer.
 */
export function hash(str: string): number {
  return Number(BigInt(Bun.hash(str)) & 0xffffffffn);
}

/**
 * SplitMix32 PRNG — returns a function that produces [0, 1) floats.
 */
export function createPRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 1831565813) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollRarity(rng: () => number): Rarity {
  const roll = rng() * 100;
  let cumulative = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    cumulative += RARITY_WEIGHTS[i];
    if (roll < cumulative) {
      return RARITIES[i];
    }
  }
  return RARITIES[RARITIES.length - 1];
}

export function rollSpecies(rng: () => number): Species {
  return SPECIES[Math.floor(rng() * SPECIES.length)];
}

export function rollEyes(rng: () => number): Eye {
  return EYES[Math.floor(rng() * EYES.length)];
}

export function rollHat(rng: () => number, rarity: Rarity): Hat {
  if (rarity === "common") {
    return "none";
  }
  return HATS[Math.floor(rng() * HATS.length)];
}

export function rollShiny(rng: () => number): boolean {
  return rng() < 0.01;
}

export function generateStats(rng: () => number, rarity: Rarity): Stats {
  const base = RARITY_BASE_STATS[rarity];
  const statCount = STAT_NAMES.length;

  const boostedIndex = Math.floor(rng() * statCount);
  let nerfedIndex: number;
  do {
    nerfedIndex = Math.floor(rng() * statCount);
  } while (nerfedIndex === boostedIndex);

  const stats = {} as Stats;
  for (let i = 0; i < statCount; i++) {
    const name = STAT_NAMES[i];
    if (i === boostedIndex) {
      stats[name] = Math.min(100, base + 50 + Math.floor(rng() * 30));
    } else if (i === nerfedIndex) {
      stats[name] = Math.max(1, base - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = base + Math.floor(rng() * 40);
    }
  }

  return stats;
}

/**
 * Generate complete bones from userId + salt.
 * Reproduces the deterministic buddy generation algorithm.
 */
export function generateBones(
  userId: string,
  salt: string = ORIGINAL_SALT,
): BuddyBones {
  const seed = hash(userId + salt);
  const rng = createPRNG(seed);

  const rarity = rollRarity(rng);
  const species = rollSpecies(rng);
  const eye = rollEyes(rng);
  const hat = rollHat(rng, rarity);
  const shiny = rollShiny(rng);
  const stats = generateStats(rng, rarity);

  return { species, rarity, eye, hat, shiny, stats };
}
