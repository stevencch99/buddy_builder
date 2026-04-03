import { describe, expect, test } from "bun:test";
import { formatBuddyCard, formatCompanionJson } from "../../src/ui/display.ts";
import type { BuddyBones, Companion } from "../../src/core/types.ts";

const baseBones: BuddyBones = {
  species: "capybara",
  rarity: "legendary",
  eye: "@",
  hat: "tinyduck",
  shiny: true,
  stats: {
    DEBUGGING: 80,
    PATIENCE: 60,
    CHAOS: 100,
    WISDOM: 40,
    SNARK: 70,
  },
};

describe("formatBuddyCard", () => {
  test("includes species", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("capybara");
  });

  test("includes rarity", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("legendary");
  });

  test("includes eye style", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("@");
  });

  test("includes hat", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("tinyduck");
  });

  test("shows shiny tag when shiny", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("SHINY");
    expect(card).toContain("Yes");
  });

  test("hides shiny tag when not shiny", () => {
    const card = formatBuddyCard({ ...baseBones, shiny: false });
    expect(card).not.toContain("SHINY");
    expect(card).toContain("No");
  });

  test("includes all stat names", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("DEBUGGING");
    expect(card).toContain("PATIENCE");
    expect(card).toContain("CHAOS");
    expect(card).toContain("WISDOM");
    expect(card).toContain("SNARK");
  });

  test("includes stat values", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("80");
    expect(card).toContain("100");
  });

  test("shows name when provided", () => {
    const card = formatBuddyCard({ ...baseBones, name: "Snazzle" });
    expect(card).toContain("Snazzle");
  });

  test("shows ??? when name not provided", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("???");
  });

  test("includes personality when provided", () => {
    const card = formatBuddyCard({
      ...baseBones,
      personality: "Loves to vibe",
    });
    expect(card).toContain("Loves to vibe");
  });

  test("omits personality line when not provided", () => {
    const card = formatBuddyCard(baseBones);
    // Should have border lines but no personality content
    const lines = card.split("\n");
    const contentLines = lines.filter((l) => !l.includes("═") && !l.includes("║"));
    // No personality line means only stat/attribute lines
    expect(card).not.toContain("undefined");
  });

  test("contains box-drawing border characters", () => {
    const card = formatBuddyCard(baseBones);
    expect(card).toContain("╔");
    expect(card).toContain("╗");
    expect(card).toContain("╚");
    expect(card).toContain("╝");
    expect(card).toContain("╠");
    expect(card).toContain("╣");
  });
});

describe("formatCompanionJson", () => {
  test("returns valid JSON string", () => {
    const companion: Companion = {
      ...baseBones,
      name: "Snazzle",
      personality: "A chill capybara",
      hatchedAt: 1700000000000,
    };
    const json = formatCompanionJson(companion);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("Snazzle");
    expect(parsed.species).toBe("capybara");
    expect(parsed.hatchedAt).toBe(1700000000000);
  });

  test("is pretty-printed with 2-space indent", () => {
    const companion: Companion = {
      ...baseBones,
      name: "Test",
      personality: "test",
      hatchedAt: 0,
    };
    const json = formatCompanionJson(companion);
    expect(json).toContain("  ");
    expect(json.split("\n").length).toBeGreaterThan(1);
  });
});
