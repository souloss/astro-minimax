/**
 * TTS (Text-to-Speech) provider module for podcast generation.
 * Supports OpenAI TTS API with proxy configuration.
 *
 * @module podcast/tts-provider
 */

import { fetch, ProxyAgent, type Dispatcher } from "undici";
import type { OpenAIVoice } from "./types.js";

/**
 * TTS configuration resolved from environment variables.
 */
export interface TTSConfig {
  /** Provider type (currently only "openai") */
  provider: "openai";
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API */
  baseUrl: string;
}

/**
 * Options for TTS generation.
 */
export interface TTSOptions {
  /** Voice to use for synthesis */
  voice: OpenAIVoice;
  /** Model: "tts-1" (faster) or "tts-1-hd" (higher quality) */
  model?: "tts-1" | "tts-1-hd";
  /** Speech speed: 0.25 to 4.0, default 1.0 */
  speed?: number;
}

/**
 * Resolve TTS configuration from environment variables.
 * Reads from AI_API_KEY, OPENAI_API_KEY, and AI_BASE_URL.
 * @returns TTS configuration object
 */
export function resolveTTSConfig(): TTSConfig {
  const apiKey =
    process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com";
  return { provider: "openai", apiKey, baseUrl };
}

/**
 * Check if TTS API key is configured.
 * @returns True if API key is available
 */
export function hasTTSApiKey(): boolean {
  return resolveTTSConfig().apiKey.length > 0;
}

/**
 * Get proxy dispatcher if HTTPS_PROXY or HTTP_PROXY is set.
 * @returns ProxyAgent if proxy is configured, undefined otherwise
 */
function getProxyDispatcher(): Dispatcher | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

/**
 * Normalize base URL by removing trailing /v1 if present.
 * @param baseUrl - Base URL to normalize
 * @returns Normalized URL without trailing /v1
 */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/v1\/?$/, "");
}

/**
 * Convert text to speech using OpenAI TTS API.
 *
 * @param text - Text to convert to speech (must not be empty)
 * @param options - TTS options including voice, model, and speed
 * @returns Audio data as Uint8Array (MP3 format)
 * @throws Error if text is empty, API key is missing, or API request fails
 *
 * @example
 * ```typescript
 * const audio = await textToSpeech("你好，世界", { voice: "alloy" });
 * // audio is a Uint8Array containing MP3 data
 * ```
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions
): Promise<Uint8Array> {
  // Validate input
  if (!text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const config = resolveTTSConfig();
  if (!config.apiKey) {
    throw new Error(
      "TTS API Key not configured. Set AI_API_KEY or OPENAI_API_KEY environment variable."
    );
  }

  const model = options.model || "tts-1";
  const speed = options.speed || 1.0;
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  // Build request
  const dispatcher = getProxyDispatcher();
  const requestBody = {
    model,
    input: text,
    voice: options.voice,
    speed,
    response_format: "mp3" as const,
  };

  try {
    const response = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      ...(dispatcher && { dispatcher }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const errMsg = errText.slice(0, 500);
      throw new Error(`TTS API error (${response.status}): ${errMsg}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    // Re-throw if already our error
    if (error instanceof Error && error.message.startsWith("TTS API error")) {
      throw error;
    }
    // Wrap other errors
    throw new Error(
      `TTS request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Estimate the cost of TTS generation.
 * OpenAI pricing: $15 per 1M characters for tts-1, $30 per 1M for tts-1-hd
 *
 * @param text - Text to estimate cost for
 * @param model - TTS model to use
 * @returns Estimated cost in USD
 */
export function estimateTTSCost(
  text: string,
  model: "tts-1" | "tts-1-hd" = "tts-1"
): number {
  const charCount = text.length;
  const pricePerMillion = model === "tts-1" ? 15 : 30;
  return (charCount / 1_000_000) * pricePerMillion;
}