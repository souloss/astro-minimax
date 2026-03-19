/**
 * Type definitions for the AI Provider Manager.
 *
 * Supports multiple provider types with priority-based fallback.
 */

import type { UIMessage } from 'ai';

// ============================================================================
// Provider Configuration Types
// ============================================================================

/**
 * Base configuration shared by all provider types.
 */
export interface BaseProviderConfig {
  /** Unique identifier for this provider instance */
  id: string;
  /** Provider type */
  type: 'openai' | 'workers';
  /** Priority weight (higher = more preferred). Default: 100 */
  weight?: number;
  /** Default model for chat */
  model: string;
  /** Model for keyword extraction (optional, defaults to model) */
  keywordModel?: string;
  /** Model for evidence analysis (optional, defaults to keywordModel) */
  evidenceModel?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;
  /** Max retries on failure. Default: 0 (no retry, fallback to next provider) */
  maxRetries?: number;
  /** Enable this provider. Default: true */
  enabled?: boolean;
}

/**
 * OpenAI-compatible provider configuration.
 * Supports DeepSeek, Moonshot, Qwen, OpenAI, and any OpenAI-compatible API.
 */
export interface OpenAIProviderConfig extends BaseProviderConfig {
  type: 'openai';
  /** API base URL (e.g., https://api.deepseek.com/v1) */
  baseURL: string;
  /** API key */
  apiKey: string;
}

/**
 * Cloudflare Workers AI provider configuration.
 * Uses AI binding directly from the Cloudflare environment.
 */
export interface WorkersAIProviderConfig extends BaseProviderConfig {
  type: 'workers';
  /** AI binding name in Cloudflare environment. Default: 'minimaxAI' */
  bindingName: string;
}

/**
 * Union type for all provider configurations.
 */
export type ProviderConfig = OpenAIProviderConfig | WorkersAIProviderConfig;

/**
 * Environment variable interface for provider configuration.
 * Used to build ProviderConfig from environment variables.
 */
export interface ProviderManagerEnv {
  [key: string]: unknown;
  /** JSON string containing array of ProviderConfig */
  AI_PROVIDERS?: string;
  // OpenAI-compatible provider config
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
  AI_KEYWORD_MODEL?: string;
  AI_EVIDENCE_MODEL?: string;
  // Workers AI provider config
  AI_BINDING_NAME?: string;
  AI_WORKERS_MODEL?: string;
}

// ============================================================================
// Provider Instance & Status Types
// ============================================================================

/**
 * Health status of a provider instance.
 */
export interface ProviderHealth {
  /** Whether the provider is currently healthy */
  healthy: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Total number of requests */
  totalRequests: number;
  /** Total number of successful requests */
  successfulRequests: number;
  /** Last error message (if any) */
  lastError?: string;
  /** Timestamp of last error */
  lastErrorTime?: number;
  /** Timestamp of last successful request */
  lastSuccessTime?: number;
  /** Timestamp when health status was last updated */
  lastChecked: number;
}

/**
 * Runtime status of a provider.
 */
export interface ProviderStatus {
  /** Provider ID */
  id: string;
  /** Provider type */
  type: 'openai' | 'workers' | 'mock';
  /** Priority weight */
  weight: number;
  /** Whether the provider is enabled */
  enabled: boolean;
  /** Current health status */
  health: ProviderHealth;
  /** Model name */
  model: string;
}

// ============================================================================
// Stream Options & Result Types
// ============================================================================

/**
 * Options for streaming text generation.
 */
export interface StreamTextOptions {
  /** System prompt */
  system?: string;
  /** Conversation messages */
  messages: UIMessage[];
  /** Temperature (0-1). Default: 0.7 */
  temperature?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Language for mock responses (zh/en) */
  lang?: string;
  /** User question (for mock responses) */
  userQuestion?: string;
  /** Callback for errors during streaming */
  onError?: (error: Error) => void;
}

/**
 * Result from streamText operation.
 * Compatible with AI SDK's streamText result.
 */
export interface StreamTextResult {
  /** Convert to UI Message Stream Response for AI SDK v6 */
  toUIMessageStreamResponse: (options?: { headers?: HeadersInit }) => Response;
  /** The text content (for non-streaming usage) */
  text?: Promise<string>;
  /** Provider ID that handled the request */
  providerId: string;
  /** Whether this is a mock response */
  isMock: boolean;
}

/**
 * Result from provider health check.
 */
export interface HealthCheckResult {
  providerId: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

// ============================================================================
// Manager Options Types
// ============================================================================

/**
 * Options for creating a ProviderManager.
 */
export interface ProviderManagerOptions {
  /** Number of consecutive failures before marking unhealthy. Default: 3 */
  unhealthyThreshold?: number;
  /** Time in ms before retrying an unhealthy provider. Default: 60000 (1 min) */
  healthRecoveryTTL?: number;
  /** Enable mock provider as final fallback. Default: true */
  enableMockFallback?: boolean;
  /** Callback when provider switch occurs */
  onProviderSwitch?: (fromId: string | null, toId: string, reason: string) => void;
  /** Callback when streaming error occurs */
  onStreamError?: (providerId: string, error: Error) => void;
  /** Callback when health status changes */
  onHealthChange?: (providerId: string, healthy: boolean) => void;
}

// ============================================================================
// Provider Adapter Interface
// ============================================================================

/**
 * Abstract interface for provider adapters.
 * All provider types must implement this interface.
 */
export interface ProviderAdapter {
  /** Provider identifier */
  readonly id: string;
  /** Provider type */
  readonly type: 'openai' | 'workers' | 'mock';
  /** Priority weight */
  readonly weight: number;
  /** Default model */
  readonly model: string;
  /** Model for keyword extraction */
  readonly keywordModel: string;
  /** Model for evidence analysis */
  readonly evidenceModel: string;
  /** Request timeout in ms */
  readonly timeout: number;

  /**
   * Check if this provider is currently available and healthy.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Stream text generation.
   */
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;

  /**
   * Get current health status.
   */
  getHealth(): ProviderHealth;

  /**
   * Record a successful request.
   */
  recordSuccess(): void;

  /**
   * Record a failed request.
   */
  recordFailure(error: Error): void;

  getProvider(): { chatModel: (model: string) => unknown };
  chatModel(model?: string): unknown;

  dispose?(): void;
}