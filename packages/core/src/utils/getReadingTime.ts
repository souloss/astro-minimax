const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const WORD_REGEX = /\b[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*\b/g;

const CJK_WPM = 350;
const EN_WPM = 230;

export function getReadingTime(content: string): {
  minutes: number;
  words: number;
} {
  const text = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/#+\s/g, "")
    .replace(/[*_~]/g, "");

  const cjkChars = text.match(CJK_REGEX) || [];
  const enWords = text.match(WORD_REGEX) || [];

  const cjkCount = cjkChars.length;
  const enCount = enWords.filter(
    w => !CJK_REGEX.test(w) && w.length > 0
  ).length;

  const totalWords = cjkCount + enCount;
  const minutes = Math.max(1, Math.ceil(cjkCount / CJK_WPM + enCount / EN_WPM));

  return { minutes, words: totalWords };
}
