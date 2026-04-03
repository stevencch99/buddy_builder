import { describe, expect, test } from "bun:test";
import { t } from "../../src/utils/i18n.ts";

describe("i18n", () => {
  test("returns English translation for 'en'", () => {
    const result = t("welcome", "en");
    expect(result).toBe("Buddy Builder - Claude Code Companion Customizer");
  });

  test("returns Chinese translation for 'zh-TW'", () => {
    const result = t("welcome", "zh-TW");
    expect(result).toBe("Buddy Builder - Claude Code 夥伴自定義工具");
  });

  test("returns key as fallback for unknown key", () => {
    const result = t("nonexistent_key", "en");
    expect(result).toBe("nonexistent_key");
  });

  test("all message keys have both en and zh-TW", () => {
    // Spot-check critical keys exist in both languages
    const keys = [
      "welcome",
      "dry_run_notice",
      "detecting_binary",
      "binary_found",
      "binary_not_found",
      "salt_not_found",
      "creating_backup",
      "backup_created",
      "patching_binary",
      "patch_success",
      "done",
      "aborted",
      "select_species",
      "select_rarity",
    ];

    for (const key of keys) {
      const en = t(key, "en");
      const zhTW = t(key, "zh-TW");
      expect(en).not.toBe(key); // should not fall back to key
      expect(zhTW).not.toBe(key);
      expect(en).not.toBe(zhTW); // translations should differ
    }
  });
});
