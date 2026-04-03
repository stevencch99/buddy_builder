import { $ } from "bun";
import { realpath } from "node:fs/promises";

export function needsCodesign(): boolean {
  return process.platform === "darwin";
}

/**
 * Check if a file looks like a real binary (Mach-O or ELF) by inspecting magic bytes.
 * Rejects scripts, text files, and other non-binary executables.
 */
export async function isBinaryExecutable(filePath: string): Promise<boolean> {
  const bytes = new Uint8Array(await Bun.file(filePath).slice(0, 4).arrayBuffer());
  if (bytes.length < 4) return false;

  // Read first 4 bytes as big-endian uint32
  const magic = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;

  // Mach-O 32-bit, 64-bit, and their little-endian variants
  if (
    magic === 0xfeedface ||
    magic === 0xfeedfacf ||
    magic === 0xcefaedfe ||
    magic === 0xcffaedfe ||
    magic === 0xcafebabe   // Universal (fat) binary (also Java class file — acceptable false positive)
  ) return true;

  // ELF: 0x7F 'E' 'L' 'F'
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) return true;

  return false;
}

export async function findClaudeBinary(
  overridePath?: string,
): Promise<string> {
  if (overridePath) {
    const file = Bun.file(overridePath);
    if (!(await file.exists())) {
      throw new Error(`Binary not found at: ${overridePath}`);
    }
    const resolved = await realpath(overridePath);
    if (!(await isBinaryExecutable(resolved))) {
      throw new Error(`Not a valid binary (expected Mach-O or ELF): ${resolved}`);
    }
    return resolved;
  }

  const result = await $`which claude`.quiet();
  const whichPath = result.text().trim();
  if (!whichPath) {
    throw new Error(
      "Claude binary not found. Is Claude Code installed? Use --claude-path to specify manually.",
    );
  }

  // Resolve symlinks using Node API (readlink -f unavailable on older macOS)
  try {
    return await realpath(whichPath);
  } catch {
    return whichPath;
  }
}

export async function codesign(binaryPath: string): Promise<void> {
  if (!needsCodesign()) return;

  await $`codesign --remove-signature ${binaryPath}`.quiet();
  await $`codesign -s - -f --preserve-metadata=entitlements ${binaryPath}`.quiet();
}

export async function verifyCodesign(binaryPath: string): Promise<boolean> {
  if (!needsCodesign()) return true;

  try {
    await $`codesign -v ${binaryPath}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function verifyBinaryExecutable(
  binaryPath: string,
): Promise<boolean> {
  try {
    await $`${binaryPath} --version`.quiet();
    return true;
  } catch {
    return false;
  }
}
