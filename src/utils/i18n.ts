import type { Lang } from "../core/types.ts";

const messages: Record<string, { en: string; "zh-TW": string }> = {
  // General
  "welcome": {
    en: "Buddy Builder - Claude Code Companion Customizer",
    "zh-TW": "Buddy Builder - Claude Code 夥伴自定義工具",
  },
  "dry_run_notice": {
    en: "[DRY RUN] No files will be modified.",
    "zh-TW": "[模擬執行] 不會修改任何檔案。",
  },

  // Pre-flight
  "detecting_binary": {
    en: "Detecting Claude Code binary...",
    "zh-TW": "偵測 Claude Code binary...",
  },
  "binary_found": {
    en: "Binary found:",
    "zh-TW": "找到 Binary:",
  },
  "binary_not_found": {
    en: "Claude binary not found. Use --claude-path to specify.",
    "zh-TW": "找不到 Claude binary，請用 --claude-path 指定。",
  },
  "salt_not_found": {
    en: "Salt string not found in binary. This version may not support buddy.",
    "zh-TW": "Binary 中找不到 salt 字串，此版本可能不支援 buddy。",
  },
  "version_compatible": {
    en: "Version compatible (salt string found).",
    "zh-TW": "版本相容（找到 salt 字串）。",
  },

  // Backup
  "creating_backup": {
    en: "Creating backup...",
    "zh-TW": "建立備份...",
  },
  "backup_created": {
    en: "Backup created:",
    "zh-TW": "備份已建立:",
  },
  "backup_failed": {
    en: "Failed to create backup. Aborting.",
    "zh-TW": "備份建立失敗，中止操作。",
  },

  // Patching
  "already_patched": {
    en: "Binary is already patched. Skipping patch step.",
    "zh-TW": "Binary 已修改過，跳過 patch 步驟。",
  },
  "detecting_pattern": {
    en: "Detecting spread pattern...",
    "zh-TW": "偵測 spread pattern...",
  },
  "pattern_found": {
    en: "Pattern found:",
    "zh-TW": "找到 Pattern:",
  },
  "pattern_not_found": {
    en: "Could not auto-detect spread pattern.",
    "zh-TW": "無法自動偵測 spread pattern。",
  },
  "patching_binary": {
    en: "Patching binary...",
    "zh-TW": "修改 binary...",
  },
  "patch_success": {
    en: "Binary patched successfully.",
    "zh-TW": "Binary 修改成功。",
  },
  "patch_failed": {
    en: "Patch failed. Restoring from backup...",
    "zh-TW": "修改失敗，從備份還原...",
  },

  // Codesign
  "codesigning": {
    en: "Re-signing binary (macOS)...",
    "zh-TW": "重新簽名 binary (macOS)...",
  },
  "codesign_success": {
    en: "Codesign successful.",
    "zh-TW": "簽名成功。",
  },
  "codesign_failed": {
    en: "Codesign failed. Restoring from backup...",
    "zh-TW": "簽名失敗，從備份還原...",
  },

  // Verify
  "verifying": {
    en: "Verifying binary...",
    "zh-TW": "驗證 binary...",
  },
  "verify_success": {
    en: "Binary verification passed.",
    "zh-TW": "Binary 驗證通過。",
  },
  "verify_failed": {
    en: "Binary verification failed. Restoring from backup...",
    "zh-TW": "Binary 驗證失敗，從備份還原...",
  },

  // JSON
  "writing_json": {
    en: "Writing companion data to ~/.claude.json...",
    "zh-TW": "寫入 companion 資料到 ~/.claude.json...",
  },
  "json_success": {
    en: "Companion data written successfully.",
    "zh-TW": "Companion 資料寫入成功。",
  },

  // Restore
  "no_backups": {
    en: "No backups found.",
    "zh-TW": "找不到備份。",
  },
  "select_backup": {
    en: "Select a backup to restore:",
    "zh-TW": "選擇要還原的備份:",
  },
  "restore_success": {
    en: "Restored successfully.",
    "zh-TW": "還原成功。",
  },
  "restore_failed": {
    en: "Restore failed.",
    "zh-TW": "還原失敗。",
  },

  // Interactive
  "select_species": {
    en: "Select species:",
    "zh-TW": "選擇物種:",
  },
  "select_rarity": {
    en: "Select rarity:",
    "zh-TW": "選擇稀有度:",
  },
  "select_eye": {
    en: "Select eye style:",
    "zh-TW": "選擇眼睛樣式:",
  },
  "select_hat": {
    en: "Select hat:",
    "zh-TW": "選擇帽子:",
  },
  "select_shiny": {
    en: "Shiny?",
    "zh-TW": "閃光？",
  },
  "enter_name": {
    en: "Enter buddy name:",
    "zh-TW": "輸入夥伴名字:",
  },
  "enter_personality": {
    en: "Enter personality description:",
    "zh-TW": "輸入個性描述:",
  },
  "confirm_apply": {
    en: "Apply these settings? (y/n)",
    "zh-TW": "套用這些設定？(y/n)",
  },

  // Candidates
  "candidate_patterns": {
    en: "Found candidate patterns near salt string. Select the correct one:",
    "zh-TW": "在 salt 字串附近找到候選 pattern，請選擇正確的:",
  },

  // Done
  "done": {
    en: "Done! Launch Claude Code and type /buddy to see your customized companion.",
    "zh-TW": "完成！啟動 Claude Code 並輸入 /buddy 查看你的自定義夥伴。",
  },
  "aborted": {
    en: "Aborted.",
    "zh-TW": "已取消。",
  },
};

export function t(key: string, lang: Lang): string {
  const entry = messages[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}
