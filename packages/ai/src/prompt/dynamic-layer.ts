import type { DynamicLayerConfig } from './types.js';
import { getLang } from '../utils/i18n.js';

const LABELS = {
  zh: {
    relatedContent: '与当前问题相关的内容',
    relatedArticles: '相关文章',
    relatedProjects: '相关项目',
    summary: '摘要',
    keyPoints: '要点',
    excerpt: '内容节选',
    instruction: (query: string) => `基于以上内容回答用户关于「${query}」的问题。如果以上内容与问题不相关，如实告知并提供力所能及的帮助。`,
  },
  en: {
    relatedContent: 'Content related to the current question',
    relatedArticles: 'Related Articles',
    relatedProjects: 'Related Projects',
    summary: 'Summary',
    keyPoints: 'Key points',
    excerpt: 'Excerpt',
    instruction: (query: string) => `Answer the user's question about "${query}" based on the content above. If the above content is not relevant, say so honestly and provide whatever help you can.`,
  },
} as const;

/**
 * Dynamic layer: per-request search results and evidence analysis.
 * Built fresh on every chat request.
 */
export function buildDynamicLayer(config: DynamicLayerConfig): string {
  const { userQuery, articles, projects, evidenceSection } = config;
  const lang = getLang(config.lang) as keyof typeof LABELS;
  const l = LABELS[lang];

  if (!articles.length && !projects.length) return '';

  const lines: string[] = [];
  lines.push(`## ${l.relatedContent}`);

  if (articles.length) {
    lines.push('');
    lines.push(`### ${l.relatedArticles}`);
    for (const article of articles.slice(0, 8)) {
      lines.push(`**[${article.title}](${article.url})**`);
      if (article.summary) lines.push(`${l.summary}：${article.summary.slice(0, 120)}`);
      if (article.keyPoints.length) {
        lines.push(`${l.keyPoints}：${article.keyPoints.slice(0, 3).join('；')}`);
      }
      if (article.fullContent) {
        lines.push(`${l.excerpt}：${article.fullContent.slice(0, 600)}`);
      }
      lines.push('');
    }
  }

  if (projects.length) {
    lines.push(`### ${l.relatedProjects}`);
    for (const project of projects.slice(0, 4)) {
      lines.push(`- **[${project.name}](${project.url})**：${project.description.slice(0, 100)}`);
    }
    lines.push('');
  }

  if (evidenceSection) {
    lines.push(evidenceSection);
  }

  lines.push(`---`);
  lines.push(l.instruction(userQuery.slice(0, 50)));

  return lines.join('\n');
}
