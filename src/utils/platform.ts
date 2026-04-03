import { $ } from "bun";
import { realpath } from "node:fs/promises";

export function needsCodesign(): boolean {
  return process.platform === "darwin";
}

export async function findClaudeBinary(
  overridePath?: string,
): Promise<string> {
  if (overridePath) {
    const file = Bun.file(overridePath);
    if (await file.exists()) return overridePath;
    throw new Error(`Binary not found at: ${overridePath}`);
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
