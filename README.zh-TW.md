# Buddy Builder

**自訂 Claude Code 的 `/buddy` 虛擬寵物 — 物種、稀有度、帽子、眼睛、數值。**

一個指令完成 binary patch + 屬性覆蓋，完全可逆，自動備份。

> 基於 [Miyago9267](https://miyago9267.com/) 的 [Bones Patch 技術](https://miyago9267.com/Sharing/claude-code-arpil-fool/)。

[English](./README.md)

## 運作原理

Claude Code 的 buddy 系統運作方式：

1. **計算屬性** — Claude 用你的 user ID 雜湊產生 buddy 屬性（物種、稀有度等），存在一個叫 `bones` 的變數裡
2. **JSON 覆蓋** — 同時讀取 `~/.claude.json` 中使用者自訂的值
3. **合併** — 兩者透過 JS spread 合併：`{...jsonOverride, ...bones}` — 因為 `bones` 在**最後面**，它會覆蓋使用者自訂的內容。

**Bones Patch** 直接修改 Claude Code 的 binary，把 spread 順序反轉成 `{...bones, ...jsonOverride}`，讓 `~/.claude.json` 的值優先。接著 `bb biu` 把我們自訂的屬性寫進去。

工具會自動處理完整流程：備份 binary → patch → 重新簽名（macOS）→ 驗證 → 收集屬性 → 寫入 JSON。任何步驟失敗都會自動從備份還原。

## 需求

- [Bun](https://bun.sh/) >= 1.0
- macOS / Linux
- Claude Code v2.1.89+

## 安裝

```bash
git clone https://github.com/stevencch99/buddy_builder.git
cd buddy_builder
bun link                # 全域註冊 `bb` 指令
```

## 快速開始

```bash
# 互動模式 — 逐步引導選擇所有屬性
bb biu --lang zh-TW

# 或用參數直接指定
bb biu --lang zh-TW --species cat --rarity legendary --eye "@" --hat crown --shiny \
  --name "Brineclaw" \
  --personality "A chaos-loving feline who debugs by knocking things off the stack."

# 模擬執行（不修改任何檔案）
bb biu --dry-run

# 從備份還原
bb restore

# 清理舊備份
bb prune
```

## CLI 參考

```
Usage: bb <command> [options]

Commands:
  biu         Build your buddy（自訂所有屬性）
  restore     從備份還原 Claude binary 和/或 JSON
  prune       清理舊備份（互動式，保留最早 N 份）

biu options:
  --species <name>        物種（duck, cat, dragon 等）
  --rarity <name>         稀有度（common, uncommon, rare, epic, legendary）
  --eye <char>            眼睛樣式（^, o, O, -, @, *）
  --hat <name>            帽子（none, crown, tophat, propeller, halo, wizard, beanie, tinyduck）
  --shiny                 強制閃光
  --no-shiny              強制不閃光
  --name <name>           夥伴名字
  --personality <text>    個性描述
  --skip-patch            跳過 binary patch（已 patch 過時使用）

Global options:
  --dry-run               模擬執行，不修改檔案
  --lang <code>           輸出語言：en（預設）、zh-TW
  --claude-path <path>    指定 Claude binary 路徑
  --help, -h              顯示說明

prune options:
  --keep <n>              保留最早幾份備份（預設：1）
```

## 安全與備份

每次執行前都會建立 Claude binary 和 `~/.claude.json` 的時間戳備份。任何步驟失敗自動還原。成功後自動清理舊備份（保留最早的原始版本）。用 `bb restore` 手動回滾，`bb prune` 清理磁碟空間。

## 注意事項

- Claude Code 更新後 binary 會被覆蓋，需重新執行 `bb biu`
- macOS 修改 binary 後需要重新簽名（`codesign`）— 工具會自動處理
- 需要 Bun runtime（核心演算法使用 `Bun.hash()` wyhash64）

## 致謝

[Miyago9267](https://miyago9267.com/) — [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/)

## 授權

MIT
