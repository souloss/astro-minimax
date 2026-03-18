---
title: "配置 Umami 网站统计：Vercel 免费部署方案"
pubDatetime: 2026-03-18T00:00:00.000Z
author: Souloss
description: "详细介绍如何使用 Vercel + Neon PostgreSQL 免费部署 Umami 网站统计分析，并与 astro-minimax 博客集成。"
tags:
  - docs
  - analytics
  - deployment
  - vercel
  - neon
category: 教程/配置
featured: false
draft: false
---

[Umami](https://umami.is/) 是一款开源、隐私友好的网站统计分析工具。相比 Google Analytics，Umami 不使用 Cookie、不跨站追踪用户、完全符合 GDPR 隐私法规。本文将介绍如何使用 Vercel + Neon PostgreSQL 免费部署 Umami 并与 astro-minimax 博客集成。

## 为什么选择 Umami

| 特性         | Umami         | Google Analytics |
| ------------ | ------------- | ---------------- |
| 隐私友好     | 完全符合 GDPR | 需要 Cookie 同意 |
| 自托管       | 支持          | 不支持           |
| 数据所有权   | 完全掌控      | Google 持有      |
| Cookie 使用  | 不使用        | 需要             |
| 页面大小影响 | 极小（< 2KB） | 较大             |
| 开源         | MIT 协议      | 闭源             |

## 部署方案对比

| 方案                      | 成本 | 优势                       | 劣势                   |
| ------------------------- | ---- | -------------------------- | ---------------------- |
| **Vercel + Neon（推荐）** | 免费 | 零运维、一键部署、自动更新 | Vercel 免费额度限制    |
| 自托管 Docker             | 免费 | 完全掌控、无限制           | 需要服务器、需自行维护 |
| Umami Cloud               | 付费 | 无需运维、自动更新         | 月费 $9 起             |

**推荐使用 Vercel + Neon 方案**：完全免费、无需服务器、部署简单，适合个人博客和小型网站。

---

## 方案 A：Vercel + Neon 部署（推荐）

使用 Vercel 托管 Umami 应用，配合 Vercel Storage 提供的 Neon PostgreSQL 数据库，实现零成本部署。

### 前置准备

- GitHub 账号
- Vercel 账号（使用 GitHub 登录）
- Neon 账号（可通过 Vercel Storage 自动关联）

### 步骤 1：Fork Umami 仓库

1. 访问 [Umami GitHub 仓库](https://github.com/umami-software/umami)
2. 点击右上角 **Fork** 按钮，将仓库 Fork 到你的账号

### 步骤 2：在 Vercel 部署 Umami

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New** → **Project**
3. 选择你 Fork 的 `umami` 仓库
4. 配置项目：
   - **Framework Preset**：选择 `Next.js`
   - **Environment Variables**：暂时跳过，稍后配置
5. 点击 **Deploy** 开始部署

> 首次部署可能会失败（缺少数据库连接），这是正常的，下一步配置数据库后重新部署即可。

### 步骤 3：创建 Neon PostgreSQL 数据库

1. 在 Vercel Dashboard 中，进入你的 Umami 项目
2. 点击顶部 **Storage** 标签
3. 点击 **Create Database**
4. 选择 **Neon PostgreSQL** 作为数据库类型
5. 登录 Neon 账号授权（如未关联）
6. 配置数据库：
   - **Project Name**：如 `umami-analytics`
   - **Database Name**：建议使用 `umami`
   - **Region**：选择离你用户最近的区域
7. 点击 **Create** 创建数据库

创建完成后，Vercel 会自动将 `DATABASE_URL` 环境变量注入到项目中。

### 步骤 4：重新部署

1. 进入 **Deployments** 标签
2. 选择最新的部署记录
3. 点击 **Redeploy** 重新部署
4. 等待部署完成（约 1-2 分钟）

> `DATABASE_URL` 是唯一必需的环境变量。`APP_SECRET`（用于加密会话）现在是可选的，Umami 会自动生成。

### 步骤 5：初始化 Umami

1. 部署成功后，点击 **Visit** 访问你的 Umami 实例
2. 首次登录使用默认账号：
   - 用户名：`admin`
   - 密码：`umami`
3. **立即修改默认密码**：点击右上角头像 → **Profile** → **Change Password**

### 步骤 6：绑定自定义域名（可选）

1. 项目 → **Settings** → **Domains**
2. 输入你的域名，如 `umami.yourdomain.com`
3. 在域名 DNS 添加 CNAME 记录指向 `cname.vercel-dns.com`
4. 等待 DNS 生效

---

## 方案 B：自托管 Docker 部署

如果你有服务器资源且希望完全掌控数据，可以使用 Docker 自托管部署。

### 快速部署

创建 `docker-compose.yml` 文件：

```yaml file=docker-compose.yml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    container_name: umami
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami@db:5432/umami
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    container_name: umami-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami
    volumes:
      - umami-db-data:/var/lib/postgresql/data

volumes:
  umami-db-data:
```

> `DATABASE_URL` 是唯一必需的环境变量。`APP_SECRET`（用于加密会话）是可选的，Umami 会自动生成。

启动服务：

```bash
docker compose up -d
```

服务将在 `http://localhost:3001` 启动。默认管理员账号：

- 用户名：`admin`
- 密码：`umami`

> 首次登录后请立即修改默认密码。

### 生产环境配置

#### 反向代理配置

推荐使用 Nginx 或 Caddy 作为反向代理，配置 HTTPS：

**Nginx 配置示例：**

```nginx
server {
    listen 443 ssl http2;
    server_name umami.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy 配置示例（更简单）：**

```caddyfile
umami.your-domain.com {
    reverse_proxy localhost:3001
}
```

Caddy 会自动申请和续期 HTTPS 证书。

#### 环境变量说明

| 变量                    | 必需 | 说明                             |
| ----------------------- | ---- | -------------------------------- |
| `DATABASE_URL`          | 是   | PostgreSQL 连接字符串            |
| `APP_SECRET`            | 否   | 用于加密会话，自动生成           |
| `TRACKER_SCRIPT_NAME`   | 否   | 追踪脚本文件名，默认 `script.js` |
| `DISABLE_TELEMETRY`     | 否   | 禁用遥测，设为 `1`               |
| `REMOVE_TRAILING_SLASH` | 否   | 移除 URL 尾部斜杠，设为 `1`      |

#### PostgreSQL 优化

生产环境建议调整 PostgreSQL 配置：

```yaml
db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: umami
    POSTGRES_USER: umami
    POSTGRES_PASSWORD: your-secure-password-here
  volumes:
    - umami-db-data:/var/lib/postgresql/data
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### 数据备份

定期备份 PostgreSQL 数据：

```bash
# 备份
docker exec umami-db pg_dump -U umami umami > umami_backup_$(date +%Y%m%d).sql

# 恢复
cat umami_backup_20260318.sql | docker exec -i umami-db psql -U umami umami
```

---

## 方案 C：Umami Cloud

如果你不想自行运维，可以使用 [Umami Cloud](https://umami.is/pricing) 托管服务。

### 定价

| 方案       | 月费   | 网站数 | 页面浏览量 |
| ---------- | ------ | ------ | ---------- |
| Pro        | $9     | 10     | 100,000/月 |
| Business   | $19    | 25     | 500,000/月 |
| Enterprise | 自定义 | 无限   | 自定义     |

### 使用步骤

1. 注册 [Umami Cloud 账号](https://cloud.umami.is/)
2. 登录后进入 Dashboard
3. 点击 **Add website** 添加你的网站
4. 获取 `websiteId` 和脚本地址

---

## 获取 Website ID

无论使用哪种方案，都需要获取 `websiteId` 用于博客集成。

### 步骤

1. 登录 Umami 面板
2. 点击右上角 **Settings** → **Websites**
3. 点击 **Add website** 添加网站：
   - **Name**：你的博客名称
   - **Domain**：你的博客域名（如 `blog.example.com`）
4. 添加后，点击网站名称进入详情
5. 在 **Tracking code** 区域可以看到：
   - `data-website-id`：这就是你的 `websiteId`
   - 脚本地址：如 `https://your-umami-instance/script.js`

示例追踪代码：

```html
<script async src="https://umami.example.com/script.js" data-website-id="1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88"></script>
```

从上面的代码中提取：

- `websiteId`：`1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88`
- `src`：`https://umami.example.com/script.js`

---

## 集成到博客

在 `src/config.ts` 中配置 Umami：

```js file=src/config.ts
umami: {
  enabled: true,
  websiteId: "1419a8ae-a14b-4bb7-8c39-ee5fe00a8a88",
  src: "https://umami.example.com/script.js",
},
```

| 选项        | 说明                                                                                  |
| ----------- | ------------------------------------------------------------------------------------- |
| `enabled`   | 是否启用统计。设为 `true` 后脚本将自动注入页面                                        |
| `websiteId` | Umami 后台获取的网站 ID                                                               |
| `src`       | Umami 追踪脚本地址。自托管使用你的域名，云服务使用 `https://cloud.umami.is/script.js` |

配置完成后，重新构建并部署博客：

```bash
pnpm run build
```

### 验证集成

部署后，打开浏览器开发者工具：

1. 在 **Network** 标签页查看是否有请求发送到你的 Umami 服务
2. 在 Umami 面板的 **Realtime** 页面确认是否有访问记录

---

## 环境变量参考

如果你不想将 `websiteId` 提交到代码仓库，可以使用环境变量：

### 方法一：构建时环境变量

在部署平台的构建配置中添加：

```bash
UMAMI_WEBSITE_ID=your-website-id
UMAMI_SRC=https://umami.example.com/script.js
```

修改 `src/config.ts`：

```js
umami: {
  enabled: true,
  websiteId: import.meta.env.UMAMI_WEBSITE_ID || "your-website-id",
  src: import.meta.env.UMAMI_SRC || "https://umami.example.com/script.js",
},
```

### 方法二：使用 `.env` 文件

创建 `.env` 文件（添加到 `.gitignore`）：

```bash file=.env
UMAMI_WEBSITE_ID=your-website-id
UMAMI_SRC=https://umami.example.com/script.js
```

---

## 隐私合规

Umami 设计之初就考虑了隐私合规问题：

### GDPR 合规

- **不使用 Cookie**：Umami 不依赖 Cookie 追踪用户
- **不跨站追踪**：数据仅限于你的网站
- **数据最小化**：仅收集必要的统计数据
- **数据所有权**：自托管方案下，你完全拥有数据

### 隐私政策建议

在隐私政策中声明使用 Umami 统计：

> 本网站使用 Umami 进行统计分析。Umami 不使用 Cookie，不追踪个人身份信息，所有数据仅用于改善网站体验。

### 用户退出追踪

Umami 支持用户退出统计追踪。你可以添加退出链接：

```html
<a href="#" data-umami-track="false">退出统计追踪</a>
```

或通过 JavaScript：

```js
window.umami.trackView = false;
```

---

## 常见问题

### 统计数据不显示

1. **检查脚本加载**：在浏览器开发者工具 Network 标签确认 `script.js` 是否成功加载
2. **检查域名配置**：确保 Umami 后台配置的域名与实际博客域名一致
3. **检查 CSP 策略**：如果有内容安全策略，确保允许 Umami 脚本域名

### Vercel 部署失败

1. **检查环境变量**：确认 `DATABASE_URL` 和 `APP_SECRET` 已正确配置
2. **检查数据库状态**：在 Vercel Storage 确认 Neon 数据库已创建
3. **查看构建日志**：在 Deployments 页面查看详细错误信息

### Neon 数据库连接问题

1. **数据库暂停**：Neon 免费版会在闲置后暂停，首次访问需要唤醒（约 5-10 秒）
2. **SSL 连接**：Neon 要求 SSL 连接，确保连接字符串包含 `?sslmode=require`
3. **连接超时**：检查区域设置，选择离你最近的区域以降低延迟

### Docker 自托管无法启动

1. **检查数据库连接**：确保 PostgreSQL 容器正常运行
2. **检查日志**：运行 `docker logs umami` 查看错误信息
3. **检查端口**：确保 3001 端口未被占用

### 跨域问题

如果 Umami 和博客不在同一域名下，需要配置 CORS：

**Vercel 部署**：在环境变量中添加：

```
CORS_ALLOWED_ORIGINS=https://your-blog-domain.com
```

**Docker 部署**：在 `docker-compose.yml` 中添加：

```yaml
environment:
  # ... 其他配置
  CORS_ALLOWED_ORIGINS: https://your-blog-domain.com
```

### 统计数据不准确

Umami 使用指纹技术识别用户，以下情况可能导致统计偏差：

- 用户禁用 JavaScript
- 用户使用隐私浏览器（如 Tor）
- 用户使用广告拦截器

---

## 下一步

配置好 Umami 后，你可以：

- [配置 Waline 评论系统](/zh/posts/how-to-configure-astro-minimax-theme/#配置-waline-评论)，添加文章互动
- [配置 AI 聊天助手](/zh/posts/how-to-configure-astro-minimax-theme/#配置-ai-聊天)，增强用户体验
- [部署博客到 Cloudflare Pages](/zh/posts/deployment-guide/)，享受全球 CDN 加速

更多 Umami 功能，请参考 [Umami 官方文档](https://umami.is/docs)。
