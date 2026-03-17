---
author: Souloss
pubDatetime: 2024-01-03T20:40:08Z
modDatetime: 2026-03-18T00:00:00Z
title: 如何使用 Git 钩子自动设置文章日期
featured: false
draft: false
category: 教程/工程化
tags:
  - docs
  - git
  - automation
description: 如何使用 Git 钩子在 astro-minimax 中自动设置创建和修改日期。
---

astro-minimax 博客文章的 frontmatter 中包含 `pubDatetime`（发布日期）和 `modDatetime`（修改日期）字段。手动维护这些日期既繁琐又容易忘记。本文介绍如何使用 Git 钩子自动处理。

## 重要说明

> **钩子只会自动填充空的日期字段，不会覆盖你手动指定的值。**
> 
> 如果你已经在 frontmatter 中设置了 `pubDatetime` 或 `modDatetime`，钩子会保留你的指定。

## 方式一：使用 CLI 一键安装（推荐）

astro-minimax CLI 提供了 `hooks` 命令，可以自动安装 Husky 和配置 pre-commit 钩子：

```bash
# 在博客项目目录执行（支持子目录）
astro-minimax hooks install
```

这会：
1. 检测项目类型（单项目 / Monorepo）
2. 安装 Husky 作为开发依赖
3. 创建 `.husky/pre-commit` 钩子脚本
4. 配置 `prepare` 脚本

安装后，每次 `git commit` 时会自动填充空的日期字段：

| 场景 | 条件 | 行为 |
|------|------|------|
| 新文章 | `pubDatetime` 为空 | 自动填充当前时间 |
| 新文章 | `pubDatetime` 有值 | 跳过，保留原值 |
| 修改文章 | `draft: false` + `modDatetime` 为空 | 自动填充当前时间 |
| 修改文章 | `draft: false` + `modDatetime` 有值 | 跳过，保留原值 |
| 首次发布 | `draft: first` | 改为 `draft: false`，清空 `modDatetime` |

其他命令：

```bash
astro-minimax hooks status     # 查看当前状态
astro-minimax hooks uninstall  # 卸载钩子
```

## 方式二：手动配置

如果你想自己配置，按以下步骤操作。

### 步骤 1：安装 Husky

[Husky](https://typicode.github.io/husky/) 是一个 Git 钩子管理工具：

```bash
pnpm add -D husky
npx husky init
```

### 步骤 2：创建 pre-commit 钩子

编辑 `.husky/pre-commit`：

```shell
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 只自动填充空的日期字段，不覆盖已有值

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

### 钩子逻辑说明

**新增文件（A）：**
1. 检查 `pubDatetime` 是否为空
2. 空则填充当前时间，有值则跳过

**修改文件（M）：**
1. 检查 `draft` 状态
2. 如果 `draft: false`：检查 `modDatetime` 是否为空，空则填充
3. 如果 `draft: first`：改为 `draft: false`，清空 `modDatetime`

## 首次发布流程

使用 `draft: first` 实现首次发布自动化：

```yaml
---
title: "新文章"
pubDatetime:           # 留空，钩子会自动填充
modDatetime:           # 留空
draft: first           # 首次发布标记
---
```

提交时钩子会：
1. 自动填充 `pubDatetime`
2. 将 `draft` 改为 `false`
3. 后续修改时自动更新 `modDatetime`

## 注意事项

1. **Git 钩子只在本地生效** — 团队成员需要各自运行 `astro-minimax hooks install`
2. **需要先暂存文件** — 钩子在 `git commit` 时运行，处理的是已 `git add` 的文件
3. **支持 Monorepo** — CLI 会自动检测 git 根目录，在正确位置安装钩子
4. **手动指定的日期会被保留** — 钩子只填充空值

## 相关链接

- [Husky 官方文档](https://typicode.github.io/husky/)
- [Git Hooks 官方文档](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)