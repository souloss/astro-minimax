import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { AuthorContextFile, VoiceProfile } from '../data/types.js';

export interface StaticLayerConfig {
  authorName: string;
  siteUrl: string;
  description?: string;
  systemPromptOverride?: string;
  lang?: string;
}

export interface SemiStaticLayerConfig {
  authorContext: AuthorContextFile | null;
  voiceProfile: VoiceProfile | null;
  lang?: string;
}

export interface DynamicLayerConfig {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  evidenceSection?: string;
  /** Pre-built verified-facts prompt section from Fact Registry */
  factSection?: string;
  lang?: string;
}

export interface PromptBuildConfig {
  static: StaticLayerConfig;
  semiStatic: SemiStaticLayerConfig;
  dynamic: DynamicLayerConfig;
}
