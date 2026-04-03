import type { Companion, BuddyBones, Lang } from "../core/types.ts";
import { STAT_NAMES } from "../core/constants.ts";

const RARITY_COLORS: Record<string, string> = {
  common: "\x1b[37m",     // white
  uncommon: "\x1b[32m",   // green
  rare: "\x1b[34m",       // blue
  epic: "\x1b[35m",       // magenta
  legendary: "\x1b[33m",  // yellow
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const BOX_WIDTH = 38; // inner width between ║ borders

function statBar(value: number): string {
  const filled = Math.round(value / 5);
  const empty = 20 - filled;
  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

/** Terminal display width of a single code point. */
function charWidth(code: number): number {
  // Zero-width characters
  if (code === 0x200B || code === 0x200D || code === 0xFEFF) return 0;
  // Variation selectors (emoji modifiers)
  if (code >= 0xFE00 && code <= 0xFE0F) return 0;
  // Combining diacritical marks
  if (code >= 0x0300 && code <= 0x036F) return 0;
  // CJK Unified Ideographs
  if (code >= 0x4E00 && code <= 0x9FFF) return 2;
  // CJK Extension A
  if (code >= 0x3400 && code <= 0x4DBF) return 2;
  // CJK Compatibility Ideographs
  if (code >= 0xF900 && code <= 0xFAFF) return 2;
  // CJK Unified Ideographs Extension B+
  if (code >= 0x20000 && code <= 0x2FA1F) return 2;
  // Hangul Syllables
  if (code >= 0xAC00 && code <= 0xD7AF) return 2;
  // Fullwidth Forms
  if (code >= 0xFF01 && code <= 0xFF60) return 2;
  if (code >= 0xFFE0 && code <= 0xFFE6) return 2;
  // Misc Symbols & Dingbats (includes ✨ U+2728)
  if (code >= 0x2600 && code <= 0x27BF) return 2;
  // Emoji & Symbols blocks
  if (code >= 0x1F300 && code <= 0x1FAFF) return 2;
  // Enclosed Ideographic Supplement
  if (code >= 0x1F200 && code <= 0x1F2FF) return 2;
  return 1;
}

/** Calculate terminal display width of a string, ignoring ANSI escape sequences. */
function displayWidth(str: string): number {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  let width = 0;
  for (const char of stripped) {
    width += charWidth(char.codePointAt(0)!);
  }
  return width;
}

/** Pad a content string (may contain ANSI codes) to fill the box, then close with ║. */
function boxLine(content: string): string {
  const pad = BOX_WIDTH - displayWidth(content);
  return `${BOLD}║${RESET}${content}${" ".repeat(Math.max(0, pad))}${BOLD}║${RESET}`;
}

const INDENT = "  "; // 2-space indent inside box
const TEXT_WIDTH = BOX_WIDTH - INDENT.length; // usable text columns per line

/**
 * Wrap plain text into multiple boxLine() calls, respecting display width.
 * Handles both word-boundary wrapping (Latin) and per-character wrapping (CJK).
 */
function wrapText(text: string, style: string = ""): string[] {
  const endStyle = style ? RESET : "";
  const lines: string[] = [];
  let currentLine = "";
  let currentWidth = 0;

  for (const char of text) {
    const w = charWidth(char.codePointAt(0)!);

    // Would this character overflow?
    if (currentWidth + w > TEXT_WIDTH) {
      // For Latin text: break at last space if possible
      const lastSpace = currentLine.lastIndexOf(" ");
      if (w === 1 && lastSpace > 0) {
        lines.push(boxLine(`${INDENT}${style}${currentLine.slice(0, lastSpace)}${endStyle}`));
        currentLine = currentLine.slice(lastSpace + 1) + char;
        currentWidth = displayWidth(currentLine);
      } else {
        lines.push(boxLine(`${INDENT}${style}${currentLine}${endStyle}`));
        currentLine = char;
        currentWidth = w;
      }
    } else {
      currentLine += char;
      currentWidth += w;
    }
  }

  if (currentLine) {
    lines.push(boxLine(`${INDENT}${style}${currentLine}${endStyle}`));
  }

  return lines;
}

export function formatBuddyCard(
  buddy: BuddyBones & Partial<Pick<Companion, "name" | "personality">>,
  lang: Lang = "en",
): string {
  const color = RARITY_COLORS[buddy.rarity] ?? "";
  const shinyTag = buddy.shiny ? " ✨ SHINY" : "";
  const nameDisplay = buddy.name ?? "???";

  const lines = [
    `${BOLD}╔${"═".repeat(BOX_WIDTH)}╗${RESET}`,
    boxLine(`  ${color}${nameDisplay}${RESET}${BOLD}${shinyTag}${RESET}`),
    `${BOLD}╠${"═".repeat(BOX_WIDTH)}╣${RESET}`,
    boxLine(`  Species:  ${buddy.species}`),
    boxLine(`  Rarity:   ${color}${buddy.rarity}${RESET}`),
    boxLine(`  Eyes:     ${buddy.eye}`),
    boxLine(`  Hat:      ${buddy.hat}`),
    boxLine(`  Shiny:    ${buddy.shiny ? "Yes ✨" : "No"}`),
    `${BOLD}╠${"═".repeat(BOX_WIDTH)}╣${RESET}`,
  ];

  for (const stat of STAT_NAMES) {
    const val = buddy.stats[stat];
    const bar = statBar(val);
    const padded = stat.padEnd(10);
    lines.push(boxLine(`  ${padded} ${bar} ${String(val).padStart(3)}`));
  }

  lines.push(`${BOLD}╠${"═".repeat(BOX_WIDTH)}╣${RESET}`);

  if (buddy.personality) {
    lines.push(...wrapText(buddy.personality, DIM));
  }

  lines.push(`${BOLD}╚${"═".repeat(BOX_WIDTH)}╝${RESET}`);

  return lines.join("\n");
}

export function formatCompanionJson(companion: Companion): string {
  return JSON.stringify(companion, null, 2);
}
