import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { VoiceRecord } from '@/entities/record';
import { useInboxFilters } from '@/features/inbox-filters';
import {
  centeredCosineSimilarity,
  computeCentroid,
  generateEmbedding,
  getEmbeddingLanguage,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from '@/shared/lib/embeddings';

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;
const SEMANTIC_SEARCH_MIN_WORDS = 2;
const SEMANTIC_SCORE_WEIGHT = 0.4;
const LEXICAL_SCORE_WEIGHT = 0.6;
const MIN_HYBRID_SCORE = 0.1;
const MIN_SEMANTIC_SCORE_WITHOUT_LEXICAL = 0.3;

const STOPWORDS = new Set([
  'в',
  'и',
  'на',
  'с',
  'у',
  'о',
  'к',
  'по',
  'для',
  'из',
  'от',
  'до',
  'за',
  'при',
  'не',
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'it',
]);

const RELEVANCE = {
  title: 5,
  summary: 4,
  transcript: 3,
  tags: 2,
  tasks: 1,
} as const;

const searchTextCache = new WeakMap<VoiceRecord, string>();

function getRecordSearchText(record: VoiceRecord): string {
  const cached = searchTextCache.get(record);
  if (cached !== undefined) return cached;

  const parts = [
    record.title ?? '',
    record.summary ?? '',
    record.transcript ?? '',
    ...(record.tags ?? []),
    ...(record.keyPhrases ?? []),
    ...(record.tasks ?? []).map((t) => t.text),
  ];
  const text = parts.join(' ').toLowerCase();
  searchTextCache.set(record, text);
  return text;
}

function getQueryWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function matchesQueryWords(record: VoiceRecord, words: string[]): boolean {
  if (words.length === 0) return false;
  const text = getRecordSearchText(record);
  return words.every(
    (word) => text.includes(word) || (word.length >= 4 && text.includes(word.slice(0, 4))),
  );
}

const getRelevanceScore = (record: VoiceRecord, query: string): number => {
  const q = query.toLowerCase();
  let score = 0;

  if (record.title.toLowerCase().includes(q)) score += RELEVANCE.title;
  if (record.summary?.toLowerCase().includes(q)) score += RELEVANCE.summary;
  if (record.transcript?.toLowerCase().includes(q)) score += RELEVANCE.transcript;
  if (record.tags?.some((tag) => tag.toLowerCase().includes(q))) score += RELEVANCE.tags;
  if (record.tasks?.some((t) => t.text.toLowerCase().includes(q))) score += RELEVANCE.tasks;

  if (score > 0) return score;

  const words = getQueryWords(query);
  const text = getRecordSearchText(record);
  for (const word of words) {
    if (text.includes(word)) score += 2;
    else if (word.length >= 4 && text.includes(word.slice(0, 4))) score += 1;
  }
  return score;
};

const matchesQuery = (record: VoiceRecord, query: string): boolean => {
  const words = getQueryWords(query);
  if (words.length > 0 && matchesQueryWords(record, words)) return true;
  const q = query.toLowerCase();
  return (
    record.title.toLowerCase().includes(q) ||
    record.summary?.toLowerCase().includes(q) ||
    record.transcript?.toLowerCase().includes(q) ||
    record.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
    !!record.tasks?.some((t) => t.text.toLowerCase().includes(q))
  );
};

export const useSearchRecords = (records: VoiceRecord[]) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [isSemanticPending, setIsSemanticPending] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { filterStatus, setFilterStatus, sortOption, setSortOption, filterRecords } =
    useInboxFilters();

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    const words = getQueryWords(trimmed);
    const shouldUseSemantics =
      isEmbeddingAvailable() &&
      trimmed.length >= MIN_QUERY_LENGTH &&
      words.length >= SEMANTIC_SEARCH_MIN_WORDS;

    if (!shouldUseSemantics) {
      setQueryEmbedding(null);
      setIsSemanticPending(false);
      return;
    }

    setIsSemanticPending(true);
    let cancelled = false;
    (async () => {
      try {
        const lang = getEmbeddingLanguage();
        await prepareEmbeddingModel(lang);
        const embedding = await generateEmbedding(trimmed, lang);
        if (!cancelled) {
          setQueryEmbedding(embedding);
          setIsSemanticPending(false);
        }
      } catch {
        if (!cancelled) {
          setQueryEmbedding(null);
          setIsSemanticPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const searchFiltered = useMemo(() => {
    const trimmed = debouncedQuery.trim();

    if (!trimmed) {
      return records;
    }

    if (trimmed.length < MIN_QUERY_LENGTH) {
      return records;
    }

    const useSemantics =
      !isSemanticPending && queryEmbedding !== null && records.some((r) => r.embedding);

    if (useSemantics) {
      const maxLexical =
        RELEVANCE.title +
        RELEVANCE.summary +
        RELEVANCE.transcript +
        RELEVANCE.tags +
        RELEVANCE.tasks;

      const allEmbeddings = records.filter((r) => r.embedding).map((r) => r.embedding as number[]);
      const centroid = computeCentroid(allEmbeddings);

      return records
        .map((r) => {
          const lexicalRaw = getRelevanceScore(r, trimmed);
          const lexicalNorm = Math.min(lexicalRaw / maxLexical, 1);
          const semanticScore = r.embedding
            ? centeredCosineSimilarity(queryEmbedding, r.embedding, centroid)
            : 0;
          const hybridScore =
            SEMANTIC_SCORE_WEIGHT * semanticScore + LEXICAL_SCORE_WEIGHT * lexicalNorm;
          return { record: r, hybridScore, semanticScore, lexicalRaw };
        })
        .filter(({ hybridScore, lexicalRaw, semanticScore }) => {
          if (lexicalRaw > 0) return hybridScore >= MIN_HYBRID_SCORE;
          return semanticScore >= MIN_SEMANTIC_SCORE_WITHOUT_LEXICAL;
        })
        .sort((a, b) => {
          if (b.hybridScore !== a.hybridScore) return b.hybridScore - a.hybridScore;
          return new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime();
        })
        .map(({ record }) => record);
    }

    const matching = records.filter((r) => matchesQuery(r, trimmed));
    return matching
      .map((r) => ({ record: r, score: getRelevanceScore(r, trimmed) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime();
      })
      .map(({ record }) => record);
  }, [records, debouncedQuery, queryEmbedding, isSemanticPending]);

  const filtered = useMemo(() => filterRecords(searchFiltered), [searchFiltered, filterRecords]);

  const baseFilteredCount = useMemo(() => filterRecords(records).length, [records, filterRecords]);

  const sections = useMemo(() => {
    if (filterStatus === 'all') {
      const isSearching = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
      const pinned = filtered.filter((r) => r.isPinned);
      const rest = filtered.filter((r) => !r.isPinned);

      if (isSearching) {
        const allSorted = [...pinned, ...rest];
        return allSorted.length > 0 ? [{ title: t('inbox.searchResults'), data: allSorted }] : [];
      }

      return [
        ...(pinned.length > 0 ? [{ title: t('inbox.pinned'), data: pinned }] : []),
        ...(rest.length > 0 ? [{ title: t('inbox.allRecords'), data: rest }] : []),
      ];
    }

    return filtered.length > 0
      ? [
          {
            title: t(`inbox.filters.${filterStatus}`),
            data: filtered,
          },
        ]
      : [];
  }, [filtered, filterStatus, debouncedQuery, t]);

  const flattenedData = useMemo(() => {
    const result: Array<
      { type: 'header'; title: string; isFirst: boolean } | { type: 'record'; item: VoiceRecord }
    > = [];
    sections.forEach((section, idx) => {
      result.push({
        type: 'header',
        title: section.title,
        isFirst: idx === 0,
      });
      section.data.forEach((item) => result.push({ type: 'record', item }));
    });
    return result;
  }, [sections]);

  const resetToDefault = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setFilterStatus('all');
    setSortOption('dateDesc');
  }, [setFilterStatus, setSortOption]);

  const isActiveSearch = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;

  const subtitleText = useMemo(() => {
    const filterName = t(`inbox.filters.${filterStatus}`);
    return t('inbox.filterSummary', { filterName, count: baseFilteredCount });
  }, [filterStatus, baseFilteredCount, t]);

  return {
    query,
    setQuery,
    debouncedQuery,
    filtered,
    subtitleText,
    sections,
    flattenedData,
    isSearching: isActiveSearch,
    filterStatus,
    setFilterStatus,
    sortOption,
    setSortOption,
    resetToDefault,
  };
};
