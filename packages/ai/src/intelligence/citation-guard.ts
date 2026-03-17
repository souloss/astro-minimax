import type { ArticleContext, ProjectContext } from '../search/types.js';
import type { CitationGuardPreflight, CitationGuardAction } from './types.js';

export type AnswerMode = 'fact' | 'count' | 'list' | 'opinion' | 'recommendation' | 'unknown' | 'general';

interface PrivacyPattern {
  regex: RegExp;
  zh: string;
  en: string;
}

const PRIVACY_PATTERNS: PrivacyPattern[] = [
  { regex: /(住址|地址|住在哪|address|where.*live)/iu, zh: '具体住址是私人信息，未在博客中公开。', en: 'Address is private and not disclosed on the blog.' },
  { regex: /(收入|工资|薪资|salary|income|earn)/iu, zh: '收入信息未在博客中公开。', en: 'Income information is not disclosed on the blog.' },
  { regex: /(家人|妻子|丈夫|孩子|父母|family|wife|husband|children|parent)/iu, zh: '家人信息未在博客中公开。', en: 'Family information is not disclosed on the blog.' },
  { regex: /(电话|手机号|phone|mobile)/iu, zh: '联系电话未在博客中公开。', en: 'Phone number is not disclosed on the blog.' },
  { regex: /(身份证|id\s*card|passport)/iu, zh: '身份证件信息未在博客中公开。', en: 'ID information is not disclosed on the blog.' },
  { regex: /(年龄|多大了|几岁|how old|age)/iu, zh: '年龄信息未在博客中公开。', en: 'Age information is not disclosed on the blog.' },
];

/**
 * Resolves the expected answer mode from the user query.
 * Helps the system decide how to structure the response.
 */
export function resolveAnswerMode(query: string): AnswerMode {
  const q = query.toLowerCase();
  if (/几次|多少|几篇|数量|count|how many/u.test(q)) return 'count';
  if (/哪些|哪几个|列表|列举|list|what are/u.test(q)) return 'list';
  if (/怎么看|怎么想|看法|观点|opinion|think about/u.test(q)) return 'opinion';
  if (/推荐|建议|suggest|recommend/u.test(q)) return 'recommendation';
  if (/是什么|什么是|介绍|解释|what is|explain/u.test(q)) return 'fact';
  if (/有没有|是否|是不是|真的吗|does|is there/u.test(q)) return 'fact';
  return 'general';
}

/**
 * Checks if the query is asking for sensitive personal information.
 * Returns a privacy refusal if matched.
 */
function checkPrivacyRefusal(query: string, lang: string): CitationGuardPreflight | null {
  for (const pattern of PRIVACY_PATTERNS) {
    if (pattern.regex.test(query)) {
      return {
        text: lang === 'en' ? pattern.en : pattern.zh,
        actions: ['preflight_reject'],
      };
    }
  }
  return null;
}

/**
 * Pre-flight check: if the user is asking about something that can be
 * answered directly from the available context without an LLM, return it.
 * This prevents hallucination for specific factual queries.
 */
export function getCitationGuardPreflight(params: {
  userQuery: string;
  articles: ArticleContext[];
  projects: ProjectContext[];
  lang?: string;
}): CitationGuardPreflight | null {
  const { userQuery, articles, projects, lang = 'zh' } = params;
  const q = userQuery.toLowerCase();

  const privacyRefusal = checkPrivacyRefusal(userQuery, lang);
  if (privacyRefusal) return privacyRefusal;

  if (/有几篇|有多少篇|文章数量|总共.*文章|how many.*article/u.test(q)) {
    const total = articles.length;
    if (total > 0) {
      const text = lang === 'en'
        ? `Based on my search, I found ${total} related articles.`
        : `根据我检索到的信息，当前共找到 ${total} 篇相关文章。`;
      return { text, actions: ['preflight_reject'] };
    }
  }

  if (/有没有|是否有|有.*文章|写过.*吗|is there|any.*article/u.test(q)) {
    if (articles.length === 0 && projects.length === 0) {
      const text = lang === 'en'
        ? 'No articles directly related to this topic were found. Try different keywords or ask another question.'
        : '根据博客内容搜索，目前没有找到与这个主题直接相关的文章。你可以尝试用其他关键词搜索，或者问我其他问题。';
      return { text, actions: ['preflight_reject'] };
    }
  }

  return null;
}

/**
 * Creates a transform stream that monitors the AI output for hallucinated references.
 * Rewrites or suppresses fabricated article/project links.
 */
export function createCitationGuardTransform(params: {
  articles: ArticleContext[];
  projects: ProjectContext[];
  onApplied?: (result: { actions: CitationGuardAction[] }) => void;
}): (stream: ReadableStream<string>) => ReadableStream<string> {
  const { articles, projects, onApplied } = params;
  const validUrls = new Set([
    ...articles.map(a => a.url),
    ...projects.map(p => p.url),
  ]);

  return (stream: ReadableStream<string>) => {
    const actions: CitationGuardAction[] = [];
    let buffer = '';

    const transform = new TransformStream<string, string>({
      transform(chunk, controller) {
        buffer += chunk;

        // Check for Markdown links: [text](url)
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match: RegExpExecArray | null;
        let lastIndex = 0;
        let output = '';

        while ((match = linkPattern.exec(buffer)) !== null) {
          const [fullMatch, text, url] = match;
          output += buffer.slice(lastIndex, match.index);

          if (url.startsWith('http') && !validUrls.has(url)) {
            // Fabricated external URL — keep the text, remove the link
            output += text;
            actions.push('stream_rewrite');
          } else {
            output += fullMatch;
          }

          lastIndex = match.index + fullMatch.length;
        }

        // Keep unparsed remainder in buffer (may be mid-link)
        buffer = buffer.slice(lastIndex);
        if (output) {
          controller.enqueue(output);
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
          buffer = '';
        }
        if (actions.length > 0) {
          onApplied?.({ actions });
        }
      },
    });

    return stream.pipeThrough(transform);
  };
}
