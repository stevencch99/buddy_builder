export const SPECIES = [
  "duck",
  "goose",
  "blob",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "snail",
  "ghost",
  "axolotl",
  "capybara",
  "cactus",
  "robot",
  "rabbit",
  "mushroom",
  "chonk",
] as const;

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const;

export const RARITY_WEIGHTS = [60, 25, 10, 4, 1] as const;

export const RARITY_BASE_STATS: Record<(typeof RARITIES)[number], number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

export const EYES = ["^", "o", "O", "-", "@", "*"] as const;

export const HATS = [
  "none",
  "crown",
  "tophat",
  "propeller",
  "halo",
  "wizard",
  "beanie",
  "tinyduck",
] as const;

export const STAT_NAMES = [
  "DEBUGGING",
  "PATIENCE",
  "CHAOS",
  "WISDOM",
  "SNARK",
] as const;

export const ORIGINAL_SALT = "friend-2026-401";

export const MAX_NAME_LENGTH = 50;
export const MAX_PERSONALITY_LENGTH = 200;

/** Strip control characters (U+0000–U+001F, U+007F) except tab, newline, carriage return. */
export function sanitizeText(text: string, maxLength: number): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, maxLength);
}
