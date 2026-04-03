import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile, rm, chmod } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { needsCodesign, findClaudeBinary } from "../../src/utils/platform.ts";

describe("needsCodesign", () => {
  test("returns boolean", () => {
    expect(typeof needsCodesign()).toBe("boolean");
  });

  test("returns true on macOS", () => {
    if (process.platform === "darwin") {
      expect(needsCodesign()).toBe(true);
    }
  });
});

describe("findClaudeBinary", () => {
  test("returns override path when file exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "buddy-test-"));
    const fakeBinary = join(dir, "fake-claude");
    await writeFile(fakeBinary, "fake");

    const result = await findClaudeBinary(fakeBinary);
    expect(result).toBe(fakeBinary);

    await rm(dir, { recursive: true, force: true });
  });

  test("throws when override path does not exist", async () => {
    await expect(
      findClaudeBinary("/nonexistent/path/claude"),
    ).rejects.toThrow("Binary not found at");
  });

  test("auto-detects claude binary when no override", async () => {
    // This test only works if claude is installed
    try {
      const result = await findClaudeBinary();
      expect(result).toContain("claude");
    } catch (e) {
      // If claude is not installed, the error should be descriptive
      expect((e as Error).message).toContain("Claude binary not found");
    }
  });
});
