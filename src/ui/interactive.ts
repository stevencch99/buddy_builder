import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { SPECIES, RARITIES, EYES, HATS, STAT_NAMES, RARITY_BASE_STATS, sanitizeText, MAX_NAME_LENGTH, MAX_PERSONALITY_LENGTH } from "../core/constants.ts";
import type { BuddyBones, Companion, Lang, Species, Rarity, Eye, Hat } from "../core/types.ts";
import { t } from "../utils/i18n.ts";

const rl = createInterface({ input: stdin, output: stdout });

async function choose<T extends string>(
  prompt: string,
  options: readonly T[],
  columns: number = 4,
): Promise<T> {
  console.log(`\n${prompt}`);

  const maxLen = Math.max(...options.map((o) => o.length));
  for (let i = 0; i < options.length; i++) {
    const num = `${i + 1}.`.padEnd(4);
    const label = options[i].padEnd(maxLen + 2);
    const sep = (i + 1) % columns === 0 ? "\n" : "";
    process.stdout.write(`  ${num}${label}${sep}`);
  }
  if (options.length % columns !== 0) console.log();

  while (true) {
    const answer = await rl.question("> ");
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx];
    }
    // Allow typing the value directly
    if (options.includes(answer.trim() as T)) {
      return answer.trim() as T;
    }
    console.log(`  Please enter 1-${options.length} or a valid option.`);
  }
}

async function askYesNo(prompt: string): Promise<boolean> {
  const answer = await rl.question(`\n${prompt} (y/n) > `);
  return answer.trim().toLowerCase().startsWith("y");
}

async function askText(prompt: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`\n${prompt}${suffix} > `);
  return answer.trim() || defaultValue || "";
}

async function askNumber(
  prompt: string,
  min: number,
  max: number,
  defaultValue: number,
): Promise<number> {
  const answer = await rl.question(
    `\n${prompt} (${min}-${max}) [${defaultValue}] > `,
  );
  const num = parseInt(answer.trim(), 10);
  if (isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

export async function interactiveSelectBones(
  lang: Lang,
): Promise<BuddyBones> {
  const species = await choose<Species>(t("select_species", lang), SPECIES, 4);
  const rarity = await choose<Rarity>(t("select_rarity", lang), RARITIES, 5);
  const eye = await choose<Eye>(t("select_eye", lang), EYES, 6);

  let hat: Hat = "none";
  if (rarity !== "common") {
    hat = await choose<Hat>(t("select_hat", lang), HATS, 4);
  } else {
    console.log(`\n  Hat: none (common rarity)`);
  }

  const shiny = await askYesNo(t("select_shiny", lang));

  // Stats
  const base = RARITY_BASE_STATS[rarity];
  console.log(`\n  Base stats for ${rarity}: ${base}`);
  console.log(`  You can customize each stat (1-100), or press Enter for default.`);

  const stats = {} as Record<string, number>;
  for (const name of STAT_NAMES) {
    const defaultVal = Math.min(100, base + 25);
    stats[name] = await askNumber(`  ${name}`, 1, 100, defaultVal);
  }

  return {
    species,
    rarity,
    eye,
    hat,
    shiny,
    stats: stats as BuddyBones["stats"],
  };
}

export async function interactiveSelectSoul(
  lang: Lang,
): Promise<{ name: string; personality: string }> {
  const rawName = await askText(t("enter_name", lang), "Buddy");
  const rawPersonality = await askText(
    t("enter_personality", lang),
    "A friendly companion who loves to help debug code.",
  );
  return {
    name: sanitizeText(rawName, MAX_NAME_LENGTH),
    personality: sanitizeText(rawPersonality, MAX_PERSONALITY_LENGTH),
  };
}

export async function interactiveConfirm(lang: Lang): Promise<boolean> {
  return askYesNo(t("confirm_apply", lang));
}

export async function interactiveSelectFromList(
  prompt: string,
  items: string[],
): Promise<number> {
  console.log(`\n${prompt}`);
  for (let i = 0; i < items.length; i++) {
    console.log(`  ${i + 1}. ${items[i]}`);
  }
  while (true) {
    const answer = await rl.question("> ");
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < items.length) return idx;
    console.log(`  Please enter 1-${items.length}.`);
  }
}

export function closeReadline(): void {
  rl.close();
}
