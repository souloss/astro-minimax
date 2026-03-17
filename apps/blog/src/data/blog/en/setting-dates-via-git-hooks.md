---
author: Souloss
pubDatetime: 2024-01-03T20:40:08Z
modDatetime: 2026-03-18T00:00:00Z
title: How to Use Git Hooks to Auto-Set Post Dates
featured: false
draft: false
category: Tutorial/Engineering
tags:
  - docs
  - git
  - automation
description: How to use Git hooks to automatically set created and modified dates in astro-minimax.
---

The frontmatter of astro-minimax blog posts includes `pubDatetime` (publication date) and `modDatetime` (modification date) fields. Manually maintaining these dates is tedious and easy to forget. This article explains how to handle this automatically with Git hooks.

## Important Note

> **The hook only auto-fills empty date fields. It will NOT overwrite values you've manually specified.**
> 
> If you've already set `pubDatetime` or `modDatetime` in your frontmatter, the hook preserves your values.

## Option 1: One-Click Install via CLI (Recommended)

The astro-minimax CLI provides a `hooks` command that automatically installs Husky and configures the pre-commit hook:

```bash
# Run from anywhere in your blog project (supports subdirectories)
astro-minimax hooks install
```

This will:
1. Detect project type (single project / Monorepo)
2. Install Husky as a dev dependency
3. Create `.husky/pre-commit` hook script
4. Configure the `prepare` script

After installation, every `git commit` will auto-fill empty date fields:

| Scenario | Condition | Behavior |
|----------|-----------|----------|
| New post | `pubDatetime` is empty | Auto-fill with current time |
| New post | `pubDatetime` has value | Skip, keep original value |
| Modified post | `draft: false` + `modDatetime` empty | Auto-fill with current time |
| Modified post | `draft: false` + `modDatetime` has value | Skip, keep original value |
| First publish | `draft: first` | Change to `draft: false`, clear `modDatetime` |

Other commands:

```bash
astro-minimax hooks status     # Show current status
astro-minimax hooks uninstall  # Remove hooks
```

## Option 2: Manual Configuration

If you prefer to configure it yourself, follow these steps.

### Step 1: Install Husky

[Husky](https://typicode.github.io/husky/) is a Git hook management tool:

```bash
pnpm add -D husky
npx husky init
```

### Step 2: Create the pre-commit Hook

Edit `.husky/pre-commit`:

```shell
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Only auto-fill empty date fields, never overwrite existing values

git diff --cached --name-status | while read -r status file; do
  case "$file" in
    src/data/blog/*.md|src/data/blog/**/*.md)
      case "$status" in
        M)
          filecontent=$(cat "$file" 2>/dev/null) || continue
          frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
          draft=$(echo "$frontmatter" | awk '/^draft: /{print $2}')
          
          if [ "$draft" = "false" ]; then
            modDatetime=$(echo "$frontmatter" | awk '/^modDatetime: /{print $2}')
            if [ -z "$modDatetime" ] || [ "$modDatetime" = "" ]; then
              echo "Auto-filled modDatetime: $file"
              sed -i.bak "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" "$file" && rm -f "$file.bak"
              git add "$file"
            fi
          fi
          
          if [ "$draft" = "first" ]; then
            echo "First release: $file"
            sed -i.bak -e "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime:/" -e "/---.*/,/---.*/s/^draft:.*$/draft: false/" "$file" && rm -f "$file.bak"
            git add "$file"
          fi
          ;;
        A)
          filecontent=$(cat "$file" 2>/dev/null) || continue
          frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
          pubDatetime=$(echo "$frontmatter" | awk '/^pubDatetime: /{print $2}')
          
          if [ -z "$pubDatetime" ] || [ "$pubDatetime" = "" ]; then
            echo "Auto-filled pubDatetime: $file"
            sed -i.bak "/---.*/,/---.*/s/^pubDatetime:.*$/pubDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" "$file" && rm -f "$file.bak"
            git add "$file"
          fi
          ;;
      esac
      ;;
  esac
done
```

### Hook Logic Explained

**New files (A):**
1. Check if `pubDatetime` is empty
2. If empty, fill with current time; if has value, skip

**Modified files (M):**
1. Check `draft` status
2. If `draft: false`: check if `modDatetime` is empty, fill if empty
3. If `draft: first`: change to `draft: false`, clear `modDatetime`

## First Publish Workflow

Use `draft: first` for automated first-time publishing:

```yaml
---
title: "New Post"
pubDatetime:           # Leave empty, hook will auto-fill
modDatetime:           # Leave empty
draft: first           # First publish marker
---
```

On commit, the hook will:
1. Auto-fill `pubDatetime`
2. Change `draft` to `false`
3. Future modifications will auto-update `modDatetime`

## Notes

1. **Git hooks are local only** — Team members need to run `astro-minimax hooks install` individually
2. **Files must be staged first** — The hook runs on `git commit` and processes `git add`ed files
3. **Monorepo support** — CLI automatically detects git root and installs hooks in the correct location
4. **Manually specified dates are preserved** — The hook only fills empty values

## Related Links

- [Husky Documentation](https://typicode.github.io/husky/)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)