import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetch as nitroFetch } from '@/shared/lib/fetch';

import {
  HF_GGUF_SEARCH_DEBOUNCE_MS,
  type HfGgufSearchResult,
  searchHfGgufModels,
} from './hfHubApi';

export function useHfGgufSearch(debounceMs = HF_GGUF_SEARCH_DEBOUNCE_MS) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<HfGgufSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDebouncedQuery('');
      return;
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debounceMs, query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setSearchError(null);

    void searchHfGgufModels(trimmed, { limit: 12, fetchImpl: nitroFetch })
      .then((found) => {
        if (requestId !== requestIdRef.current) return;
        setResults(found);
        setSearchError(found.length === 0 ? t('aiModels.hfSearchEmpty') : null);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setSearchError(t('aiModels.hfSearchFailed'));
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return;
        setIsSearching(false);
      });
  }, [debouncedQuery, t]);

  const clear = useCallback(() => {
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setSearchError(null);
    setIsSearching(false);
  }, []);

  const flushSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedQuery(query.trim());
  }, [query]);

  const trimmedQuery = query.trim();
  const isSearchPending =
    trimmedQuery.length >= 2 &&
    trimmedQuery !== debouncedQuery.trim() &&
    debouncedQuery.length >= 0;

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isSearching,
    isSearchPending,
    searchError,
    clear,
    flushSearch,
  };
}
