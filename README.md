# Buddy Builder

**Customize Claude Code's `/buddy` virtual pet — any species, rarity, hat, eyes, stats, and more.**

One command to patch the binary + override attributes. Fully reversible with automatic backups.

> Based on the [Bones Patch technique](https://miyago9267.com/Sharing/claude-code-arpil-fool/) by [Miyago9267](https://miyago9267.com/).

[中文版](./README.zh-TW.md)

## How It Works

Claude Code's buddy system works like this:

1. **Computed attributes** — Claude hashes your user ID to generate buddy attributes (species, rarity, etc.), stored in a variable called `bones`
2. **JSON override** — It also reads `~/.claude.json` for any user-set values
3. **Merge** — The two are combined via JS spread: `{...jsonOverride, ...bones}` — but because `bones` comes **last**, it always wins, making your JSON values useless

**Bones Patch** modifies the Claude Code binary to flip the spread order to `{...bones, ...jsonOverride}`, so your `~/.claude.json` values take priority. Then `bb biu` writes your chosen attributes there.

The tool handles the full pipeline automatically: backup binary → patch → re-sign (macOS) → verify → collect attributes → write JSON. Any failure triggers automatic rollback.

## Requirements

- [Bun](https://bun.sh/) >= 1.0
- macOS / Linux
- Claude Code v2.1.89+

## Install

```bash
git clone https://github.com/stevencch99/buddy_builder.git
cd buddy_builder
bun link                # registers `bb` globally
```

## Quick Start

```bash
# Interactive mode — step-by-step attribute picker
bb biu

# Or specify everything via flags
bb biu --species cat --rarity legendary --eye "@" --hat crown --shiny \
  --name "Brineclaw" \
  --personality "A chaos-loving feline who debugs by knocking things off the stack."

# Dry run (no files modified)
bb biu --dry-run

# Restore from backup
bb restore

# Clean up old backups
bb prune
```

## CLI Reference

```
Usage: bb <command> [options]

Commands:
  biu         Build your buddy (customize all attributes)
  restore     Restore Claude binary and/or JSON from backup
  prune       Remove old backups (interactive, keeps latest N)

biu options:
  --species <name>        Species (duck, cat, dragon, etc.)
  --rarity <name>         Rarity (common, uncommon, rare, epic, legendary)
  --eye <char>            Eye style (^, o, O, -, @, *)
  --hat <name>            Hat (none, crown, tophat, propeller, halo, wizard, beanie, tinyduck)
  --shiny                 Force shiny
  --no-shiny              Force not shiny
  --name <name>           Buddy name
  --personality <text>    Personality description
  --skip-patch            Skip binary patch (if already patched)

Global options:
  --dry-run               Simulate without modifying files
  --lang <code>           Output language: en (default), zh-TW
  --claude-path <path>    Override Claude binary path
  --help, -h              Show this help

prune options:
  --keep <n>              Number of oldest backups to keep (default: 1)
```

## Safety & Backups

Every run creates timestamped backups of both the Claude binary and `~/.claude.json` before making changes. If any step fails, the tool automatically restores from backup. After a successful run, older backups are pruned (keeping the original). Use `bb restore` to manually roll back, or `bb prune` to clean up disk space.

## Notes

- Claude Code updates overwrite the binary — re-run `bb biu` after updating
- macOS requires re-signing (`codesign`) after any binary modification — handled automatically
- Requires Bun runtime (core algorithm uses `Bun.hash()` wyhash64)

## Credits

[Miyago9267](https://miyago9267.com/) — [再次逆向！Claude Code 愚人節活動 Buddy 功能的秘密!](https://miyago9267.com/Sharing/claude-code-arpil-fool/)

## License

MIT
