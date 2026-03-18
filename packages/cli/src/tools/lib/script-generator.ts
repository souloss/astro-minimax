/**
 * Script generator module for podcast generation.
 * Converts blog posts to podcast dialogue scripts using LLM.
 *
 * @module podcast/script-generator
 */

import { chatCompletion } from "./ai-provider.js";
import type {
  PodcastScript,
  PodcastSpeaker,
  DialogueSegment,
} from "./types.js";
import { DEFAULT_SPEAKERS } from "./types.js";

/**
 * Options for script generation.
 */
export interface ScriptGeneratorOptions {
  /** Maximum characters per dialogue segment (default: 200) */
  maxSegmentLength?: number;
  /** Custom speaker configuration */
  speakers?: PodcastSpeaker[];
}

/** Default maximum segment length for TTS optimization */
const DEFAULT_MAX_SEGMENT_LENGTH = 200;

/**
 * Build the system prompt for the LLM.
 * @param lang - Language of the content
 * @param maxSegmentLength - Maximum characters per segment
 * @returns System prompt string
 */
function buildSystemPrompt(
  lang: "zh" | "en",
  maxSegmentLength: number
): string {
  if (lang === "en") {
    return `You are a podcast scriptwriter. Convert the given blog post into a natural dialogue between a host and a guest expert.

Requirements:
1. Preserve ALL key technical information and concepts
2. Create natural conversation flow with transitions
3. Host asks clarifying questions; Guest provides detailed explanations
4. Each segment must be under ${maxSegmentLength} characters for TTS optimization
5. Split long explanations into multiple segments
6. Include a brief intro and outro
7. Output ONLY valid JSON, no markdown code blocks

Output format:
{"segments":[{"speaker":"host","text":"..."},{"speaker":"guest","text":"..."}]}

Respond in English.`;
  }

  return `你是一位播客脚本撰写专家。将给定的博客文章转换为主持人和嘉宾专家之间的自然对话。

要求：
1. 保留所有关键技术信息和概念
2. 创建自然的对话流程，包含过渡
3. 主持人提出澄清性问题，嘉宾提供详细解释
4. 每个对话片段必须控制在 ${maxSegmentLength} 字符以内（TTS 优化）
5. 将长解释拆分为多个片段
6. 包含简短的开场和结束语
7. 只输出有效的 JSON，不要 markdown 代码块

输出格式：
{"segments":[{"speaker":"host","text":"..."},{"speaker":"guest","text":"..."}]}

请使用中文回复。`;
}

/**
 * Build the user prompt with article content.
 * @param title - Article title
 * @param content - Article body content
 * @param category - Article category
 * @param tags - Article tags
 * @returns User prompt string
 */
function buildUserPrompt(
  title: string,
  content: string,
  category: string,
  tags: string[]
): string {
  const lang = title.match(/[\u4e00-\u9fa5]/) ? "zh" : "en";

  if (lang === "en") {
    return `Article Title: ${title}
Category: ${category || "None"}
Tags: ${tags.join(", ") || "None"}

Article Content:
${content.slice(0, 8000)}`;
  }

  return `文章标题：${title}
分类：${category || "无"}
标签：${tags.join("、") || "无"}

文章正文：
${content.slice(0, 8000)}`;
}

/**
 * Parse the LLM response into dialogue segments.
 * @param raw - Raw LLM response string
 * @returns Array of dialogue segments
 * @throws Error if parsing fails or segments array is missing
 */
function parseDialogueResponse(raw: string): DialogueSegment[] {
  // Try to extract JSON from markdown code blocks if present
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : raw).trim();

  let parsed: { segments?: Array<{ speaker?: string; text?: string }> };
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!parsed.segments || !Array.isArray(parsed.segments)) {
    throw new Error("Invalid response: missing segments array");
  }

  // Validate and clean segments
  const segments: DialogueSegment[] = [];
  for (const seg of parsed.segments) {
    const speaker = seg.speaker || "host";
    const text = (seg.text || "").trim();

    // Skip empty segments
    if (text.length === 0) continue;

    // Validate speaker
    if (speaker !== "host" && speaker !== "guest") {
      segments.push({ speaker: "host", text });
    } else {
      segments.push({ speaker, text });
    }
  }

  if (segments.length === 0) {
    throw new Error("No valid dialogue segments generated");
  }

  return segments;
}

/**
 * Generate a podcast script from a blog article.
 *
 * @param article - Article data including id, title, body, etc.
 * @param options - Generation options
 * @returns Generated podcast script
 * @throws Error if LLM generation or parsing fails
 *
 * @example
 * ```typescript
 * const script = await generateScript({
 *   id: "zh/getting-started",
 *   title: "快速开始",
 *   lang: "zh",
 *   body: "文章内容...",
 *   category: "教程",
 *   tags: ["astro", "blog"],
 * });
 * ```
 */
export async function generateScript(
  article: {
    id: string;
    title: string;
    lang: "zh" | "en";
    body: string;
    category: string;
    tags: string[];
  },
  options: ScriptGeneratorOptions = {}
): Promise<PodcastScript> {
  const maxSegmentLength =
    options.maxSegmentLength || DEFAULT_MAX_SEGMENT_LENGTH;
  const speakers =
    options.speakers || DEFAULT_SPEAKERS[article.lang] || DEFAULT_SPEAKERS.zh;

  // Build prompts
  const systemPrompt = buildSystemPrompt(article.lang, maxSegmentLength);
  const userPrompt = buildUserPrompt(
    article.title,
    article.body,
    article.category,
    article.tags
  );

  // Call LLM
  const raw = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 4096 }
  );

  // Parse response
  const segments = parseDialogueResponse(raw);

  return {
    slug: article.id,
    title: article.title,
    lang: article.lang,
    speakers,
    segments,
    generatedAt: new Date().toISOString(),
    contentHash: "", // Will be set by caller
  };
}

/**
 * Calculate the total character count of a script.
 * @param segments - Dialogue segments
 * @returns Total character count
 */
export function calculateScriptLength(segments: DialogueSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.text.length, 0);
}

/**
 * Estimate the duration of a podcast script.
 * Assumes average speaking rate of 3 characters per second for Chinese,
 * 15 characters per second for English.
 *
 * @param segments - Dialogue segments
 * @param lang - Language of the script
 * @returns Estimated duration in seconds
 */
export function estimateDuration(
  segments: DialogueSegment[],
  lang: "zh" | "en"
): number {
  const totalChars = calculateScriptLength(segments);
  const charsPerSecond = lang === "zh" ? 3 : 15;
  return Math.ceil(totalChars / charsPerSecond);
}