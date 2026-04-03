import type { Companion, Lang, BuddyBones } from "../core/types.ts";
import { SPECIES, RARITIES, EYES, HATS, sanitizeText, MAX_NAME_LENGTH, MAX_PERSONALITY_LENGTH } from "../core/constants.ts";
import {
  detectSpreadPatterns,
  isAlreadyPatched,
  patchSpreadOrder,
  backupBinary,
  restoreBinary,
  verifySaltExists,
  findCandidatePatterns,
  pruneBinaryBackups,
  type DetectedPattern,
} from "../core/binary.ts";
import {
  backupClaudeJson,
  setCompanion,
  restoreClaudeJson,
  pruneClaudeJsonBackups,
} from "../core/claude-json.ts";
import {
  findClaudeBinary,
  codesign,
  needsCodesign,
  verifyCodesign,
  verifyBinaryExecutable,
} from "../utils/platform.ts";
import {
  interactiveSelectBones,
  interactiveSelectSoul,
  interactiveConfirm,
  interactiveSelectFromList,
  closeReadline,
} from "../ui/interactive.ts";
import { formatBuddyCard } from "../ui/display.ts";
import { t } from "../utils/i18n.ts";

export interface BonesPatchOptions {
  lang: Lang;
  dryRun: boolean;
  claudePath?: string;
  skipPatch: boolean;
  // Direct flag values (skip interactive if all provided)
  species?: string;
  rarity?: string;
  eye?: string;
  hat?: string;
  shiny?: boolean;
  name?: string;
  personality?: string;
}

export async function bonesPatch(options: BonesPatchOptions): Promise<void> {
  const { lang, dryRun } = options;

  try {
    await _bonesPatchInner(options);
  } finally {
    closeReadline();
  }
}

async function _bonesPatchInner(options: BonesPatchOptions): Promise<void> {
  const { lang, dryRun } = options;

  if (dryRun) {
    console.log(`\n⚠️  ${t("dry_run_notice", lang)}\n`);
  }

  // === Pre-flight ===
  console.log(t("detecting_binary", lang));
  let binaryPath: string;
  try {
    binaryPath = await findClaudeBinary(options.claudePath);
    console.log(`  ${t("binary_found", lang)} ${binaryPath}`);
  } catch (e) {
    console.error(`❌ ${t("binary_not_found", lang)}`);
    console.error(`   ${(e as Error).message}`);
    process.exit(1);
  }

  const saltExists = await verifySaltExists(binaryPath);
  if (!saltExists) {
    console.error(`❌ ${t("salt_not_found", lang)}`);
    process.exit(1);
  }
  console.log(`  ${t("version_compatible", lang)}`);

  // === Binary Patch ===
  let binaryBackupPath: string | null = null;

  if (!options.skipPatch) {
    const alreadyPatched = await isAlreadyPatched(binaryPath);
    if (alreadyPatched) {
      console.log(`\n✅ ${t("already_patched", lang)}`);
    } else {
      // Detect all patterns (binary may embed JS bundle multiple times)
      console.log(`\n${t("detecting_pattern", lang)}`);
      let patterns = await detectSpreadPatterns(binaryPath);

      if (patterns.length === 0) {
        // Fallback: show candidates for manual selection
        const candidates = await findCandidatePatterns(binaryPath);
        if (candidates.length === 0) {
          console.error(`❌ ${t("pattern_not_found", lang)}`);
          process.exit(1);
        }

        console.log(`\n${t("candidate_patterns", lang)}`);
        const labels = candidates.map((c) => `${c.pattern} (offset ${c.offset})`);
        const idx = await interactiveSelectFromList(
          t("candidate_patterns", lang),
          labels,
        );
        const selected = candidates[idx];
        const match = selected.pattern.match(/\{\.\.\.(\w+),\.\.\.(\w+)\}/);
        if (!match) {
          console.error(`❌ ${t("pattern_not_found", lang)}`);
          process.exit(1);
        }
        patterns = [{
          pattern: selected.pattern,
          reversed: `{...${match[2]},...${match[1]}}`,
          offset: selected.offset,
        }];
      }

      for (const p of patterns) {
        console.log(`  ${t("pattern_found", lang)} ${p.pattern} (offset ${p.offset})`);
      }

      if (!dryRun) {
        // Backup
        console.log(`\n${t("creating_backup", lang)}`);
        try {
          binaryBackupPath = await backupBinary(binaryPath);
          console.log(`  ${t("backup_created", lang)} ${binaryBackupPath}`);
        } catch {
          console.error(`❌ ${t("backup_failed", lang)}`);
          process.exit(1);
        }

        // Patch all instances
        console.log(`\n${t("patching_binary", lang)}`);
        for (const p of patterns) {
          const result = await patchSpreadOrder(
            binaryPath,
            p.pattern,
            p.reversed,
            p.offset,
          );
          if (!result.success) {
            console.error(`❌ ${t("patch_failed", lang)} ${result.message}`);
            await restoreBinary(binaryPath, binaryBackupPath!);
            process.exit(1);
          }
          console.log(`  ${t("patch_success", lang)} ${result.message}`);
        }

        // Codesign
        if (needsCodesign()) {
          console.log(`\n${t("codesigning", lang)}`);
          try {
            await codesign(binaryPath);
            const valid = await verifyCodesign(binaryPath);
            if (!valid) throw new Error("Codesign verification failed");
            console.log(`  ${t("codesign_success", lang)}`);
          } catch {
            console.error(`❌ ${t("codesign_failed", lang)}`);
            await restoreBinary(binaryPath, binaryBackupPath!);
            process.exit(1);
          }
        }

        // Verify binary
        console.log(`\n${t("verifying", lang)}`);
        const execOk = await verifyBinaryExecutable(binaryPath);
        if (!execOk) {
          console.error(`❌ ${t("verify_failed", lang)}`);
          await restoreBinary(binaryPath, binaryBackupPath!);
          if (needsCodesign()) await codesign(binaryPath);
          process.exit(1);
        }
        console.log(`  ${t("verify_success", lang)}`);
      } else {
        for (const p of patterns) {
          console.log(`  [DRY RUN] Would patch: ${p.pattern} → ${p.reversed} (offset ${p.offset})`);
        }
      }
    }
  }

  // === Collect buddy attributes ===
  let bones: BuddyBones;
  let soul: { name: string; personality: string };

  const hasAllFlags =
    options.species && options.rarity && options.eye && options.hat !== undefined;

  if (hasAllFlags) {
    // Validate flag values
    if (!SPECIES.includes(options.species as any)) {
      console.error(`❌ Invalid species: ${options.species}. Valid: ${SPECIES.join(", ")}`);
      process.exit(1);
    }
    if (!RARITIES.includes(options.rarity as any)) {
      console.error(`❌ Invalid rarity: ${options.rarity}. Valid: ${RARITIES.join(", ")}`);
      process.exit(1);
    }
    if (!EYES.includes(options.eye as any)) {
      console.error(`❌ Invalid eye: ${options.eye}. Valid: ${EYES.join(", ")}`);
      process.exit(1);
    }
    if (options.hat && !HATS.includes(options.hat as any)) {
      console.error(`❌ Invalid hat: ${options.hat}. Valid: ${HATS.join(", ")}`);
      process.exit(1);
    }

    bones = {
      species: options.species as any,
      rarity: options.rarity as any,
      eye: options.eye as any,
      hat: (options.hat ?? "none") as any,
      shiny: options.shiny ?? false,
      stats: { DEBUGGING: 50, PATIENCE: 50, CHAOS: 50, WISDOM: 50, SNARK: 50 },
    };
    soul = {
      name: sanitizeText(options.name ?? "Buddy", MAX_NAME_LENGTH),
      personality: sanitizeText(
        options.personality ?? "A friendly companion who loves to help debug code.",
        MAX_PERSONALITY_LENGTH,
      ),
    };
  } else {
    // Interactive mode
    bones = await interactiveSelectBones(lang);
    soul = await interactiveSelectSoul(lang);
  }

  // Preview
  const companion: Companion = {
    ...bones,
    ...soul,
    hatchedAt: Date.now(),
  };

  console.log("\n" + formatBuddyCard(companion, lang));

  // Confirm
  if (!dryRun) {
    const confirmed = await interactiveConfirm(lang);
    if (!confirmed) {
      console.log(`\n${t("aborted", lang)}`);
      process.exit(0);
    }

    // Backup JSON
    console.log(`\n${t("creating_backup", lang)} (~/.claude.json)`);
    let jsonBackupPath: string;
    try {
      jsonBackupPath = await backupClaudeJson();
      console.log(`  ${t("backup_created", lang)} ${jsonBackupPath}`);
    } catch {
      console.error(`❌ ${t("backup_failed", lang)}`);
      process.exit(1);
    }

    // Write JSON
    console.log(`\n${t("writing_json", lang)}`);
    try {
      await setCompanion(companion);
      console.log(`  ${t("json_success", lang)}`);
    } catch {
      console.error(`❌ Restoring JSON from backup...`);
      await restoreClaudeJson(jsonBackupPath);
      process.exit(1);
    }

    // Keep only the original (oldest) backup
    await pruneBinaryBackups(binaryPath).catch(() => {});
    await pruneClaudeJsonBackups().catch(() => {});
  } else {
    console.log(`\n  [DRY RUN] Would write to ~/.claude.json:`);
    console.log(JSON.stringify(companion, null, 2));
  }

  console.log(`\n🎉 ${t("done", lang)}`);
}
