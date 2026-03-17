# astro-minimax 优化计划

> 基于 luoleiorg-x 对比分析的取长补短行动方案。按优先级排序。

---

## P0 — 直接提升 AI 回答质量

### 1. Prompt 回答模式协议

**目标**：为每种回答模式提供具体的输出格式指导

**来源**：luoleiorg-x `core-rules.ts` 的回答模式协议

**实现**：在 `packages/ai/src/prompt/static-layer.ts` 的约束部分添加：

```
回答模式指导：
- fact: 先给结论，再补依据
- list: 直接列 2-6 项同一维度的内容
- count: 第一句先说数字或"至少 X"
- timeline: 按时间顺序，给年份或阶段锚点
- opinion: 先"我觉得/我的看法是"，再展开 2-3 个观点
- recommendation: 先给 2-4 个推荐项，再说明理由
- unknown: 第一句必须包含"未公开"/"不提供"，1-2 句收尾
```

**工作量**：小（修改 Prompt 文本）
**影响**：高（回答结构更清晰）

### 2. 输出前检查清单

**目标**：在 Prompt 中添加心里执行的检查步骤

**来源**：luoleiorg-x `core-rules.ts` 的输出前检查

**实现**：在 static-layer.ts 添加：

```
输出前检查（在心里执行，不输出步骤）：
- 将输出链接 → 检查 URL 是否在「相关文章」列表中
- 将输出数字 → 检查是否在可见文本中出现
- 将输出公司/职位 → 检查是否在「作者简介」中
- 将引用文章 → 使用 Markdown 链接格式 [标题](URL)
```

**工作量**：小
**影响**：高（防幻觉核心机制）

### 3. 裸 URL 禁令

**目标**：禁止 AI 输出裸 URL（如直接写 `https://example.com`）

**来源**：luoleiorg-x 发现裸 URL 会导致前端渲染异常

**实现**：在约束中添加一条："所有链接必须使用 Markdown 格式 `[显示文字](URL)`，禁止裸输出 URL"

**工作量**：极小
**影响**：中（防止渲染问题）

### 4. 文章优先协议

**目标**：如果相关文章的摘要/要点涉及用户问题，必须基于文章回答

**来源**：luoleiorg-x 第 5 条协议

**实现**：在约束中添加：
"如果「相关文章」中有文章的标题、摘要或要点与用户问题相关，必须基于这些文章回答，不能说'没有找到相关内容'"

**工作量**：极小
**影响**：高（避免 AI 忽略已检索到的内容）

---

## P1 — 提升搜索精准度

### 5. 分维度意图排序打分

**目标**：标题/分类/摘要/要点分别赋权

**来源**：luoleiorg-x `intent-ranking.ts` 的 `rankArticlesByIntent()`

**当前实现**：`intelligence/intent-detect.ts` 混合打分（searchableText 包含关键词 +2）

**目标实现**：
```typescript
const titleHit = countKeywordHits(article.title, keywords) > 0 ? 3 : 0;
const categoryHit = article.categories?.some(c => keywords.includes(c.toLowerCase())) ? 2 : 0;
const summaryHit = countKeywordHits(article.summary, keywords) > 0 ? 2 : 0;
const keyPointHit = article.keyPoints.some(kp => keywords.includes(kp.toLowerCase())) ? 1 : 0;
const recentHit = isRecent(article.dateTime) ? 1 : 0;
```

**工作量**：中
**影响**：中（搜索结果排序更精准）

### 6. 新近度加分

**目标**：365 天内发布的文章额外加分

**来源**：luoleiorg-x `isRecent()` 函数

**实现**：在 `rankArticlesByIntent()` 中添加日期检查

**工作量**：小
**影响**：低

---

## P2 — 提升评估质量

### 7. 来源覆盖验证

**目标**：检查 AI 回答是否引用了预期的来源

**来源**：luoleiorg-x `mustHitSourceIds`

**实现**：在 gold-set.json 中添加 `mustHitSourceIds` 字段，在评估脚本中检查回答是否包含预期的文章链接

**工作量**：中
**影响**：中

### 8. 加权评分

**目标**：不同检查项有不同权重

**来源**：luoleiorg-x 加权评分系统

**实现**：
```typescript
const weights = {
  not_empty: 1,
  topic_coverage: 3,
  forbidden_claims: 5,
  has_links: 2,
  answer_mode: 3,
  source_hit: 4,
};
```

**工作量**：小
**影响**：中

### 9. 多模型评估

**目标**：在多个 LLM 上运行测试集

**实现**：`astro-minimax ai eval --model=gpt-4o-mini --model=deepseek-chat`

**工作量**：中
**影响**：高（发现不同模型的质量差异）

---

## P3 — 新功能

### 10. Turnstile 人机验证

**目标**：防止 AI 配额被滥用

**来源**：luoleiorg-x 已集成

**实现**：
1. `packages/ai/src/middleware/turnstile.ts` — 验证逻辑
2. `chat-handler.ts` — 请求头检查
3. 前端组件 — 隐式 Turnstile Widget

**工作量**：中
**影响**：中（安全防护）

### 11. 引用自动追加

**目标**：AI 回答缺少引用时自动追加最佳来源链接

**来源**：luoleiorg-x `applyCitationGuard()` 的 `append_direct_source_citation`

**实现**：在 `createCitationGuardTransform()` 中，文本完成后检查是否引用了任何已知来源，如果没有则追加

**工作量**：中
**影响**：中（提升回答的可引用性）

### 12. 表述多样性

**目标**：避免重复使用相同的"没有记录"措辞

**来源**：luoleiorg-x 4 个随机模板

**实现**：在 Prompt 中添加多个变化模板

**工作量**：小
**影响**：低（提升对话自然度）

### 13. 命令面板搜索

**目标**：⌘K 弹出命令面板式搜索

**来源**：luoleiorg-x `search-command.tsx` + `cmdk`

**实现**：需要创建 Preact 版本的命令面板组件

**工作量**：大
**影响**：高（搜索 UX 大幅提升）

### 14. Fact Registry

**目标**：结构化验证事实索引

**来源**：luoleiorg-x `data/fact-registry.json`

**实现**：
1. CLI 工具 `astro-minimax facts build`
2. 数据文件 `datas/fact-registry.json`
3. Prompt 中注入为 L3 来源

**工作量**：大
**影响**：中（提升事实类问题准确性）

### 15. 文章 AI 摘要组件

**目标**：文章页展示 AI 生成的摘要

**来源**：luoleiorg-x `article-ai-summary.tsx`

**实现**：在 PostDetails.astro 中添加摘要区域，从 `ai-summaries.json` 读取

**工作量**：小
**影响**：中（提升阅读体验）

---

## 实施路线图

### 阶段 1 (v0.8) — Prompt 质量
- [ ] #1 回答模式协议
- [ ] #2 输出前检查
- [ ] #3 裸 URL 禁令
- [ ] #4 文章优先协议

### 阶段 2 (v0.9) — 搜索与评估
- [ ] #5 分维度打分
- [ ] #7 来源覆盖验证
- [ ] #8 加权评分

### 阶段 3 (v1.0) — 新功能
- [ ] #10 Turnstile
- [ ] #11 引用追加
- [ ] #13 命令面板
- [ ] #15 AI 摘要组件

### 持续优化
- [ ] #9 多模型评估
- [ ] #14 Fact Registry
- [ ] #12 表述多样性
- [ ] #6 新近度加分

---

*生成日期：2026-03-17*
