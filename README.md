# Buddy Builder

**CLI tool that automates the "Bones Patch" method for customizing Claude Code's `/buddy` virtual pet.**

Automate binary patching + attribute override in one command. Fully reversible with timestamped backups.

> **Inspired by** [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/) by [Miyago9267](https://miyago9267.com/) — the original reverse-engineering write-up that documented the Bones Patch technique and the buddy system internals.

---

[中文版 (Chinese Version)](#中文版)

---

## Requirements

- [Bun](https://bun.sh/) >= 1.0
- macOS / Linux
- Claude Code installed with buddy feature (v2.1.89+)

## Install

```bash
git clone <repo-url>
cd cc_budy_builder
```

## Quick Start

```bash
# Interactive mode (recommended) — step-by-step attribute picker
bun run src/cli.ts bones

# Chinese interface
bun run src/cli.ts bones --lang zh-TW
```

## Available Options

All customizable attributes at a glance:

### Species (18)

|            |           |         |           |
| ---------- | --------- | ------- | --------- |
| `duck`     | `goose`   | `blob`  | `cat`     |
| `dragon`   | `octopus` | `owl`   | `penguin` |
| `turtle`   | `snail`   | `ghost` | `axolotl` |
| `capybara` | `cactus`  | `robot` | `rabbit`  |
| `mushroom` | `chonk`   |         |           |

### Rarity (5)

| Rarity      | Base Stats | Weight |
| ----------- | ---------- | ------ |
| `common`    | 5          | 60%    |
| `uncommon`  | 15         | 25%    |
| `rare`      | 25         | 10%    |
| `epic`      | 35         | 4%     |
| `legendary` | 50         | 1%     |

### Eyes (6)

| Style   | Character |
| ------- | --------- |
| Caret   | `^`       |
| Small-o | `o`       |
| Big-O   | `O`       |
| Dash    | `-`       |
| At      | `@`       |
| Star    | `*`       |

### Hats (8)

|        |          |          |             |
| ------ | -------- | -------- | ----------- |
| `none` | `crown`  | `tophat` | `propeller` |
| `halo` | `wizard` | `beanie` | `tinyduck`  |

> **Note:** Common rarity buddies always have `none` as their hat in the original system. With the Bones Patch, you can override this.

### Stats (5)

Each stat ranges from **1–100**:

| Stat        | Description               |
| ----------- | ------------------------- |
| `DEBUGGING` | Bug-hunting prowess       |
| `PATIENCE`  | Tolerance for long builds |
| `CHAOS`     | Tendency toward entropy   |
| `WISDOM`    | Accumulated knowledge     |
| `SNARK`     | Sass levels               |

### Other Attributes

| Attribute   | Values                                    |
| ----------- | ----------------------------------------- |
| Shiny       | `true` / `false` (✨ sparkle effect)      |
| Name        | Any string (max 50 chars)                 |
| Personality | Any string (max 200 chars, on buddy card) |

## How It Works

The Bones Patch reverses the JS spread operator order in the Claude binary, so values in `~/.claude.json` override the computed results instead of being overridden by them.

```
┌─────────────────────────────────────────────────────────┐
│                    bones command flow                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Pre-flight checks                                   │
│     ├─ Locate Claude binary (which claude → resolve)    │
│     └─ Verify salt string "friend-2026-401" exists      │
│        └─ Missing → incompatible version, abort ✗       │
│                                                         │
│  2. Binary Patch                                        │
│     ├─ Check if already patched                         │
│     │   └─ Already patched → skip to step 3             │
│     ├─ Detect spread pattern (multi-step fallback)      │
│     │   ├─ Step A: Exact match {...H,...bones}           │
│     │   ├─ Step B: Regex search {...\w+,...bones}        │
│     │   ├─ Step C: Single spread near salt → auto-pick  │
│     │   └─ Step D: Multiple near salt → interactive pick │
│     │        └─ All fail → abort ✗                      │
│     ├─ Create timestamped binary backup                 │
│     │   └─ Fail → abort ✗ (no cleanup needed)           │
│     ├─ Reverse spread order ({...H,..._} → {..._,...H})  │
│     │   └─ Fail → restore from backup, abort ✗          │
│     ├─ macOS re-sign (codesign)                         │
│     │   └─ Fail → restore from backup, abort ✗          │
│     └─ Verify binary (claude --version)                 │
│        └─ Fail → restore from backup, abort ✗           │
│                                                         │
│  3. Collect buddy attributes                            │
│     ├─ Interactive mode: step-by-step picker            │
│     └─ Flag mode: specify via CLI arguments             │
│                                                         │
│  4. Preview buddy card                                  │
│     └─ Show formatted card, ask for confirmation        │
│        └─ Cancel → abort (binary patch kept)            │
│                                                         │
│  5. Write to ~/.claude.json                             │
│     ├─ Create timestamped JSON backup                   │
│     ├─ Atomic write (temp → rename)                     │
│     └─ Done ✓                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### `restore` command

Restore binary and/or `~/.claude.json` from backups.

```
┌──────────────────────────────────────┐
│          restore command flow        │
├──────────────────────────────────────┤
│                                      │
│  1. Scan backups                     │
│     ├─ Binary backups (*.bak.*)      │
│     └─ JSON backups (*.buddy-backup) │
│        └─ None found → abort         │
│                                      │
│  2. Restore binary (if backups)      │
│     ├─ List all backups (by date)    │
│     ├─ Interactive selection          │
│     ├─ Copy backup over binary       │
│     └─ macOS re-sign                 │
│                                      │
│  3. Restore JSON (if backups)        │
│     ├─ List all backups (by date)    │
│     ├─ Interactive selection          │
│     └─ Copy backup over ~/.claude.json│
│                                      │
│  4. Done ✓                           │
│                                      │
└──────────────────────────────────────┘
```

## Usage Examples

### Interactive mode

```bash
bun run src/cli.ts bones
```

Step-by-step guided selection of all attributes, with a preview card before applying.

### Flag mode

```bash
bun run src/cli.ts bones \
  --species cat \
  --rarity legendary \
  --eye "@" \
  --hat crown \
  --shiny \
  --name "Brineclaw" \
  --personality "A chaos-loving feline who debugs by knocking things off the stack."
```

### Dry run

```bash
bun run src/cli.ts bones --dry-run
```

Runs all checks and attribute selection, shows preview and JSON output, but does not modify any files.

### Already-patched binary

```bash
bun run src/cli.ts bones --skip-patch
```

Skip binary patching, only update companion data in `~/.claude.json`.

### Restore

```bash
bun run src/cli.ts restore
```

List all backups and interactively choose which to restore.

### Prune backups

```bash
# Keep only the original backup (default)
bun run src/cli.ts prune

# Keep the 2 oldest backups
bun run src/cli.ts prune --keep 2
```

Shows backup count and disk usage, then asks for confirmation before deleting.

## CLI Reference

```
Usage: buddy-builder <command> [options]

Commands:
  bones       Apply Bones Patch (customize all buddy attributes)
  restore     Restore Claude binary and/or JSON from backup
  prune       Remove old backups (keeps oldest N, default 1)

bones options:
  --species <name>        Species (see list above)
  --rarity <name>         common | uncommon | rare | epic | legendary
  --eye <char>            ^ | o | O | - | @ | *
  --hat <name>            none | crown | tophat | propeller | halo | wizard | beanie | tinyduck
  --shiny                 Force shiny
  --no-shiny              Force not shiny
  --name <name>           Buddy name
  --personality <text>    Personality description
  --skip-patch            Skip binary patch (if already patched)

Global options:
  --dry-run               Simulate without modifying files
  --lang <code>           Output language: en (default), zh-TW
  --claude-path <path>    Override Claude binary path
  --help, -h              Show help

prune options:
  --keep <n>              Number of oldest backups to keep (default: 1)
```

## Backup System

Every `bones` execution creates timestamped backups:

| Target         | Backup Format                             | Example                                     |
| -------------- | ----------------------------------------- | ------------------------------------------- |
| Claude binary  | `<binary>.bak.<timestamp>`                | `2.1.91.bak.20260403T150000`                |
| ~/.claude.json | `~/.claude.json.buddy-backup.<timestamp>` | `.claude.json.buddy-backup.20260403T150000` |

- Each run creates a new backup for rollback safety during that operation
- After success, auto-prunes to keep only the original (oldest) backup
- Any step failure triggers automatic rollback
- `restore` command recovers from the original backup
- `prune` command for manual cleanup (shows sizes, asks confirmation)

## Safety

| Layer              | Mechanism                                                     |
| ------------------ | ------------------------------------------------------------- |
| Pre-flight         | Verify salt string exists (version compatibility)             |
| Pattern uniqueness | Spread pattern must appear exactly once in binary             |
| Timestamped backup | Auto-created before modification, keeps original after prune  |
| Atomic write       | JSON via temp file (random UUID) + rename                     |
| Auto-rollback      | Any step failure restores from backup                         |
| Post-verify        | `claude --version` and `codesign -v` after patch              |
| Input sanitization | Name/personality: length limits, control character stripping  |
| Backup validation  | JSON backups are parsed before restore to reject corruption   |
| Dry-run            | `--dry-run` simulates entire flow without changes             |

## Testing

```bash
bun test
```

## Project Structure

```
src/
  cli.ts                     # CLI entry point
  commands/
    bones-patch.ts           # Bones Patch orchestration
    restore.ts               # Backup restoration
    prune.ts                 # Backup cleanup
  core/
    types.ts                 # TypeScript types
    constants.ts             # Species / rarity / eyes / hats / stats constants
    buddy-engine.ts          # Hash + PRNG + bones generation (pure functions)
    binary.ts                # Binary locate / backup / pattern detection / patch
    claude-json.ts           # ~/.claude.json read/write
  ui/
    interactive.ts           # Interactive attribute picker
    display.ts               # Buddy card formatted output
  utils/
    platform.ts              # OS detection, codesign
    i18n.ts                  # Bilingual messages (en / zh-TW)
tests/
  buddy-engine.test.ts       # Core algorithm tests
```

## Notes

- Claude Code updates overwrite the binary — re-run `bones` after updating
- macOS re-signing is required, otherwise Gatekeeper blocks the modified binary
- Requires Bun runtime (core algorithm uses `Bun.hash()` wyhash64)

## Credits

- **Reverse engineering & Bones Patch technique**: [Miyago9267](https://miyago9267.com/) — [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/)

## License

MIT

---

# 中文版

**自動化 Claude Code `/buddy` 虛擬寵物自定義的 CLI 工具（Bones Patch 方法）。**

一個命令完成 binary patch + 屬性覆蓋，完全可逆，帶時間戳備份。

> **靈感與參考來自** [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/) by [Miyago9267](https://miyago9267.com/) — 原始逆向工程文章，記錄了 Bones Patch 技術和 buddy 系統內部運作。

---

## 需求

- [Bun](https://bun.sh/) >= 1.0
- macOS / Linux
- Claude Code 已安裝且包含 buddy 功能（v2.1.89+）

## 安裝

```bash
git clone <repo-url>
cd cc_budy_builder
```

## 快速開始

```bash
# 互動模式（推薦）— 逐步引導選擇所有屬性
bun run src/cli.ts bones --lang zh-TW

# 英文介面
bun run src/cli.ts bones
```

## 可用選項

所有可自定義屬性一覽：

### 物種（18 種）

|                 |                 |                |                        |
| --------------- | --------------- | -------------- | ---------------------- |
| `duck` 鴨子     | `goose` 鵝      | `blob` 果凍    | `cat` 貓               |
| `dragon` 龍     | `octopus` 章魚  | `owl` 貓頭鷹   | `penguin` 企鵝         |
| `turtle` 烏龜   | `snail` 蝸牛    | `ghost` 幽靈   | `axolotl` 墨西哥鈍口螈 |
| `capybara` 水豚 | `cactus` 仙人掌 | `robot` 機器人 | `rabbit` 兔子          |
| `mushroom` 蘑菇 | `chonk` 胖胖    |                |                        |

### 稀有度（5 級）

| 稀有度            | 基礎數值 | 權重 |
| ----------------- | -------- | ---- |
| `common` 普通     | 5        | 60%  |
| `uncommon` 不常見 | 15       | 25%  |
| `rare` 稀有       | 25       | 10%  |
| `epic` 史詩       | 35       | 4%   |
| `legendary` 傳說  | 50       | 1%   |

### 眼睛（6 種）

| 樣式    | 字元 |
| ------- | ---- |
| 插入符  | `^`  |
| 小寫 o  | `o`  |
| 大寫 O  | `O`  |
| 橫線    | `-`  |
| At 符號 | `@`  |
| 星號    | `*`  |

### 帽子（8 種）

|             |                 |                 |                      |
| ----------- | --------------- | --------------- | -------------------- |
| `none` 無   | `crown` 皇冠    | `tophat` 高帽   | `propeller` 螺旋槳帽 |
| `halo` 光環 | `wizard` 巫師帽 | `beanie` 毛線帽 | `tinyduck` 小鴨帽    |

> **提示：** 原始系統中 common 稀有度的 buddy 帽子固定為 `none`。使用 Bones Patch 後可以覆蓋此限制。

### 數值（5 項）

每項數值範圍 **1–100**：

| 數值        | 說明     |
| ----------- | -------- |
| `DEBUGGING` | 除錯能力 |
| `PATIENCE`  | 耐心值   |
| `CHAOS`     | 混亂傾向 |
| `WISDOM`    | 智慧累積 |
| `SNARK`     | 毒舌程度 |

### 其他屬性

| 屬性               | 值                                       |
| ------------------ | ---------------------------------------- |
| 閃光 (Shiny)       | `true` / `false`（✨ 閃光效果）          |
| 名字 (Name)        | 任意字串（上限 50 字元）                 |
| 個性 (Personality) | 任意字串（上限 200 字元，顯示在卡片上）  |

## 運作原理

Bones Patch 透過反轉 Claude binary 中的 JS spread 運算符順序，讓 `~/.claude.json` 的值覆蓋計算結果，實現完全自定義。

```
┌─────────────────────────────────────────────────────────┐
│                    bones 命令流程                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Pre-flight 檢查                                     │
│     ├─ 定位 Claude binary（which claude → resolve）     │
│     └─ 驗證 salt 字串 "friend-2026-401" 存在            │
│        └─ 不存在 → 版本不相容，中止 ✗                   │
│                                                         │
│  2. Binary Patch                                        │
│     ├─ 檢查是否已 patch 過                              │
│     │   └─ 已 patch → 跳到步驟 3                        │
│     ├─ 偵測 spread pattern（多步 fallback）             │
│     │   ├─ Step A: 精確匹配 {...H,...bones}             │
│     │   ├─ Step B: 正則搜索 {...\w+,...bones}           │
│     │   ├─ Step C: salt 附近唯一 spread → 自動選取      │
│     │   └─ Step D: salt 附近多個 → 互動式手動選擇       │
│     │        └─ 全部失敗 → 中止 ✗                       │
│     ├─ 建立 binary 時間戳備份                           │
│     │   └─ 失敗 → 中止 ✗（無需清理）                   │
│     ├─ 反轉 spread 順序（如 {...H,..._} → {..._,...H}） │
│     │   └─ 失敗 → 從備份還原，中止 ✗                   │
│     ├─ macOS 重新簽名 (codesign)                        │
│     │   └─ 失敗 → 從備份還原，中止 ✗                   │
│     └─ 驗證 binary 可執行 (claude --version)            │
│        └─ 失敗 → 從備份還原，中止 ✗                    │
│                                                         │
│  3. 收集 buddy 屬性                                     │
│     ├─ 互動模式：逐步選擇                              │
│     └─ Flag 模式：由 CLI 參數直接指定                   │
│                                                         │
│  4. 預覽 buddy card                                     │
│     └─ 顯示格式化的屬性卡片，要求確認                  │
│        └─ 取消 → 中止（binary patch 保留）              │
│                                                         │
│  5. 寫入 ~/.claude.json                                 │
│     ├─ 建立 JSON 時間戳備份                             │
│     ├─ Atomic write（temp → rename）                    │
│     └─ 完成 ✓                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### `restore` 命令

從備份還原 binary 和/或 `~/.claude.json`。

```
┌──────────────────────────────────────┐
│          restore 命令流程            │
├──────────────────────────────────────┤
│                                      │
│  1. 掃描備份                         │
│     ├─ Binary 備份（*.bak.*）        │
│     └─ JSON 備份（*.buddy-backup.*） │
│        └─ 都沒有 → 中止             │
│                                      │
│  2. 還原 binary（如有備份）          │
│     ├─ 列出所有備份（依時間排序）    │
│     ├─ 互動式選擇要還原的版本        │
│     ├─ 複製備份覆蓋 binary           │
│     └─ macOS 重新簽名                │
│                                      │
│  3. 還原 JSON（如有備份）            │
│     ├─ 列出所有備份（依時間排序）    │
│     ├─ 互動式選擇要還原的版本        │
│     └─ 複製備份覆蓋 ~/.claude.json   │
│                                      │
│  4. 完成 ✓                           │
│                                      │
└──────────────────────────────────────┘
```

## 使用範例

### 互動模式

```bash
bun run src/cli.ts bones --lang zh-TW
```

逐步引導選擇所有屬性，最後預覽確認後套用。

### Flag 模式

```bash
bun run src/cli.ts bones --lang zh-TW \
  --species cat \
  --rarity legendary \
  --eye "@" \
  --hat crown \
  --shiny \
  --name "Brineclaw" \
  --personality "A chaos-loving feline who debugs by knocking things off the stack."
```

### 模擬執行

```bash
bun run src/cli.ts bones --dry-run
```

走完所有檢查和屬性選擇，顯示預覽和將寫入的 JSON，但不修改任何檔案。

### 已 patch 過的 binary

```bash
bun run src/cli.ts bones --skip-patch
```

跳過 binary patch 步驟，只更新 `~/.claude.json` 中的 companion 資料。

### 還原

```bash
bun run src/cli.ts restore
```

列出所有備份，互動式選擇要還原的版本。

### 清理備份

```bash
# 只保留最早的原始備份（預設）
bun run src/cli.ts prune

# 保留最早的 2 份備份
bun run src/cli.ts prune --keep 2
```

顯示備份數量和磁碟用量，確認後才刪除。

## 備份機制

每次執行 `bones` 命令都會建立帶時間戳的備份：

| 目標           | 備份格式                                  | 範例                                        |
| -------------- | ----------------------------------------- | ------------------------------------------- |
| Claude binary  | `<binary>.bak.<timestamp>`                | `2.1.91.bak.20260403T150000`                |
| ~/.claude.json | `~/.claude.json.buddy-backup.<timestamp>` | `.claude.json.buddy-backup.20260403T150000` |

- 每次執行都會建立新備份（確保當次操作可回滾）
- 成功後自動清理，只保留最早的原始備份
- 任何步驟失敗自動回滾
- `restore` 命令從原始備份還原
- `prune` 命令手動清理（顯示大小，確認後刪除）

## 安全措施

| 保護層         | 機制                                                     |
| -------------- | -------------------------------------------------------- |
| Pre-flight     | 驗證 salt 字串存在（版本相容性）                         |
| Pattern 唯一性 | Spread pattern 必須在 binary 中恰好出現 1 次             |
| 時間戳備份     | 修改前自動建立，成功後只保留原始備份                     |
| Atomic write   | JSON 透過 temp（隨機 UUID）+ rename 寫入                 |
| 自動回滾       | 任何步驟失敗自動還原                                     |
| Post-verify    | Patch 後執行 `claude --version` 和 `codesign -v`         |
| 輸入清理       | Name/Personality 長度限制，過濾控制字元                  |
| 備份驗證       | 還原前解析 JSON，拒絕損壞的備份                          |
| Dry-run        | `--dry-run` 全程模擬，不修改檔案                         |

## 測試

```bash
bun test
```

## 注意事項

- Claude Code 更新後 binary 會被覆蓋，需重新執行 `bones` 命令
- macOS 重簽是必須的，否則 Gatekeeper 會阻擋修改過的 binary
- 本工具需要 Bun runtime（核心演算法使用 `Bun.hash()`）

## 致謝

- **逆向工程與 Bones Patch 技術**: [Miyago9267](https://miyago9267.com/) — [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/)

## 授權

MIT
