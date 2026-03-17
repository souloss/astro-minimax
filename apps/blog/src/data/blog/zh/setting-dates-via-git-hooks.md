---
author: Souloss
pubDatetime: 2024-01-03T20:40:08Z
modDatetime: 2026-03-17T20:44:00Z
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

## 方式一：使用 CLI 一键安装（推荐）

astro-minimax CLI 提供了 `hooks` 命令，可以自动安装 Husky 和配置 pre-commit 钩子：

```bash
# 在博客项目根目录执行
astro-minimax hooks install
```

这会：
1. 安装 Husky 作为开发依赖
2. 创建 `.husky/pre-commit` 钩子脚本
3. 配置 `prepare` 脚本

安装后，每次 `git commit` 时会自动：
- 为新文章添加 `pubDatetime`
- 为已发布的修改文章更新 `modDatetime`
- 支持 `draft: first` 首次发布模式

卸载：

```bash
astro-minimax hooks uninstall
```

## 方式二：手动配置

如果你想自己配置，按以下步骤操作。

### 步骤 1：安装 Husky

[Husky](https://typicode.github.io/husky/) 是一个 Git 钩子管理工具，可以让你在项目中方便地管理钩子。

```bash
pnpm add -D husky
```

然后初始化：

```bash
npx husky init
```

这会创建 `.husky/` 目录和 `package.json` 中的 `prepare` 脚本。

### 步骤 2：创建 pre-commit 钩子

编辑 `.husky/pre-commit` 文件：

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

### 钩子逻辑说明

**修改文件更新 `modDatetime`：**

1. `git diff --cached --name-status` 获取暂存的文件
2. 筛选修改的 `.md` 文件（以 `M` 开头）
3. 读取文件的 frontmatter，检查 `draft` 状态
4. 如果 `draft: false`，更新 `modDatetime` 为当前时间
5. 如果 `draft: first`，这是首次发布，将 `draft` 设为 `false` 并清空 `modDatetime`

**新文件添加 `pubDatetime`：**

1. 筛选新增的 `.md` 文件（以 `A` 开头）
2. 将 `pubDatetime` 设为当前时间

### 步骤 3：确保 frontmatter 格式正确

要让 `sed` 命令正常工作，文章的 frontmatter 需要包含 `pubDatetime` 和 `modDatetime` 字段（值可以留空）：

```yaml
---
title: "文章标题"
pubDatetime: 2024-01-01T00:00:00Z
modDatetime: 2026-03-17T20:44:00Z
draft: false
---
```

使用 CLI 创建文章会自动包含这些字段：

```bash
astro-minimax post new "文章标题"
```

## 首次发布流程

使用 `draft: first` 可以实现首次发布自动处理：

1. 创建新文章，设置 `draft: first`
2. 提交时钩子检测到 `draft: first`
3. 自动将 `draft` 改为 `false`，清空 `modDatetime`
4. 后续修改时会自动更新 `modDatetime`

这样就不需要手动管理首次发布的日期了。

## 注意事项

1. **Git 钩子只在本地生效** — 团队成员需要各自运行 `astro-minimax hooks install`
2. **需要先暂存文件** — 钩子在 `git commit` 时运行，处理的是已 `git add` 的文件
3. **依赖 sed 和 awk** — macOS 和 Linux 的语法略有不同，上述脚本在 Linux 上测试通过

## 相关链接

- [Husky 官方文档](https://typicode.github.io/husky/)
- [Git Hooks 官方文档](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)