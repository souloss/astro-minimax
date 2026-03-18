/**
 * Core types and interfaces for the podcast generation system.
 *
 * @module podcast/types
 */

/**
 * Represents a voice/speaker in the podcast.
 */
export interface PodcastSpeaker {
  /** Unique identifier: "host" or "guest" */
  id: string;
  /** Display name (e.g., "主持人", "Host") */
  name: string;
  /** Role in the conversation */
  role: "host" | "guest";
  /** OpenAI TTS voice ID */
  voiceId: string;
}

/**
 * A single line of dialogue in the podcast script.
 */
export interface DialogueSegment {
  /** Speaker identifier: "host" or "guest" */
  speaker: string;
  /** The spoken text content */
  text: string;
}

/**
 * Complete podcast script for one blog article.
 */
export interface PodcastScript {
  /** Article slug (e.g., "zh/getting-started") */
  slug: string;
  /** Article title */
  title: string;
  /** Language of the content */
  lang: "zh" | "en";
  /** Speakers used in this podcast */
  speakers: PodcastSpeaker[];
  /** Dialogue segments */
  segments: DialogueSegment[];
  /** ISO timestamp when generated */
  generatedAt: string;
  /** MD5 hash of source content */
  contentHash: string;
}

/**
 * Metadata for generated podcast audio file.
 */
export interface PodcastAudioMeta {
  /** Article slug */
  slug: string;
  /** Language */
  lang: "zh" | "en";
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  fileSize: number;
  /** Audio format */
  format: "mp3";
  /** ISO timestamp when generated */
  generatedAt: string;
  /** MD5 hash of source content */
  contentHash: string;
}

/**
 * Optional frontmatter configuration for podcast generation.
 * Can be added to blog post frontmatter to customize podcast behavior.
 */
export interface PodcastFrontmatter {
  /** Enable/disable podcast generation for this article */
  enabled?: boolean;
  /** Override default voice assignments */
  voices?: {
    host?: string;
    guest?: string;
  };
}

/**
 * Cache structure for podcast scripts.
 */
export interface PodcastCache {
  meta: {
    lastUpdated: string | null;
    totalProcessed: number;
  };
  articles: Record<string, PodcastScript>;
}

/**
 * Audio metadata cache structure.
 */
export interface PodcastAudioCache {
  meta: {
    lastUpdated: string | null;
    totalProcessed: number;
  };
  articles: Record<string, PodcastAudioMeta>;
}

/**
 * Default speaker configurations for each language.
 * Host uses "alloy" (neutral voice), Guest uses "onyx" (deeper voice).
 */
export const DEFAULT_SPEAKERS: Record<"zh" | "en", PodcastSpeaker[]> = {
  zh: [
    { id: "host", name: "主持人", role: "host", voiceId: "alloy" },
    { id: "guest", name: "嘉宾", role: "guest", voiceId: "onyx" },
  ],
  en: [
    { id: "host", name: "Host", role: "host", voiceId: "alloy" },
    { id: "guest", name: "Guest", role: "guest", voiceId: "echo" },
  ],
};

/**
 * Available OpenAI TTS voices.
 * @see https://platform.openai.com/docs/guides/text-to-speech/voice-options
 */
export const OPENAI_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;

/** OpenAI voice type */
export type OpenAIVoice = (typeof OPENAI_VOICES)[number];

/**
 * Type guard to check if a string is a valid OpenAI voice.
 * @param voice - Voice string to check
 * @returns True if the voice is valid
 */
export function isValidOpenAIVoice(voice: string): voice is OpenAIVoice {
  return OPENAI_VOICES.includes(voice as OpenAIVoice);
}

/**
 * TTS models available from OpenAI.
 */
export const OPENAI_TTS_MODELS = ["tts-1", "tts-1-hd"] as const;

/** OpenAI TTS model type */
export type OpenAITTSModel = (typeof OPENAI_TTS_MODELS)[number];

/**
 * Parse podcast frontmatter from a record (parsed YAML frontmatter).
 * @param frontmatter - Parsed frontmatter object
 * @returns PodcastFrontmatter or undefined
 */
export function parsePodcastFrontmatter(
  frontmatter: Record<string, unknown>
): PodcastFrontmatter | undefined {
  if (!frontmatter.podcast) return undefined;

  const podcast = frontmatter.podcast as Record<string, unknown>;
  const voices = podcast.voices as Record<string, unknown> | undefined;
  
  return {
    enabled:
      typeof podcast.enabled === "boolean" ? podcast.enabled : undefined,
    voices: voices
      ? {
          host: typeof voices.host === "string" ? voices.host : undefined,
          guest: typeof voices.guest === "string" ? voices.guest : undefined,
        }
      : undefined,
  };
}