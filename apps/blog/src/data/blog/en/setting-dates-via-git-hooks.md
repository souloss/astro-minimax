---
author: Souloss
pubDatetime: 2024-01-03T20:40:08Z
modDatetime: 2026-03-17T20:44:00Z
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

## Option 1: One-Click Install via CLI (Recommended)

The astro-minimax CLI provides a `hooks` command that automatically installs Husky and configures the pre-commit hook:

```bash
# Run in your blog project root
astro-minimax hooks install
```

This will:
1. Install Husky as a dev dependency
2. Create the `.husky/pre-commit` hook script
3. Configure the `prepare` script in package.json

After installation, every `git commit` will automatically:
- Add `pubDatetime` to new posts
- Update `modDatetime` for modified published posts
- Support `draft: first` first-publish mode

To uninstall:

```bash
astro-minimax hooks uninstall
```

## Option 2: Manual Configuration

If you prefer to configure it yourself, follow these steps.

### Step 1: Install Husky

[Husky](https://typicode.github.io/husky/) is a Git hook management tool that makes it easy to manage hooks in your project.

```bash
pnpm add -D husky
```

Then initialize:

```bash
npx husky init
```

This creates a `.husky/` directory and adds a `prepare` script to `package.json`.

### Step 2: Create the pre-commit Hook

Edit `.husky/pre-commit`:

```shell
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Modified files, update the modDatetime
git diff --cached --name-status |
  grep -i '^M.*\.md$' |
  while read _ file; do
    filecontent=$(cat "$file")
    frontmatter=$(echo "$filecontent" | awk -v RS='---' 'NR==2{print}')
    draft=$(echo "$frontmatter" | awk '/^draft: /{print $2}')
    if [ "$draft" = "false" ]; then
      echo "$file modDateTime updated"
      cat $file | sed "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" > tmp
      mv tmp $file
      git add $file
    fi
    if [ "$draft" = "first" ]; then
      echo "First release of $file, draft set to false and modDateTime removed"
      cat $file | sed "/---.*/,/---.*/s/^modDatetime:.*$/modDatetime:/" | sed "/---.*/,/---.*/s/^draft:.*$/draft: false/" > tmp
      mv tmp $file
      git add $file
    fi
  done

# New files, add the pubDatetime
git diff --cached --name-status | egrep -i "^(A).*\.(md)$" | while read a b; do
  cat $b | sed "/---.*/,/---.*/s/^pubDatetime:.*$/pubDatetime: $(date -u "+%Y-%m-%dT%H:%M:%SZ")/" > tmp
  mv tmp $b
  git add $b
done
```

### Hook Logic Explained

**Updating `modDatetime` for modified files:**

1. `git diff --cached --name-status` gets staged files
2. Filter for modified `.md` files (starting with `M`)
3. Read file's frontmatter and check `draft` status
4. If `draft: false`, update `modDatetime` to current time
5. If `draft: first`, this is first publish - set `draft` to `false` and clear `modDatetime`

**Adding `pubDatetime` for new files:**

1. Filter for new `.md` files (starting with `A`)
2. Set `pubDatetime` to current time

### Step 3: Ensure Correct Frontmatter Format

For the `sed` commands to work, posts need `pubDatetime` and `modDatetime` fields in frontmatter (values can be empty):

```yaml
---
title: "Post Title"
pubDatetime: 2024-01-01T00:00:00Z
modDatetime: 2026-03-17T20:44:00Z
draft: false
---
```

Using the CLI to create posts will include these fields automatically:

```bash
astro-minimax post new "Post Title"
```

## First Publish Workflow

Using `draft: first` enables automatic first-publish handling:

1. Create a new post with `draft: first`
2. On commit, the hook detects `draft: first`
3. Automatically sets `draft` to `false` and clears `modDatetime`
4. Future modifications will automatically update `modDatetime`

This eliminates manual date management for first publications.

## Notes

1. **Git hooks are local only** — Team members need to run `astro-minimax hooks install` individually
2. **Files must be staged first** — The hook runs on `git commit` and processes `git add`ed files
3. **Depends on sed and awk** — Syntax differs slightly between macOS and Linux; the script above was tested on Linux

## Related Links

- [Husky Documentation](https://typicode.github.io/husky/)
- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)