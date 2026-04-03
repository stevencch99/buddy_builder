import {
  SPECIES,
  RARITIES,
  EYES,
  HATS,
  STAT_NAMES,
} from "./constants.ts";

export type Species = (typeof SPECIES)[number];
export type Rarity = (typeof RARITIES)[number];
export type Eye = (typeof EYES)[number];
export type Hat = (typeof HATS)[number];
export type StatName = (typeof STAT_NAMES)[number];
export type Stats = Record<StatName, number>;

export interface BuddyBones {
  species: Species;
  rarity: Rarity;
  eye: Eye;
  hat: Hat;
  shiny: boolean;
  stats: Stats;
}

export interface Companion extends BuddyBones {
  name: string;
  personality: string;
  hatchedAt: number;
}

export interface PatchResult {
  success: boolean;
  matchCount: number;
  message: string;
}

export type Lang = "en" | "zh-TW";
