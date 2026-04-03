import type { Lang } from "../core/types.ts";
import { listBackups, restoreBinary } from "../core/binary.ts";
import { listClaudeJsonBackups, restoreClaudeJson } from "../core/claude-json.ts";
import {
  findClaudeBinary,
  codesign,
  needsCodesign,
} from "../utils/platform.ts";
import { interactiveSelectFromList, closeReadline } from "../ui/interactive.ts";
import { t } from "../utils/i18n.ts";

export interface RestoreOptions {
  lang: Lang;
  claudePath?: string;
}

export async function restore(options: RestoreOptions): Promise<void> {
  const { lang } = options;

  let binaryPath: string;
  try {
    binaryPath = await findClaudeBinary(options.claudePath);
  } catch (e) {
    console.error(`❌ ${t("binary_not_found", lang)}`);
    console.error(`   ${(e as Error).message}`);
    process.exit(1);
  }

  // List binary backups
  const binaryBackups = await listBackups(binaryPath);
  const jsonBackups = await listClaudeJsonBackups();

  if (binaryBackups.length === 0 && jsonBackups.length === 0) {
    console.log(`\n${t("no_backups", lang)}`);
    closeReadline();
    process.exit(0);
  }

  // Restore binary
  if (binaryBackups.length > 0) {
    console.log(`\n📦 Binary backups found: ${binaryBackups.length}`);
    const idx = await interactiveSelectFromList(
      t("select_backup", lang),
      binaryBackups,
    );

    try {
      await restoreBinary(binaryPath, binaryBackups[idx]);
      if (needsCodesign()) {
        await codesign(binaryPath);
      }
      console.log(`✅ Binary ${t("restore_success", lang)}`);
    } catch {
      console.error(`❌ Binary ${t("restore_failed", lang)}`);
      closeReadline();
      process.exit(1);
    }
  }

  // Restore JSON
  if (jsonBackups.length > 0) {
    console.log(`\n📦 JSON backups found: ${jsonBackups.length}`);
    const idx = await interactiveSelectFromList(
      t("select_backup", lang),
      jsonBackups,
    );

    try {
      await restoreClaudeJson(jsonBackups[idx]);
      console.log(`✅ JSON ${t("restore_success", lang)}`);
    } catch {
      console.error(`❌ JSON ${t("restore_failed", lang)}`);
      closeReadline();
      process.exit(1);
    }
  }

  console.log(`\n🎉 ${t("done", lang)}`);
  closeReadline();
}
