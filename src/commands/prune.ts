import { stat } from "node:fs/promises";
import type { Lang } from "../core/types.ts";
import { listBackups, pruneBinaryBackups } from "../core/binary.ts";
import { listClaudeJsonBackups, pruneClaudeJsonBackups } from "../core/claude-json.ts";
import { findClaudeBinary } from "../utils/platform.ts";
import { interactiveSelectFromList, closeReadline } from "../ui/interactive.ts";
import { t } from "../utils/i18n.ts";

export interface PruneOptions {
  lang: Lang;
  claudePath?: string;
  keep?: number;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function totalSize(paths: string[]): Promise<number> {
  let total = 0;
  for (const p of paths) {
    try {
      const s = await stat(p);
      total += s.size;
    } catch { /* skip missing */ }
  }
  return total;
}

export async function prune(options: PruneOptions): Promise<void> {
  const { lang } = options;
  const keep = options.keep ?? 1;

  let binaryPath: string;
  try {
    binaryPath = await findClaudeBinary(options.claudePath);
  } catch (e) {
    console.error(`\u274C ${t("binary_not_found", lang)}`);
    console.error(`   ${(e as Error).message}`);
    process.exit(1);
  }

  const binaryBackups = await listBackups(binaryPath);   // newest-first
  const jsonBackups = await listClaudeJsonBackups();      // newest-first

  // Backups to remove = all except the oldest `keep`
  const binaryToRemove = binaryBackups.slice(0, Math.max(0, binaryBackups.length - keep));
  const jsonToRemove = jsonBackups.slice(0, Math.max(0, jsonBackups.length - keep));

  if (binaryToRemove.length === 0 && jsonToRemove.length === 0) {
    console.log(`\n  Nothing to prune (${binaryBackups.length} binary + ${jsonBackups.length} JSON, keeping oldest ${keep}).`);
    return;
  }

  // Show summary
  console.log(`\n  Backup summary (keeping oldest ${keep}):\n`);

  if (binaryBackups.length > 0) {
    const removeBytes = await totalSize(binaryToRemove);
    const keepPaths = binaryBackups.slice(binaryBackups.length - keep);
    console.log(`  Binary: ${binaryBackups.length} total`);
    console.log(`    Keep:   ${keepPaths.length} (original)`);
    console.log(`    Remove: ${binaryToRemove.length} (${formatSize(removeBytes)})`);
  }

  if (jsonBackups.length > 0) {
    const removeBytes = await totalSize(jsonToRemove);
    const keepPaths = jsonBackups.slice(jsonBackups.length - keep);
    console.log(`  JSON:   ${jsonBackups.length} total`);
    console.log(`    Keep:   ${keepPaths.length} (original)`);
    console.log(`    Remove: ${jsonToRemove.length} (${formatSize(removeBytes)})`);
  }

  // Confirm
  const choices = ["Yes, prune", "No, cancel"];
  const idx = await interactiveSelectFromList("\n  Proceed?", choices);
  closeReadline();

  if (idx !== 0) {
    console.log(`\n  ${t("aborted", lang)}`);
    return;
  }

  if (binaryToRemove.length > 0) {
    await pruneBinaryBackups(binaryPath, keep);
    console.log(`  Removed ${binaryToRemove.length} binary backup(s).`);
  }
  if (jsonToRemove.length > 0) {
    await pruneClaudeJsonBackups(keep);
    console.log(`  Removed ${jsonToRemove.length} JSON backup(s).`);
  }

  console.log(`\n  Done.`);
}
