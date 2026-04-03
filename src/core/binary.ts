import { $ } from "bun";
import { readFile, writeFile, copyFile, unlink } from "node:fs/promises";
import type { PatchResult } from "./types.ts";

const SALT = "friend-2026-401";
function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "").slice(0, 18);
}

export async function backupBinary(binaryPath: string): Promise<string> {
  const backupPath = `${binaryPath}.bak.${timestamp()}`;
  await copyFile(binaryPath, backupPath);
  return backupPath;
}

export async function restoreBinary(
  binaryPath: string,
  backupPath: string,
): Promise<void> {
  await copyFile(backupPath, binaryPath);
}

export async function listBackups(binaryPath: string): Promise<string[]> {
  const dir = binaryPath.substring(0, binaryPath.lastIndexOf("/"));
  const basename = binaryPath.substring(binaryPath.lastIndexOf("/") + 1);
  const result = await $`ls -1t ${dir}`.quiet();
  return result
    .text()
    .split("\n")
    .filter((f) => f.startsWith(`${basename}.bak.`))
    .map((f) => `${dir}/${f}`);
}

/** Remove newer backups, keeping only the oldest `keep` (the original). */
export async function pruneBinaryBackups(binaryPath: string, keep: number = 1): Promise<void> {
  const all = await listBackups(binaryPath); // sorted newest-first
  const toRemove = all.slice(0, Math.max(0, all.length - keep));
  for (const old of toRemove) {
    await unlink(old).catch(() => {});
  }
}

export interface DetectedPattern {
  pattern: string;
  reversed: string;
  /** Absolute byte offset in the binary where this pattern occurs. */
  offset: number;
}

/**
 * Detect ALL spread patterns near every salt string in the binary.
 * The binary may embed the same JS bundle multiple times (e.g., at ~70MB and ~174MB).
 *
 * For each salt position, searches a 5KB window for spread patterns.
 * Returns all unique detected patterns (deduplicated by offset).
 */
export async function detectSpreadPatterns(
  binaryPath: string,
): Promise<DetectedPattern[]> {
  // IMPORTANT: Use latin1 to preserve all bytes 1:1. UTF-8 would replace
  // invalid sequences (0x80-0xFF) with U+FFFD, corrupting the binary.
  const content = await readFile(binaryPath, "latin1");
  return detectSpreadPatternsFromContent(content, true);
}

/**
 * @param unpatchedOnly - When true, only returns patterns where the JSON var
 *   (from `.companion` assignment) is in the first position (needs patching).
 *   Already-patched patterns (JSON var second) are skipped.
 */
export function detectSpreadPatternsFromContent(
  content: string,
  unpatchedOnly = false,
): DetectedPattern[] {
  const saltPositions = findAllPositions(content, SALT);
  if (saltPositions.length === 0) return [];

  const results: DetectedPattern[] = [];
  const seenOffsets = new Set<number>();
  const windowSize = 5000;

  for (const saltIndex of saltPositions) {
    const start = Math.max(0, saltIndex - windowSize);
    const end = Math.min(content.length, saltIndex + windowSize);
    const window = content.slice(start, end);

    // Identify the JSON variable from companion assignment
    let jsonVar: string | null = null;
    if (unpatchedOnly) {
      const companionAssign = window.match(/let\s+(\w+)\s*=\s*\w+\(\)\.companion/);
      if (companionAssign) jsonVar = companionAssign[1];
    }

    const windowMatches = [...window.matchAll(/\{\.\.\.(\w+),\.\.\.(\w+)\}/g)];
    for (const match of windowMatches) {
      const absOffset = start + match.index!;
      if (seenOffsets.has(absOffset)) continue;
      seenOffsets.add(absOffset);

      const [, varA, varB] = match;

      if (unpatchedOnly && jsonVar) {
        // Only include if the spread involves the JSON var
        if (varA !== jsonVar && varB !== jsonVar) continue;
        // Skip if already patched (JSON var is second = overrides bones)
        if (varB === jsonVar) continue;
      }

      results.push({
        pattern: `{...${varA},...${varB}}`,
        reversed: `{...${varB},...${varA}}`,
        offset: absOffset,
      });
    }
  }

  return results;
}

/**
 * Single-result wrapper for backward compatibility.
 * Returns the first detected pattern, or null.
 */
export async function detectSpreadPattern(
  binaryPath: string,
): Promise<DetectedPattern | null> {
  const all = await detectSpreadPatterns(binaryPath);
  return all.length > 0 ? all[0] : null;
}

/**
 * Check if ALL spread patterns near salt strings have been patched.
 * Returns true only when no unpatched (original-order) spreads remain.
 *
 * Detection strategy: find all spreads near salt, then check if each one
 * follows the pattern `return{...VAR,...JSON_VAR}` where JSON_VAR comes
 * from `T_().companion` — i.e., the JSON variable should be second (overriding).
 *
 * Simplified approach: if detectSpreadPatterns finds any patterns that look
 * like the original order (where the second var matches what follows companion
 * assignment), they're unpatched. But since we can't easily determine variable
 * semantics from minified code, we use a pragmatic check:
 * - Look for `let VAR=` + `.companion` near the spread to identify the JSON var
 * - If the JSON var is already second in the spread → patched
 * - If the JSON var is first → unpatched
 */
export async function isAlreadyPatched(binaryPath: string): Promise<boolean> {
  const content = await readFile(binaryPath, "latin1");
  return isAlreadyPatchedFromContent(content);
}

export function isAlreadyPatchedFromContent(content: string): boolean {
  const saltPositions = findAllPositions(content, SALT);
  if (saltPositions.length === 0) return false;

  const windowSize = 5000;
  let foundAnySpread = false;

  for (const saltIndex of saltPositions) {
    const start = Math.max(0, saltIndex - windowSize);
    const end = Math.min(content.length, saltIndex + windowSize);
    const window = content.slice(start, end);

    // Find the companion assignment: `let X=...companion`
    const companionAssign = window.match(/let\s+(\w+)\s*=\s*\w+\(\)\.companion/);
    if (!companionAssign) continue;
    const jsonVar = companionAssign[1];

    // Find spread patterns in this window
    const spreads = [...window.matchAll(/\{\.\.\.(\w+),\.\.\.(\w+)\}/g)];
    for (const spread of spreads) {
      const [, firstVar, secondVar] = spread;
      // The spread involves the JSON var
      if (firstVar !== jsonVar && secondVar !== jsonVar) continue;

      foundAnySpread = true;
      // Patched = JSON var is SECOND (overrides bones)
      // Unpatched = JSON var is FIRST (bones override it)
      if (secondVar !== jsonVar) {
        return false; // Found an unpatched instance
      }
    }
  }

  return foundAnySpread;
}

/**
 * Find all spread pattern candidates near ANY salt string for manual selection.
 */
export async function findCandidatePatterns(
  binaryPath: string,
): Promise<{ pattern: string; offset: number }[]> {
  const content = await readFile(binaryPath, "latin1");
  const saltPositions = findAllPositions(content, SALT);
  if (saltPositions.length === 0) return [];

  const results: { pattern: string; offset: number }[] = [];
  const seenOffsets = new Set<number>();
  const windowSize = 10000;

  for (const saltIndex of saltPositions) {
    const start = Math.max(0, saltIndex - windowSize);
    const end = Math.min(content.length, saltIndex + windowSize);
    const window = content.slice(start, end);

    const matches = [...window.matchAll(/\{\.\.\.(\w+),\.\.\.(\w+)\}/g)];
    for (const m of matches) {
      const absOffset = start + m.index!;
      if (seenOffsets.has(absOffset)) continue;
      seenOffsets.add(absOffset);
      results.push({ pattern: m[0], offset: absOffset });
    }
  }

  return results;
}

/**
 * Patch the spread order at a specific offset in the binary.
 * Only modifies the exact bytes at the given position.
 */
export async function patchSpreadOrder(
  binaryPath: string,
  pattern: string,
  reversed: string,
  offset: number,
): Promise<PatchResult> {
  if (pattern.length !== reversed.length) {
    return {
      success: false,
      matchCount: 0,
      message: `Pattern and replacement must be same length ("${pattern}" is ${pattern.length}, "${reversed}" is ${reversed.length}).`,
    };
  }

  const content = await readFile(binaryPath, "latin1");

  // Verify the pattern is actually at the expected offset
  const found = content.substring(offset, offset + pattern.length);
  if (found !== pattern) {
    return {
      success: false,
      matchCount: 0,
      message: `Pattern "${pattern}" not found at offset ${offset}. Found "${found}" instead.`,
    };
  }

  const patched =
    content.substring(0, offset) + reversed + content.substring(offset + pattern.length);
  await writeFile(binaryPath, patched, "latin1");

  return { success: true, matchCount: 1, message: `Patched: ${pattern} → ${reversed}` };
}

/**
 * Verify the salt string exists in the binary (version compatibility check).
 */
export async function verifySaltExists(
  binaryPath: string,
): Promise<boolean> {
  const content = await readFile(binaryPath, "latin1");
  return content.includes(SALT);
}

function findAllPositions(str: string, substr: string): number[] {
  const positions: number[] = [];
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    positions.push(pos);
    pos += substr.length;
  }
  return positions;
}
