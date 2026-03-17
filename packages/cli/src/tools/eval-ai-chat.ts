#!/usr/bin/env npx tsx
/**
 * AI 对话评估工具
 *
 * 基于黄金测试集自动评估 AI 对话质量。
 * 支持本地 dev server 和远程部署两种模式。
 *
 * 用法:
 *   astro-minimax ai eval                          评估所有用例
 *   astro-minimax ai eval --url=http://localhost:4321  指定 API 地址
 *   astro-minimax ai eval --category=no_answer     只评估特定分类
 *   astro-minimax ai eval --id=about-001           只评估特定用例
 *   astro-minimax ai eval --verbose                显示详细输出
 *   astro-minimax ai eval --json                   输出 JSON 报告
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "datas");
const GOLD_SET_FILE = join(DATA_DIR, "eval", "gold-set.json");
const REPORT_FILE = join(DATA_DIR, "eval", "report.json");

const DEFAULT_API_URL = "http://localhost:4321";
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Types ─────────────────────────────────────────────────

interface EvalCase {
  id: string;
  category: string;
  question: string;
  answerMode: string;
  expectedTopics: string[];
  forbiddenClaims: string[];
  mustHaveLinks?: boolean;
  lang: string;
}

interface GoldSet {
  $schema: string;
  version: number;
  cases: EvalCase[];
}

interface EvalResult {
  caseId: string;
  category: string;
  question: string;
  passed: boolean;
  score: number;
  maxScore: number;
  response: string;
  latency: number;
  checks: CheckResult[];
  error?: string;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

interface EvalReport {
  generatedAt: string;
  apiUrl: string;
  totalCases: number;
  passed: number;
  failed: number;
  passRate: string;
  avgLatency: string;
  results: EvalResult[];
}

// ─── CLI Args ──────────────────────────────────────────────

interface CliFlags {
  url: string;
  category: string | null;
  id: string | null;
  verbose: boolean;
  json: boolean;
}

function parseArgs(): CliFlags {
  const args = process.argv.slice(2);
  const flags: CliFlags = {
    url: DEFAULT_API_URL,
    category: null,
    id: null,
    verbose: false,
    json: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--url=")) flags.url = arg.split("=")[1];
    else if (arg.startsWith("--category=")) flags.category = arg.split("=")[1];
    else if (arg.startsWith("--id=")) flags.id = arg.split("=")[1];
    else if (arg === "--verbose") flags.verbose = true;
    else if (arg === "--json") flags.json = true;
  }

  return flags;
}

// ─── API Client ────────────────────────────────────────────

async function sendChatRequest(
  apiUrl: string,
  question: string,
  lang: string,
): Promise<{ response: string; latency: number }> {
  const url = `${apiUrl.replace(/\/$/, "")}/api/chat`;
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            id: `eval-${Date.now()}`,
            role: "user",
            parts: [{ type: "text", text: question }],
          },
        ],
        context: { scope: "global" },
        lang,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const text = await res.text();
    const latency = Date.now() - start;

    const responseText = extractTextFromSSE(text);

    return { response: responseText, latency };
  } finally {
    clearTimeout(timeout);
  }
}

function extractTextFromSSE(raw: string): string {
  const parts: string[] = [];

  for (const line of raw.split("\n")) {
    if (!line.startsWith("0:")) continue;
    try {
      const json = JSON.parse(line.slice(2));
      if (typeof json === "string") {
        parts.push(json);
      }
    } catch {
      const textMatch = line.match(/^0:"(.*)"/);
      if (textMatch) {
        parts.push(textMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
      }
    }
  }

  return parts.join("");
}

// ─── Evaluation Checks ────────────────────────────────────

function checkTopicCoverage(
  response: string,
  expectedTopics: string[],
): CheckResult {
  if (!expectedTopics.length) return { name: "topic_coverage", passed: true, detail: "No topics required" };

  const lower = response.toLowerCase();
  const found = expectedTopics.filter((t) => lower.includes(t.toLowerCase()));
  const missing = expectedTopics.filter((t) => !lower.includes(t.toLowerCase()));
  const passed = found.length >= Math.ceil(expectedTopics.length * 0.5);

  return {
    name: "topic_coverage",
    passed,
    detail: missing.length
      ? `Missing: ${missing.join(", ")} | Found: ${found.join(", ")}`
      : `All topics covered: ${found.join(", ")}`,
  };
}

function checkForbiddenClaims(
  response: string,
  forbiddenClaims: string[],
): CheckResult {
  if (!forbiddenClaims.length) return { name: "forbidden_claims", passed: true, detail: "No forbidden claims" };

  const lower = response.toLowerCase();
  const violations = forbiddenClaims.filter((c) => lower.includes(c.toLowerCase()));
  const passed = violations.length === 0;

  return {
    name: "forbidden_claims",
    passed,
    detail: violations.length
      ? `Violations: ${violations.join(", ")}`
      : "No violations",
  };
}

function checkHasLinks(response: string, mustHaveLinks?: boolean): CheckResult {
  if (!mustHaveLinks) return { name: "has_links", passed: true, detail: "Links not required" };

  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [...response.matchAll(linkPattern)];
  const passed = links.length > 0;

  return {
    name: "has_links",
    passed,
    detail: passed ? `Found ${links.length} link(s)` : "No Markdown links found",
  };
}

function checkNotEmpty(response: string): CheckResult {
  const passed = response.trim().length > 10;
  return {
    name: "not_empty",
    passed,
    detail: passed ? `Response length: ${response.length}` : "Response too short or empty",
  };
}

function checkAnswerMode(response: string, answerMode: string): CheckResult {
  const lower = response.toLowerCase();

  switch (answerMode) {
    case "unknown": {
      const refusalPatterns = [
        "未公开", "未在博客", "不提供", "不回答", "私人信息",
        "not disclosed", "not public", "not available", "private",
      ];
      const hasRefusal = refusalPatterns.some((p) => lower.includes(p));
      return {
        name: "answer_mode",
        passed: hasRefusal,
        detail: hasRefusal ? "Correctly refused sensitive question" : "Should have refused but answered",
      };
    }
    case "count": {
      const hasNumber = /\d+/.test(response);
      return {
        name: "answer_mode",
        passed: hasNumber,
        detail: hasNumber ? "Contains numeric answer" : "Missing numeric answer for count question",
      };
    }
    case "list": {
      const hasList = /[-•*]\s|^\d+\./m.test(response) || /\[.*\]\(.*\)/g.test(response);
      return {
        name: "answer_mode",
        passed: hasList,
        detail: hasList ? "Contains list-style answer" : "Expected list format",
      };
    }
    default:
      return { name: "answer_mode", passed: true, detail: `Mode: ${answerMode}` };
  }
}

function evaluateResponse(evalCase: EvalCase, response: string): CheckResult[] {
  return [
    checkNotEmpty(response),
    checkTopicCoverage(response, evalCase.expectedTopics),
    checkForbiddenClaims(response, evalCase.forbiddenClaims),
    checkHasLinks(response, evalCase.mustHaveLinks),
    checkAnswerMode(response, evalCase.answerMode),
  ];
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();

  let goldSet: GoldSet;
  try {
    const raw = await readFile(GOLD_SET_FILE, "utf-8");
    goldSet = JSON.parse(raw);
  } catch {
    console.error(`❌ 未找到评估数据集: ${GOLD_SET_FILE}`);
    console.error("   请先创建 datas/eval/gold-set.json");
    process.exit(1);
  }

  let cases = goldSet.cases;

  if (flags.category) {
    cases = cases.filter((c) => c.category === flags.category);
  }
  if (flags.id) {
    cases = cases.filter((c) => c.id === flags.id);
  }

  if (cases.length === 0) {
    console.error("❌ 没有匹配的评估用例");
    process.exit(1);
  }

  console.log("🧪 AI 对话评估");
  console.log("━".repeat(60));
  console.log(`   API: ${flags.url}`);
  console.log(`   用例: ${cases.length} / ${goldSet.cases.length}`);
  console.log("");

  const results: EvalResult[] = [];
  let passedCount = 0;
  let totalLatency = 0;

  for (let i = 0; i < cases.length; i++) {
    const evalCase = cases[i];
    const progress = `[${i + 1}/${cases.length}]`;

    process.stdout.write(`${progress} ${evalCase.id}: ${evalCase.question.slice(0, 40)}... `);

    try {
      const { response, latency } = await sendChatRequest(
        flags.url,
        evalCase.question,
        evalCase.lang,
      );
      totalLatency += latency;

      const checks = evaluateResponse(evalCase, response);
      const passedChecks = checks.filter((c) => c.passed).length;
      const score = passedChecks;
      const maxScore = checks.length;
      const allPassed = checks.every((c) => c.passed);

      if (allPassed) passedCount++;

      const result: EvalResult = {
        caseId: evalCase.id,
        category: evalCase.category,
        question: evalCase.question,
        passed: allPassed,
        score,
        maxScore,
        response: response.slice(0, 500),
        latency,
        checks,
      };
      results.push(result);

      const icon = allPassed ? "✅" : "❌";
      console.log(`${icon} ${score}/${maxScore} (${latency}ms)`);

      if (flags.verbose || !allPassed) {
        for (const check of checks) {
          const checkIcon = check.passed ? "  ✓" : "  ✗";
          console.log(`      ${checkIcon} ${check.name}: ${check.detail}`);
        }
        if (flags.verbose && response) {
          console.log(`      Response: ${response.slice(0, 200)}${response.length > 200 ? "..." : ""}`);
        }
        console.log("");
      }

      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ERROR: ${errorMsg}`);

      results.push({
        caseId: evalCase.id,
        category: evalCase.category,
        question: evalCase.question,
        passed: false,
        score: 0,
        maxScore: 5,
        response: "",
        latency: 0,
        checks: [],
        error: errorMsg,
      });
    }
  }

  // ── Summary ─────────────────────────────────────────────

  console.log("");
  console.log("━".repeat(60));
  console.log("📊 评估结果");
  console.log("");
  console.log(`   总用例: ${results.length}`);
  console.log(`   通过: ${passedCount} ✅`);
  console.log(`   失败: ${results.length - passedCount} ❌`);
  console.log(`   通过率: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`   平均延迟: ${results.length > 0 ? Math.round(totalLatency / results.length) : 0}ms`);
  console.log("");

  const byCategory = new Map<string, { passed: number; total: number }>();
  for (const r of results) {
    const cat = byCategory.get(r.category) ?? { passed: 0, total: 0 };
    cat.total++;
    if (r.passed) cat.passed++;
    byCategory.set(r.category, cat);
  }

  console.log("   分类详情:");
  for (const [cat, stats] of byCategory) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(0);
    console.log(`     ${cat}: ${stats.passed}/${stats.total} (${rate}%)`);
  }
  console.log("");

  // ── Save Report ─────────────────────────────────────────

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    apiUrl: flags.url,
    totalCases: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    passRate: `${((passedCount / results.length) * 100).toFixed(1)}%`,
    avgLatency: `${results.length > 0 ? Math.round(totalLatency / results.length) : 0}ms`,
    results,
  };

  await mkdir(join(DATA_DIR, "eval"), { recursive: true });
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2), "utf-8");
  console.log(`📄 报告已保存: ${REPORT_FILE}`);

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(passedCount === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ 评估失败:", err.message);
  process.exit(1);
});
