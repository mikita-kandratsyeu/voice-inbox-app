import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useInboxFilters } from '@/features/inbox-filters';
import { i18n } from '@/shared/lib';
import {
  cosineSimilarity,
  generateEmbedding,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from '@/shared/lib/embeddings';

const RELEVANCE = {
  title: 5,
  summary: 4,
  transcript: 3,
  tags: 2,
  tasks: 1,
} as const;

const getRelevanceScore = (record: VoiceRecord, query: string): number => {
  const q = query.toLowerCase();
  let score = 0;

  if (record.title.toLowerCase().includes(q)) score += RELEVANCE.title;
  if (record.summary?.toLowerCase().includes(q)) score += RELEVANCE.summary;
  if (record.transcript?.toLowerCase().includes(q)) score += RELEVANCE.transcript;
  if (record.tags?.some((tag) => tag.toLowerCase().includes(q))) score += RELEVANCE.tags;
  if (record.tasks?.some((t) => t.text.toLowerCase().includes(q))) score += RELEVANCE.tasks;

  return score;
};

const matchesQuery = (record: VoiceRecord, query: string): boolean => {
  const q = query.toLowerCase();
  return (
    record.title.toLowerCase().includes(q) ||
    record.summary?.toLowerCase().includes(q) ||
    record.transcript?.toLowerCase().includes(q) ||
    record.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
    !!record.tasks?.some((t) => t.text.toLowerCase().includes(q))
  );
};

function getEmbeddingLanguage(): string {
  const lang = i18n.language ?? 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
}

export const useSearchRecords = (records: VoiceRecord[]) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<VoiceRecord[] | null>(null);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const { filterStatus, setFilterStatus, sortOption, setSortOption, filterRecords } =
    useInboxFilters();

  const lexicalFiltered = useMemo(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      return records;
    }

    const matching = records.filter((r) => matchesQuery(r, trimmed));
    return matching
      .map((r) => ({ record: r, score: getRelevanceScore(r, trimmed) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime();
      })
      .map(({ record }) => record);
  }, [records, query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (
      !trimmed ||
      Platform.OS !== 'ios' ||
      !isEmbeddingAvailable() ||
      !records.some((r) => r.embedding)
    ) {
      setSemanticResults(null);
      setIsSemanticSearching(false);
      return;
    }

    let cancelled = false;
    setIsSemanticSearching(true);
    setSemanticResults(null);

    const run = async () => {
      try {
        const language = getEmbeddingLanguage();
        await prepareEmbeddingModel(language);
        const queryEmbedding = await generateEmbedding(trimmed, language);
        if (cancelled || !queryEmbedding) {
          setSemanticResults(null);
          return;
        }

        const withEmbedding = records.filter((r): r is VoiceRecord & { embedding: number[] } =>
          Boolean(r.embedding),
        );
        const scored = withEmbedding
          .map((record) => ({
            record,
            score: cosineSimilarity(queryEmbedding, record.embedding),
          }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ record }) => record);

        if (!cancelled) {
          setSemanticResults(scored);
        }
      } catch (err) {
        if (__DEV__) console.warn('[search] Semantic search failed:', err);
        if (!cancelled) setSemanticResults(null);
      } finally {
        if (!cancelled) setIsSemanticSearching(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [query, records]);

  const searchFiltered = useMemo(() => {
    if (!query.trim()) return records;
    if (semanticResults !== null) return semanticResults;
    return lexicalFiltered;
  }, [query, records, semanticResults, lexicalFiltered]);

  const filtered = useMemo(() => filterRecords(searchFiltered), [searchFiltered, filterRecords]);

  const sections = useMemo(() => {
    if (filterStatus === 'all') {
      const pinned = filtered.filter((r) => r.isPinned);
      const rest = filtered.filter((r) => !r.isPinned);
      return [
        ...(pinned.length > 0 ? [{ title: t('inbox.pinned'), data: pinned }] : []),
        ...(rest.length > 0
          ? [
              {
                title: query.trim() ? t('inbox.searchResults') : t('inbox.allRecords'),
                data: rest,
              },
            ]
          : []),
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
  }, [filtered, filterStatus, query, t]);

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
    setFilterStatus('all');
    setSortOption('dateDesc');
  }, [setFilterStatus, setSortOption]);

  return {
    query,
    setQuery,
    filtered,
    sections,
    flattenedData,
    isSearching: query.trim().length > 0,
    isSemanticSearching: isSemanticSearching,
    filterStatus,
    setFilterStatus,
    sortOption,
    setSortOption,
    resetToDefault,
  };
};
