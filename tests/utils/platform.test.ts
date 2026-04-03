import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, rm, symlink, realpath } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { needsCodesign, findClaudeBinary, isBinaryExecutable } from "../../src/utils/platform.ts";

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

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "buddy-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function tmpFile(name: string): string {
  return join(tmpDir, name);
}

function machoMagic(size = 64): Buffer {
  const buf = Buffer.alloc(size);
  buf[0] = 0xfe; buf[1] = 0xed; buf[2] = 0xfa; buf[3] = 0xcf;
  return buf;
}

describe("isBinaryExecutable", () => {
  test("rejects text files", async () => {
    const f = tmpFile("script.sh");
    await writeFile(f, "#!/bin/bash\necho hello");
    expect(await isBinaryExecutable(f)).toBe(false);
  });

  test.each([
    { name: "Mach-O 64-bit", bytes: [0xfe, 0xed, 0xfa, 0xcf] },
    { name: "Mach-O 32-bit", bytes: [0xfe, 0xed, 0xfa, 0xce] },
    { name: "ELF", bytes: [0x7f, 0x45, 0x4c, 0x46] },
    { name: "Universal (fat)", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  ])("accepts $name magic bytes", async ({ bytes }) => {
    const f = tmpFile("bin");
    await writeFile(f, Buffer.from([...bytes, 0, 0, 0, 0]));
    expect(await isBinaryExecutable(f)).toBe(true);
  });

  test("rejects empty file", async () => {
    const f = tmpFile("empty");
    await writeFile(f, "");
    expect(await isBinaryExecutable(f)).toBe(false);
  });
});

describe("findClaudeBinary", () => {
  test("accepts override path with valid binary magic", async () => {
    const f = tmpFile("fake-claude");
    await writeFile(f, machoMagic());
    const result = await findClaudeBinary(f);
    expect(result).toContain("fake-claude");
  });

  test("rejects override path that is not a binary", async () => {
    const f = tmpFile("not-binary");
    await writeFile(f, "#!/bin/bash\necho hello");
    await expect(findClaudeBinary(f)).rejects.toThrow("Not a valid binary");
  });

  test("resolves symlinks for override path", async () => {
    const real = tmpFile("real-claude");
    const link = tmpFile("link-claude");
    await writeFile(real, machoMagic());
    await symlink(real, link);
    const result = await findClaudeBinary(link);
    expect(result).toBe(await realpath(real));
  });

  test("throws when override path does not exist", async () => {
    await expect(
      findClaudeBinary("/nonexistent/path/claude"),
    ).rejects.toThrow("Binary not found at");
  });

  test("auto-detects claude binary when no override", async () => {
    try {
      const result = await findClaudeBinary();
      expect(result).toContain("claude");
    } catch (e) {
      expect((e as Error).message).toContain("Claude binary not found");
    }
  });
});
