import { readFile, writeFile, rename, copyFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import type { Companion } from "./types.ts";

const CLAUDE_JSON_PATH = join(homedir(), ".claude.json");
function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "").slice(0, 18);
}

export async function readClaudeJson(): Promise<Record<string, unknown>> {
  let content: string;
  try {
    content = await readFile(CLAUDE_JSON_PATH, "utf-8");
  } catch {
    throw new Error(`Cannot read ${CLAUDE_JSON_PATH}. Is Claude Code installed?`);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`${CLAUDE_JSON_PATH} is corrupted (invalid JSON). Restore a backup or re-authenticate.`);
  }
}

export async function getUserId(): Promise<string> {
  const config = await readClaudeJson();
  const account = config.oauthAccount as Record<string, unknown> | undefined;
  const uuid = account?.accountUuid as string | undefined;

  if (!uuid) {
    throw new Error(
      "userId not found in ~/.claude.json. Please log in to Claude Code first.",
    );
  }
  return uuid;
}

export async function getCompanion(): Promise<Companion | null> {
  const config = await readClaudeJson();
  return (config.companion as Companion) ?? null;
}

export async function backupClaudeJson(): Promise<string> {
  const backupPath = `${CLAUDE_JSON_PATH}.buddy-backup.${timestamp()}`;
  await copyFile(CLAUDE_JSON_PATH, backupPath);
  return backupPath;
}

/**
 * Write companion data to ~/.claude.json using atomic write (temp + rename).
 * Merges with existing config, does not overwrite other fields.
 */
export async function setCompanion(companion: Companion): Promise<void> {
  const config = await readClaudeJson();
  config.companion = companion;

  const tmpPath = join(tmpdir(), `.claude-json-${randomUUID()}.tmp`);
  const json = JSON.stringify(config, null, 2) + "\n";
  await writeFile(tmpPath, json, "utf-8");
  await rename(tmpPath, CLAUDE_JSON_PATH);
}

export async function restoreClaudeJson(backupPath: string): Promise<void> {
  const content = await readFile(backupPath, "utf-8");
  JSON.parse(content); // Throws if invalid — reject corrupted backups
  await copyFile(backupPath, CLAUDE_JSON_PATH);
}

export async function listClaudeJsonBackups(): Promise<string[]> {
  const dir = homedir();
  const result = await (await import("node:fs/promises")).readdir(dir);
  return result
    .filter((f) => f.startsWith(".claude.json.buddy-backup."))
    .sort()
    .reverse()
    .map((f) => join(dir, f));
}

/** Remove newer backups, keeping only the oldest `keep` (the original). */
export async function pruneClaudeJsonBackups(keep: number = 1): Promise<void> {
  const all = await listClaudeJsonBackups(); // sorted newest-first
  const toRemove = all.slice(0, Math.max(0, all.length - keep));
  for (const old of toRemove) {
    await unlink(old).catch(() => {});
  }
}
