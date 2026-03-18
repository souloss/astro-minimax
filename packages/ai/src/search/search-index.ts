import { normalizeText } from './search-utils.js';
import { buildIDFMap, type IDFMap } from './idf.js';
import type { SearchDocument, IndexedDocument } from './types.js';

let cachedIDFMap: IDFMap | null = null;

/**
 * Builds an in-memory inverted index from a list of documents
 * and computes IDF weights across the corpus.
 */
export function buildSearchIndex(documents: SearchDocument[]): IndexedDocument[] {
  const indexed = documents.map(doc => ({
    ...doc,
    tokens: buildDocumentTokens(doc),
  }));

  cachedIDFMap = buildIDFMap(indexed);
  return indexed;
}

export function getIDFMapForIndex(): IDFMap | null {
  return cachedIDFMap;
}

function buildDocumentTokens(doc: SearchDocument): string[] {
  const parts = [
    doc.title,
    doc.excerpt,
    doc.content.slice(0, 1000),
    ...doc.keyPoints,
    ...doc.categories,
    ...doc.tags,
    doc.summary ?? '',
  ];
  return [...new Set(parts.map(normalizeText).join(' ').split(/\s+/).filter(Boolean))];
}
