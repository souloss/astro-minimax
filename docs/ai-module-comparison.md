# AI 对话模块对比分析与优化建议

> 本文档对比分析 `luoleiorg-x` 和 `astro-minimax` 两个项目的 AI 对话模块实现，识别各自优劣，并提供优化建议。

---

## 1. 项目对比总览

| 对比维度 | luoleiorg-x | astro-minimax |
|----------|-------------|---------------|
| **项目类型** | 单体应用 | Monorepo + NPM 包 |
| **AI 模块位置** | 内嵌 `src/lib/ai/` | 独立包 `@astro-minimax/ai` |
| **代码行数** | ~3000 行 | ~2000 行 |
| **可复用性** | 低（紧耦合） | 高（独立包） |
| **部署目标** | Cloudflare Workers | Cloudflare Pages / 多平台 |

---

## 2. 架构对比

### 2.1 模块化程度

```
luoleiorg-x 架构:
─────────────────
src/lib/ai/           # 内嵌模块
├── chat-prompt.ts
├── chat-search.ts
├── citation-guard.ts
├── keyword-extraction.ts
├── evidence-analysis.ts
└── ...

src/lib/chat-prompts/ # Prompt 模块
├── core-identity.ts
├── core-rules.ts
├── runtime-context.ts
└── ...

astro-minimax 架构:
────────────────────
packages/ai/          # 独立 NPM 包
├── src/
│   ├── server/       # 服务端处理
│   ├── provider-manager/  # Provider 管理
│   ├── intelligence/ # 智能模块
│   ├── search/       # 搜索模块
│   ├── prompt/       # Prompt 构建
│   ├── cache/        # 缓存抽象
│   └── components/   # UI 组件
└── package.json      # 独立发布
```

**对比结论**：
- ✅ **astro-minimax** 模块化更好，可独立安装使用
- ⚠️ **luoleiorg-x** 紧耦合，难以复用

### 2.2 Provider 管理

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **Provider 数量** | 1 主 + 1 备用 | 多 Provider 优先级队列 |
| **故障转移** | 手动切换到 Workers AI | 自动故障转移 |
| **健康检查** | 无 | 完整健康追踪 |
| **Mock 降级** | 无 | 保证响应 |

**luoleiorg-x Provider 策略**：
```typescript
// 单一 Provider
const provider = createOpenAICompatible({
  name: "blog-chat",
  baseURL: baseUrl,
  apiKey,
});

// 备用 API: Workers AI (需要手动切换)
// /api/ai/chat 路由
```

**astro-minimax Provider 策略**：
```typescript
// 多 Provider 优先级管理
class ProviderManager {
  providers: ProviderAdapter[];  // 按权重排序
  
  async getAvailableProvider() {
    for (const provider of this.providers) {
      if (await provider.isAvailable()) return provider;
    }
    return null; // 触发 Mock 降级
  }
  
  // 健康追踪
  unhealthyThreshold: 3,
  healthRecoveryTTL: 60_000,
}
```

**对比结论**：
- ✅ **astro-minimax** Provider 管理更健壮
- ⚠️ **luoleiorg-x** 缺少自动故障转移和 Mock 降级

---

## 3. RAG 实现对比

### 3.1 搜索方案

两者都采用 **无嵌入模型的 TF-IDF 搜索**，实现类似：

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **搜索包** | `@luoleiorg/search-core` | 自建 `search/search-api.ts` |
| **搜索限制** | 12-24 篇文章 | 10-20 篇文章 |
| **深度内容** | 有（得分 ≥8 时提取全文） | 有（得分 ≥8 时提取全文） |
| **旅行重排序** | 有（专门优化） | 无 |

**luoleiorg-x 旅行搜索优化**：
```typescript
function rerankTravelEvidenceResults(query, results) {
  const TRAVEL_POSITIVE_TERMS = ["旅行", "游记", "day1", "自驾", "潜水", "马拉松"];
  const TRAVEL_NEGATIVE_TERMS = ["签证", "攻略", "机场"];
  // 根据关键词命中情况调整排序
}
```

**对比结论**：
- ✅ **luoleiorg-x** 有专门的旅行搜索优化
- ✅ **astro-minimax** 搜索模块更通用

### 3.2 意图识别

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **意图分类** | 7 类（ai_rag, indie_dev, etc.） | 简化版 |
| **回答模式** | 7 种（fact, list, count, timeline, etc.） | 无显式模式 |
| **意图排序** | 完整的评分排序 | 无 |

**luoleiorg-x 意图系统**：
```typescript
const INTENT_KEYWORDS = {
  ai_rag: ["ai", "rag", "embedding", "agent", "llm", ...],
  indie_dev: ["neko", "vibe coding", "出海", "独立开发", ...],
  devops_homelab: ["docker", "k8s", "nginx", "cloudflare", ...],
  frontend_fullstack: ["nextjs", "react", "typescript", ...],
  photo_travel: ["摄影", "旅行", "东京", "马拉松", ...],
  lifestyle: ["生活", "消费", "眼镜", "数码", ...],
};

function rankArticlesByIntent(query, articles) {
  // 标题命中 +3，分类命中 +2，摘要命中 +2，要点命中 +1
  // 根据意图相关性排序
}
```

**对比结论**：
- ✅ **luoleiorg-x** 意图系统更完善，能更好理解用户问题
- ⚠️ **astro-minimax** 意图识别较简单

---

## 4. Prompt 系统对比

### 4.1 架构差异

**luoleiorg-x（两版本）**：
```typescript
// V2 分层 Prompt
buildSystemPromptV2(articles, tweets, userQuery, projects)
  = Core Identity 
  + Core Rules 
  + Runtime Context
  + Evidence Analysis
```

**astro-minimax（三层）**：
```typescript
// 三层 Prompt
buildSystemPrompt(config)
  = Static Layer (authorName, siteUrl)
  + Semi-Static Layer (authorContext, voiceProfile)
  + Dynamic Layer (userQuery, articles, projects, evidence)
```

### 4.2 内容丰富度

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **核心身份** | 详细（身份 + 语气 + 风格模式） | 简洁（身份 + 职责 + 约束） |
| **回答规则** | 7 个协议 + 多样性约束 | 基本约束 |
| **来源分层** | L1-L5 五层 | 无显式分层 |
| **事实索引** | `fact-registry.json` | 无 |
| **回答模式提示** | 7 种模式对应提示 | 无 |

**luoleiorg-x 回答协议**：
```typescript
// 7 个必须执行的协议
1. 来源限制协议：只使用可见信息
2. 数字协议：任何数字必须在可见文本中出现
3. 履历协议：只以「关于你」为准
4. 链接协议：只引用提供的 URL
5. 文章优先协议：必须使用相关文章
6. 来源分层协议：L1 > L2 > L3 > L5
7. 回答模式协议：按预期模式组织答案
```

**对比结论**：
- ✅ **luoleiorg-x** Prompt 更严格，防幻觉机制更完善
- ⚠️ **astro-minimax** Prompt 较简单，可能产生不准确的引用

### 4.3 数据来源

| 数据文件 | luoleiorg-x | astro-minimax |
|----------|-------------|---------------|
| `author-context.json` | ✅ 详细（经验、技能、时间线） | ✅ 简化（文章列表） |
| `voice-profile.json` | ✅ 完整（语气、风格模式） | ✅ 完整 |
| `fact-registry.json` | ✅ 33 条验证事实 | ❌ 无 |
| `ai-summaries.json` | ✅ 342 篇 | ✅ 22 篇 |

**luoleiorg-x Fact Registry**：
```json
{
  "facts": [
    {
      "fact_id": "travel:日本",
      "fact_type": "travel_destination",
      "category": "travel",
      "value": "日本",
      "confidence": "verified",
      "attributes": { "kind": "country", "trip_count_min": 2 }
    }
  ]
}
```

**对比结论**：
- ✅ **luoleiorg-x** 有结构化事实索引，回答更准确
- ⚠️ **astro-minimax** 缺少事实索引，依赖搜索结果

---

## 5. 缓存系统对比

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **Session 缓存** | ✅ 内存 | ✅ KV + 内存 |
| **全局缓存** | ❌ 无 | ✅ 公共问题缓存 |
| **缓存 TTL** | 10 分钟 | 10 分钟 + 动态调整 |
| **缓存适配器** | 单一内存 | KV + 内存双模式 |

**astro-minimax 全局缓存**：
```typescript
// 公共问题跨用户共享
const PUBLIC_QUESTION_PATTERNS = [
  { type: 'article_count', patterns: [/有几篇/, /有多少篇/] },
  { type: 'project_list', patterns: [/有哪些项目/, /项目列表/] },
  { type: 'about', patterns: [/介绍.*自己/, /关于你/] },
];

// 检测到公共问题时，先检查缓存
if (publicQuestion && cachedSearch) {
  return streamResponse(cachedSearch);  // 直接返回缓存结果
}
```

**对比结论**：
- ✅ **astro-minimax** 缓存更完善，有全局缓存
- ⚠️ **luoleiorg-x** 缓存较简单，无跨用户共享

---

## 6. Citation Guard 对比

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **Preflight 检查** | ✅ 3 种动作 | ✅ 简化版 |
| **流式转换** | ✅ 实时注入引用 | ✅ 移除伪造链接 |
| **旅行事实处理** | ✅ 专门逻辑 | ❌ 无 |
| **隐私保护** | ✅ 专门处理 | ❌ 无 |

**luoleiorg-x Citation Guard 动作**：
```typescript
type CitationGuardActionType =
  | "replace_unknown_with_refusal"     // 替换为拒绝回答
  | "replace_travel_fact_with_grounded_source"  // 旅行事实处理
  | "append_direct_source_citation";   // 追加来源引用

// 隐私保护
function buildUnknownRefusal(query: string): string {
  if (/(住址|地址|小区)/u.test(query)) return "具体住址这类信息未公开，我不提供。";
  if (/(收入|工资|薪资)/u.test(query)) return "收入这类信息未公开，我不提供。";
  return "这个信息未公开，我不提供。";
}
```

**astro-minimax Citation Guard**：
```typescript
// 简化版：移除伪造链接
if (url.startsWith('http') && !validUrls.has(url)) {
  output += text;  // 保留文字，移除链接
  actions.push('stream_rewrite');
}
```

**对比结论**：
- ✅ **luoleiorg-x** Citation Guard 更完善，有隐私保护
- ⚠️ **astro-minimax** 功能较简单

---

## 7. 国际化支持

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **多语言内容** | ❌ 单语言 | ✅ 中/英双语 |
| **Prompt 国际化** | ❌ 固定中文 | ✅ 动态语言检测 |
| **错误消息** | ❌ 固定中文 | ✅ 多语言 |
| **构建脚本** | ❌ 单语言 | ✅ `--lang=zh\|en` |

**astro-minimax 国际化**：
```typescript
// 语言检测
const lang = getLang(env.SITE_LANG);

// 动态翻译
t('ai.status.found', lang, { count: 5 });
// zh: "找到 5 篇相关内容"
// en: "Found 5 related articles"

// 构建时过滤
pnpm ai:process --lang=zh  // 只处理中文文章
```

**对比结论**：
- ✅ **astro-minimax** 国际化更完善
- ⚠️ **luoleiorg-x** 仅支持中文

---

## 8. 监控与评估系统对比

### 8.1 通知系统

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **通知实现** | ✅ Telegram | ✅ Telegram + Webhook + Email |
| **通知渠道** | 仅 Telegram | 多渠道支持 |
| **通知内容** | 问题+回答+Token+耗时 | 问题+回答+文章引用+模型+Token+耗时 |
| **隐私保护** | ✅ IP 哈希 | ✅ 不记录 IP |
| **包依赖** | 内置实现 | `@astro-minimax/notify` |
| **配置要求** | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | `NOTIFY_TELEGRAM_*` / `NOTIFY_WEBHOOK_*` / `NOTIFY_RESEND_*` |

> **注意**：之前的文档错误地声称 astro-minimax 没有通知系统。实际上，astro-minimax 实现了更完善的多渠道通知系统，通过独立的 `@astro-minimax/notify` 包提供支持。

**astro-minimax 通知实现**：
```typescript
// packages/ai/src/server/notify.ts
export function notifyAiChat(options: ChatNotifyOptions): Promise<NotifyResult | null> {
  const notifier = getNotifier(env);  // 支持多渠道
  return notifier.aiChat({
    sessionId,
    roundNumber,
    userMessage,
    aiResponse: aiResponse?.slice(0, 500),
    referencedArticles,
    model,
    usage,
    timing,
    siteUrl: env.SITE_URL,
  });
}
```

**luoleiorg-x Telegram 通知示例**：
```
🗣 博客 AI 对话

👤 a1b2c3  ·  🕐 03-16 12:30:45  ·  第 1 轮

❓ 读者:
你好，你去过日本吗？

💬 AI:
是的，我去过日本至少2次...

📎 引用文章:
  · 文章 · 京都马拉松
  · 文章 · 东京旅行

⚙️ 模型配置:
  · API Host: generativelanguage.googleapis.com
  · 主对话模型: gemini-2.0-flash

🧮 Token 用量:
  · 本次请求合计: 总 1,234 / 入 1,000 / 出 234

⏱️ 阶段耗时:
  · 总耗时: 3,456ms
  · 关键词提取: 234ms
  · 检索执行: 45ms
```

### 8.2 AI 对话评估系统

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **黄金数据集** | ✅ 30+ 测试用例 | ❌ 无 |
| **自动化评估** | ✅ `pnpm eval:chat` | ❌ 无 |
| **回答模式检查** | ✅ 7 种模式 | ❌ 无 |
| **来源覆盖验证** | ✅ 有 | ❌ 无 |
| **禁止声明检查** | ✅ 有 | ❌ 无 |

**luoleiorg-x 评估用例结构**：
```json
{
  "id": "profile-self-intro-001",
  "category": "profile",
  "question": "介绍一下你自己",
  "answerMode": "fact",
  "mustHitSourceIds": ["exp:独立-2024年4月---至今"],
  "expectedTopics": ["独立开发", "全栈", "博客"],
  "forbiddenClaims": ["未公开年龄", "未公开收入"]
}
```

### 8.3 人机验证

| 特性 | luoleiorg-x | astro-minimax |
|------|-------------|---------------|
| **验证方式** | ✅ Cloudflare Turnstile | ❌ 无 |
| **验证模式** | 隐式（用户无感） | - |
| **配置要求** | `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | - |

---

## 9. 优化建议

### 8.1 astro-minimax 需要改进的地方

#### A. 增加 Fact Registry

```typescript
// 新增: datas/fact-registry.json
{
  "$schema": "fact-registry-v1",
  "facts": [
    {
      "fact_id": "project:astro-minimax",
      "fact_type": "project",
      "category": "project",
      "value": "astro-minimax",
      "confidence": "verified",
      "attributes": {
        "stars": 100,
        "description": "极简 Astro 博客主题"
      }
    }
  ]
}

// 在 Prompt 中注入
const factSection = buildFactRegistrySection(factRegistry);
```

#### B. 增强 Citation Guard

```typescript
// 添加隐私保护
function buildUnknownRefusal(query: string, lang: string): string {
  const patterns = [
    { regex: /(住址|地址|address)/u, zh: "具体住址未公开", en: "Address is not public" },
    { regex: /(收入|工资|salary)/u, zh: "收入信息未公开", en: "Income is not public" },
    { regex: /(家人|family)/u, zh: "家人信息未公开", en: "Family info is not public" },
  ];
  // ...
}

// 添加回答模式检测
function resolveAnswerMode(query: string): AnswerMode {
  if (/几次|多少|几篇/u.test(query)) return "count";
  if (/哪些|哪几个/u.test(query)) return "list";
  if (/怎么看|怎么想/u.test(query)) return "opinion";
  // ...
}
```

#### C. 增加意图分类与文章排序

```typescript
// 新增: intelligence/intent-ranking.ts
const INTENT_KEYWORDS = {
  astro: ["astro", "博客", "主题", "theme"],
  deployment: ["部署", "deploy", "vercel", "cloudflare"],
  config: ["配置", "config", "设置", "settings"],
  // ...
};

function rankArticlesByIntent(query: string, articles: ArticleContext[]) {
  const intent = classifyIntent(query);
  const keywords = INTENT_KEYWORDS[intent];
  
  return articles.map(article => ({
    ...article,
    score: calculateRelevanceScore(article, keywords)
  })).sort((a, b) => b.score - a.score);
}
```

#### D. 添加来源分层协议

```typescript
// 在 Prompt 中添加
const SOURCE_LAYERS = `
## 来源分层协议（必须遵守）
- L1 authored_public: 原始博客公开内容（最高优先级）
- L2 curated_public: 作者简介、项目列表
- L3 validated_derived: 结构化事实索引
- L5 style_only: 语言风格（仅影响表达）

当来源冲突时，L1 > L2 > L3 > L5。
`;
```

### 8.2 luoleiorg-x 可以借鉴的地方

#### A. 模块化与包化

```typescript
// 将 src/lib/ai/ 抽取为独立包
packages/ai-chat/
├── src/
│   ├── server/
│   ├── intelligence/
│   ├── prompt/
│   └── search/
└── package.json  // @luoleiorg/ai-chat
```

#### B. 全局缓存

```typescript
// 新增: cache/global-cache.ts
const PUBLIC_QUESTION_PATTERNS = [
  { type: 'travel_countries', patterns: [/去过哪些国家/, /去过哪里/] },
  { type: 'marathon_count', patterns: [/跑过几场马拉松/, /马拉松成绩/] },
];

async function getGlobalSearchCache(type: string, context: CacheContext) {
  const key = buildGlobalCacheKey(type, context);
  return await cache.get(key);
}
```

#### C. Mock 降级

```typescript
// 新增: providers/mock.ts
export function getMockResponse(query: string, lang: string): string {
  return lang === 'zh' 
    ? "抱歉，AI 服务暂时不可用，请稍后再试。"
    : "Sorry, AI service is temporarily unavailable.";
}

// 在 chat-handler.ts 中
if (!streamSuccess) {
  const mockText = getMockResponse(latestText, lang);
  writer.write({ type: 'text-delta', textDelta: mockText });
}
```

#### D. Provider 健康检查

```typescript
// 新增: provider-manager/health-tracker.ts
interface ProviderHealth {
  healthy: boolean;
  consecutiveFailures: number;
  lastError?: string;
  lastSuccessTime?: number;
}

class HealthTracker {
  recordSuccess(providerId: string) { /* ... */ }
  recordFailure(providerId: string, error: Error) { /* ... */ }
  isAvailable(providerId: string): boolean { /* ... */ }
}
```

### 8.3 astro-minimax 需要新增的功能

> **注意**：通知系统已在 `packages/ai/src/server/notify.ts` 中实现，无需新增。

#### E. 通知系统（已实现 ✅）

```typescript
// 已实现: packages/ai/src/server/notify.ts
export interface ChatNotifyOptions {
  env: NotifyEnv;
  sessionId: string;
  messages: UIMessage[];
  aiResponse?: string;
  referencedArticles?: ArticleRef[];
  model?: ModelInfo;
  usage?: TokenUsage;
  timing?: PhaseTiming;
}

// 支持多渠道通知
export function notifyAiChat(options: ChatNotifyOptions): Promise<NotifyResult | null> {
  const notifier = getNotifier(options.env);
  if (!notifier) return Promise.resolve(null);
  
  return notifier.aiChat({
    sessionId: options.sessionId,
    roundNumber,
    userMessage,
    aiResponse: options.aiResponse?.slice(0, 500),
    referencedArticles: options.referencedArticles,
    model: options.model,
    usage: options.usage,
    timing: options.timing,
    siteUrl: options.env.SITE_URL,
  });
}
```

#### F. AI 对话评估系统

```typescript
// 新增: scripts/eval-ai-chat.ts
// 新增: data/eval/gold-set.json

interface EvalCase {
  id: string;
  category: 'profile' | 'project' | 'recommendation' | 'no_answer';
  question: string;
  answerMode: 'fact' | 'list' | 'recommendation' | 'unknown';
  expectedTopics: string[];
  forbiddenClaims: string[];
}

// 评估检查
async function evaluateCase(case: EvalCase, response: string) {
  return {
    topicCoverage: checkTopics(response, case.expectedTopics),
    forbiddenViolations: checkForbidden(response, case.forbiddenClaims),
    latency: responseTime,
  };
}
```

#### G. 人机验证

```typescript
// 新增: middleware/turnstile.ts
export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });
  
  const data = await response.json();
  return data.success;
}
```

---

## 10. 功能差距矩阵

| 功能 | luoleiorg-x | astro-minimax | 建议 |
|------|-------------|---------------|------|
| 多 Provider 故障转移 | ⚠️ 手动 | ✅ 自动 | luoleiorg-x 需改进 |
| Mock 降级 | ❌ 无 | ✅ 有 | luoleiorg-x 需增加 |
| 全局缓存 | ❌ 无 | ✅ 有 | luoleiorg-x 需增加 |
| Fact Registry | ✅ 完整 | ❌ 无 | astro-minimax 需增加 |
| 意图分类 | ✅ 7 类 | ⚠️ 简化 | astro-minimax 需增强 |
| 回答模式 | ✅ 7 种 | ❌ 无 | astro-minimax 需增加 |
| 来源分层 | ✅ L1-L5 | ❌ 无 | astro-minimax 需增加 |
| Citation Guard | ✅ 完整 | ⚠️ 简化 | astro-minimax 需增强 |
| 隐私保护 | ✅ 有 | ❌ 无 | astro-minimax 需增加 |
| 国际化 | ⚠️ 中文 | ✅ 多语言 | luoleiorg-x 需改进 |
| 模块化 | ⚠️ 紧耦合 | ✅ 独立包 | luoleiorg-x 需重构 |
| 搜索优化 | ✅ 旅行专用 | ⚠️ 通用 | 各有侧重 |
| 边读边聊 | ✅ 支持 | ✅ 支持 | 相当 |
| 通知系统 | ✅ Telegram | ✅ Telegram+Webhook+Email | 各有侧重 |
| AI 评估系统 | ✅ 有 | ❌ 无 | astro-minimax 需增加 |
| 人机验证 | ✅ Turnstile | ❌ 无 | astro-minimax 需增加 |

---

## 11. 总结

### astro-minimax 优势
1. **架构优秀**：模块化、可复用、易扩展
2. **健壮性好**：多 Provider 故障转移 + Mock 降级
3. **性能优化**：全局缓存减少重复计算
4. **国际化**：完整的多语言支持
5. **通知系统**：支持 Telegram + Webhook + Email 多渠道

### astro-minimax 需改进
1. **Prompt 系统**：增加来源分层、回答模式
2. **事实索引**：建立 Fact Registry 提高准确性
3. **Citation Guard**：增加隐私保护、旅行事实处理
4. **意图识别**：增强意图分类和文章排序
5. **评估系统**：建立黄金数据集和自动化评估
6. **人机验证**：集成 Turnstile 防止滥用

### luoleiorg-x 优势
1. **Prompt 严谨**：7 个协议防幻觉
2. **事实索引**：Fact Registry 提供准确数据
3. **意图系统**：完整的意图分类和回答模式
4. **搜索优化**：专门的旅行搜索重排序
5. **可观测性**：Telegram 监控 + 自动化评估
6. **安全性**：Turnstile 人机验证

### luoleiorg-x 需改进
1. **模块化**：抽取为独立包
2. **容错性**：增加 Mock 降级
3. **缓存**：增加全局缓存
4. **Provider 管理**：增加健康检查和自动故障转移
5. **国际化**：支持多语言

---

## 12. 实施路线图

### astro-minimax 优先级排序

| 优先级 | 功能 | 工作量 | 影响 |
|--------|------|--------|------|
| P0 | Fact Registry | 中 | 高 - 提高回答准确性 |
| P0 | 来源分层协议 | 小 | 高 - 防止幻觉 |
| P1 | 隐私保护 | 小 | 中 - 安全合规 |
| P2 | AI 评估系统 | 中 | 中 - 质量保障 |
| P2 | 回答模式提示 | 小 | 中 - 回答质量 |
| P3 | 人机验证 | 小 | 低 - 防滥用 |
| P3 | 意图分类增强 | 中 | 低 - 搜索精度 |

> **注意**：之前文档错误地将"Telegram 监控"列为待实现项。实际上，astro-minimax 已通过 `@astro-minimax/notify` 包实现了更完善的多渠道通知系统。

### luoleiorg-x 优先级排序

| 优先级 | 功能 | 工作量 | 影响 |
|--------|------|--------|------|
| P0 | Mock 降级 | 小 | 高 - 可用性保障 |
| P0 | Provider 健康检查 | 中 | 高 - 可靠性 |
| P1 | 全局缓存 | 中 | 中 - 性能 |
| P2 | 模块化重构 | 大 | 中 - 可维护性 |
| P3 | 国际化支持 | 中 | 低 - 用户覆盖 |

---

*文档生成时间: 2026-03-16*
*更新时间: 2026-03-16（补充 Telegram 监控、AI 评估、Turnstile 对比）*