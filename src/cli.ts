#!/usr/bin/env bun

import { parseArgs } from "node:util";
import type { Lang } from "./core/types.ts";
import { bonesPatch } from "./commands/bones-patch.ts";
import { restore } from "./commands/restore.ts";
import { t } from "./utils/i18n.ts";

function printHelp(): void {
  console.log(`
Buddy Builder - Claude Code Companion Customizer

Usage: buddy-builder <command> [options]

Commands:
  bones       Apply Bones Patch (customize all buddy attributes)
  restore     Restore Claude binary and/or JSON from backup

bones options:
  --species <name>        Species (duck, cat, dragon, etc.)
  --rarity <name>         Rarity (common, uncommon, rare, epic, legendary)
  --eye <char>            Eye style (^, o, O, -, @, *)
  --hat <name>            Hat (none, crown, tophat, propeller, halo, wizard, beanie, tinyduck)
  --shiny                 Force shiny
  --no-shiny              Force not shiny
  --name <name>           Buddy name
  --personality <text>    Personality description
  --skip-patch            Skip binary patch (if already patched)

Global options:
  --dry-run               Simulate without modifying files
  --lang <code>           Output language: en (default), zh-TW
  --claude-path <path>    Override Claude binary path
  --help, -h              Show this help
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  // Parse remaining args (after command)
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      "dry-run": { type: "boolean", default: false },
      lang: { type: "string", default: "en" },
      "claude-path": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
      // bones-specific
      species: { type: "string" },
      rarity: { type: "string" },
      eye: { type: "string" },
      hat: { type: "string" },
      shiny: { type: "boolean" },
      "no-shiny": { type: "boolean" },
      name: { type: "string" },
      personality: { type: "string" },
      "skip-patch": { type: "boolean", default: false },
    },
    strict: false,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const lang = (values.lang === "zh-TW" ? "zh-TW" : "en") as Lang;
  const dryRun = values["dry-run"] as boolean;
  const claudePath = values["claude-path"] as string | undefined;

  console.log(`\n🐾 ${t("welcome", lang)}\n`);

  switch (command) {
    case "bones": {
      let shiny: boolean | undefined;
      if (values.shiny) shiny = true;
      else if (values["no-shiny"]) shiny = false;

      await bonesPatch({
        lang,
        dryRun,
        claudePath,
        skipPatch: values["skip-patch"] as boolean,
        species: values.species as string | undefined,
        rarity: values.rarity as string | undefined,
        eye: values.eye as string | undefined,
        hat: values.hat as string | undefined,
        shiny,
        name: values.name as string | undefined,
        personality: values.personality as string | undefined,
      });
      break;
    }

    case "restore": {
      await restore({ lang, claudePath });
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n❌ Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
