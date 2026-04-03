import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  backupBinary,
  restoreBinary,
  listBackups,
  detectSpreadPattern,
  detectSpreadPatterns,
  detectSpreadPatternsFromContent,
  isAlreadyPatched,
  isAlreadyPatchedFromContent,
  findCandidatePatterns,
  patchSpreadOrder,
  verifySaltExists,
} from "../../src/core/binary.ts";

let tmpDir: string;
let binaryPath: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "buddy-test-"));
  binaryPath = join(tmpDir, "claude-binary");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function writeBinary(content: string): Promise<void> {
  return writeFile(binaryPath, content, "latin1");
}

// ---------------------------------------------------------------------------
// verifySaltExists
// ---------------------------------------------------------------------------
describe("verifySaltExists", () => {
  test("returns true when salt is present", async () => {
    await writeBinary('some code friend-2026-401 more code');
    expect(await verifySaltExists(binaryPath)).toBe(true);
  });

  test("returns false when salt is absent", async () => {
    await writeBinary("some code without the salt string");
    expect(await verifySaltExists(binaryPath)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectSpreadPattern
// ---------------------------------------------------------------------------
describe("detectSpreadPattern (singular wrapper)", () => {
  test("detects unpatched pattern near salt", async () => {
    await writeBinary('let H=T_().companion;friend-2026-401 {...H,...bones} suffix');
    const result = await detectSpreadPattern(binaryPath);
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("{...H,...bones}");
    expect(result!.reversed).toBe("{...bones,...H}");
  });

  test("detects minified names", async () => {
    await writeBinary('let H=T_().companion;friend-2026-401 {...H,..._} suffix');
    const result = await detectSpreadPattern(binaryPath);
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("{...H,..._}");
    expect(result!.reversed).toBe("{..._,...H}");
  });

  test("works when same pattern appears many times globally but once near salt", async () => {
    const farAway = "{...H,..._} ".repeat(17);
    const padding = "x".repeat(20000);
    await writeBinary(`${farAway}${padding}let H=T_().companion;friend-2026-401 {...H,..._} suffix`);
    const result = await detectSpreadPattern(binaryPath);
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("{...H,..._}");
    expect(result!.offset).toBeGreaterThan(20000);
  });

  test("returns null when no salt and no pattern", async () => {
    await writeBinary("no relevant patterns here");
    const result = await detectSpreadPattern(binaryPath);
    expect(result).toBeNull();
  });

  test("returns null when pattern is already patched", async () => {
    await writeBinary('let H=T_().companion;friend-2026-401 {..._,...H} suffix');
    const result = await detectSpreadPattern(binaryPath);
    expect(result).toBeNull();
  });
});

describe("detectSpreadPatterns (multi-instance)", () => {
  test("detects unpatched patterns near ALL salt strings", async () => {
    const padding = "x".repeat(20000);
    const block1 = 'let H=T_().companion;{...H,..._}friend-2026-401';
    const block2 = 'let H=T_().companion;{...H,..._}friend-2026-401';
    await writeBinary(`${block1}${padding}${block2}`);
    const results = await detectSpreadPatterns(binaryPath);
    expect(results).toHaveLength(2);
    expect(results[0].pattern).toBe("{...H,..._}");
    expect(results[1].pattern).toBe("{...H,..._}");
    expect(results[1].offset).toBeGreaterThan(results[0].offset);
  });

  test("skips already-patched copies (JSON var is second)", async () => {
    const padding = "x".repeat(20000);
    // First copy: already patched (JSON var H is second)
    const patched = 'let H=T_().companion;{..._,...H}friend-2026-401';
    // Second copy: unpatched (JSON var H is first)
    const unpatched = 'let H=T_().companion;{...H,..._}friend-2026-401';
    await writeBinary(`${patched}${padding}${unpatched}`);
    const results = await detectSpreadPatterns(binaryPath);
    expect(results).toHaveLength(1);
    expect(results[0].pattern).toBe("{...H,..._}");
    expect(results[0].offset).toBeGreaterThan(20000);
  });

  test("returns empty when ALL copies already patched", async () => {
    const padding = "x".repeat(20000);
    const patched = 'let H=T_().companion;{..._,...H}friend-2026-401';
    await writeBinary(`${patched}${padding}${patched}`);
    const results = await detectSpreadPatterns(binaryPath);
    expect(results).toHaveLength(0);
  });

  test("deduplicates by offset when salt windows overlap", async () => {
    await writeBinary('let H=T_().companion;{...H,..._} friend-2026-401 friend-2026-401');
    const results = await detectSpreadPatterns(binaryPath);
    expect(results).toHaveLength(1);
  });

  test("returns empty when no salt exists", () => {
    const results = detectSpreadPatternsFromContent("no salt here");
    expect(results).toEqual([]);
  });

  test("handles different minified names in each copy", async () => {
    const padding = "x".repeat(20000);
    const block1 = 'let H=T_().companion;{...H,..._}friend-2026-401';
    const block2 = 'let A=T_().companion;{...A,...B}friend-2026-401';
    await writeBinary(`${block1}${padding}${block2}`);
    const results = await detectSpreadPatterns(binaryPath);
    expect(results).toHaveLength(2);
    expect(results[0].pattern).toBe("{...H,..._}");
    expect(results[1].pattern).toBe("{...A,...B}");
  });

  test("without unpatchedOnly flag returns ALL patterns", () => {
    const padding = "x".repeat(20000);
    const patched = 'let H=T_().companion;{..._,...H}friend-2026-401';
    const unpatched = 'let H=T_().companion;{...H,..._}friend-2026-401';
    const content = `${patched}${padding}${unpatched}`;
    // unpatchedOnly=false returns both
    const all = detectSpreadPatternsFromContent(content, false);
    expect(all).toHaveLength(2);
    // unpatchedOnly=true returns only the unpatched one
    const unpatched_only = detectSpreadPatternsFromContent(content, true);
    expect(unpatched_only).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// isAlreadyPatched
// ---------------------------------------------------------------------------
describe("isAlreadyPatched", () => {
  // Realistic template: companion assignment + spread + salt
  const patchedBlock = (jsonVar: string, bonesVar: string) =>
    `let ${jsonVar}=T_().companion;let{bones:${bonesVar}}=x();return{...${bonesVar},...${jsonVar}}`;
  const unpatchedBlock = (jsonVar: string, bonesVar: string) =>
    `let ${jsonVar}=T_().companion;let{bones:${bonesVar}}=x();return{...${jsonVar},...${bonesVar}}`;

  test("returns true when JSON var is second (patched)", async () => {
    await writeBinary(`${patchedBlock("H", "_")}friend-2026-401`);
    expect(await isAlreadyPatched(binaryPath)).toBe(true);
  });

  test("returns false when JSON var is first (unpatched)", async () => {
    await writeBinary(`${unpatchedBlock("H", "_")}friend-2026-401`);
    expect(await isAlreadyPatched(binaryPath)).toBe(false);
  });

  test("returns false when no salt string", async () => {
    await writeBinary(`${patchedBlock("H", "_")} no salt here`);
    expect(await isAlreadyPatched(binaryPath)).toBe(false);
  });

  test("returns false when no companion assignment near salt", async () => {
    await writeBinary("friend-2026-401 {..._,...H} no companion assign");
    expect(await isAlreadyPatched(binaryPath)).toBe(false);
  });

  test("returns false when only one of two copies is patched", async () => {
    const padding = "x".repeat(20000);
    const patched = `${patchedBlock("H", "_")}friend-2026-401`;
    const unpatched = `${unpatchedBlock("H", "_")}friend-2026-401`;
    await writeBinary(`${patched}${padding}${unpatched}`);
    expect(await isAlreadyPatched(binaryPath)).toBe(false);
  });

  test("returns true when ALL copies are patched", async () => {
    const padding = "x".repeat(20000);
    const p1 = `${patchedBlock("H", "_")}friend-2026-401`;
    const p2 = `${patchedBlock("H", "_")}friend-2026-401`;
    await writeBinary(`${p1}${padding}${p2}`);
    expect(await isAlreadyPatched(binaryPath)).toBe(true);
  });

  test("works with different minified variable names", async () => {
    await writeBinary(`${patchedBlock("Z", "Q")}friend-2026-401`);
    expect(await isAlreadyPatched(binaryPath)).toBe(true);
  });

  test("isAlreadyPatchedFromContent works synchronously", () => {
    const content = `${patchedBlock("H", "_")}friend-2026-401`;
    expect(isAlreadyPatchedFromContent(content)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findCandidatePatterns
// ---------------------------------------------------------------------------
describe("findCandidatePatterns", () => {
  test("finds patterns near salt string with offsets", async () => {
    await writeBinary('friend-2026-401 {...A,...B} and {...C,...D}');
    const candidates = await findCandidatePatterns(binaryPath);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].pattern).toBe("{...A,...B}");
    expect(candidates[1].pattern).toBe("{...C,...D}");
    expect(candidates[0].offset).toBeGreaterThanOrEqual(0);
  });

  test("returns empty when no salt", async () => {
    await writeBinary("{...A,...B}");
    const candidates = await findCandidatePatterns(binaryPath);
    expect(candidates).toEqual([]);
  });

  test("returns empty when salt exists but no spread patterns nearby", async () => {
    await writeBinary("friend-2026-401 no patterns");
    const candidates = await findCandidatePatterns(binaryPath);
    expect(candidates).toEqual([]);
  });

  test("finds candidates near ALL salt strings", async () => {
    const padding = "x".repeat(20000);
    await writeBinary(`{...A,...B}friend-2026-401${padding}{...C,...D}friend-2026-401`);
    const candidates = await findCandidatePatterns(binaryPath);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].pattern).toBe("{...A,...B}");
    expect(candidates[1].pattern).toBe("{...C,...D}");
  });

  test("deduplicates candidates from overlapping salt windows", async () => {
    await writeBinary('{...A,...B} friend-2026-401 friend-2026-401');
    const candidates = await findCandidatePatterns(binaryPath);
    expect(candidates).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// patchSpreadOrder
// ---------------------------------------------------------------------------
describe("patchSpreadOrder", () => {
  test("replaces pattern at given offset", async () => {
    await writeBinary("before {...H,..._} after");
    const offset = "before ".length;
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", offset);

    expect(result.success).toBe(true);
    expect(result.matchCount).toBe(1);

    const content = await readFile(binaryPath, "latin1");
    expect(content).toBe("before {..._,...H} after");
  });

  test("only patches at specified offset, not other occurrences", async () => {
    await writeBinary("{...H,..._} middle {...H,..._} end");
    // Patch only the second occurrence
    const offset = "{...H,..._} middle ".length;
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", offset);

    expect(result.success).toBe(true);
    const content = await readFile(binaryPath, "latin1");
    expect(content).toBe("{...H,..._} middle {..._,...H} end");
  });

  test("fails when pattern not at given offset", async () => {
    await writeBinary("no pattern here");
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", 0);
    expect(result.success).toBe(false);
    expect(result.matchCount).toBe(0);
  });

  test("fails when offset is wrong", async () => {
    await writeBinary("xxx{...H,..._}");
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", 0);
    expect(result.success).toBe(false);
  });

  test("does not modify file on failure", async () => {
    const original = "no pattern here";
    await writeBinary(original);
    await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", 0);
    const content = await readFile(binaryPath, "latin1");
    expect(content).toBe(original);
  });

  test("fails when pattern and replacement have different lengths", async () => {
    await writeBinary("{...H,..._}");
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{...bones,...H}", 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain("same length");
  });

  test("preserves binary bytes (latin1 round-trip)", async () => {
    // Build a string with high bytes (0x80-0xFF) surrounding the pattern
    const highBytes = Array.from({ length: 256 }, (_, i) => String.fromCharCode(i)).join("");
    const content = `${highBytes}{...H,..._}${highBytes}`;
    await writeBinary(content);

    const offset = highBytes.length;
    const result = await patchSpreadOrder(binaryPath, "{...H,..._}", "{..._,...H}", offset);
    expect(result.success).toBe(true);

    const patched = await readFile(binaryPath, "latin1");
    expect(patched).toBe(`${highBytes}{..._,...H}${highBytes}`);
    // Verify high bytes are preserved
    for (let i = 0; i < 256; i++) {
      expect(patched.charCodeAt(i)).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// backupBinary / restoreBinary / listBackups
// ---------------------------------------------------------------------------
describe("backupBinary", () => {
  test("creates a backup file with timestamp suffix", async () => {
    await writeBinary("original content");
    const backupPath = await backupBinary(binaryPath);

    expect(backupPath).toContain(".bak.");
    const backupContent = await readFile(backupPath, "latin1");
    expect(backupContent).toBe("original content");
  });

  test("does not modify the original", async () => {
    await writeBinary("original content");
    await backupBinary(binaryPath);
    const content = await readFile(binaryPath, "latin1");
    expect(content).toBe("original content");
  });
});

describe("restoreBinary", () => {
  test("restores original content from backup", async () => {
    await writeBinary("original");
    const backupPath = await backupBinary(binaryPath);

    // Modify original
    await writeBinary("modified");
    expect(await readFile(binaryPath, "latin1")).toBe("modified");

    // Restore
    await restoreBinary(binaryPath, backupPath);
    expect(await readFile(binaryPath, "latin1")).toBe("original");
  });
});

describe("listBackups", () => {
  test("lists backup files", async () => {
    await writeBinary("content");
    const b1 = await backupBinary(binaryPath);

    const backups = await listBackups(binaryPath);
    expect(backups.length).toBeGreaterThanOrEqual(1);
    expect(backups).toContain(b1);
  });

  test("returns empty array when no backups exist", async () => {
    await writeBinary("content");
    const backups = await listBackups(binaryPath);
    expect(backups).toEqual([]);
  });
});
