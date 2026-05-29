import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { type AiUsage, getAiUsage } from '@/shared/lib/ai-api';
import { subscribeAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';

export function useTabletSidebarAiUsage(enabled: boolean) {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fetchGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUsage(null);
      setLoading(false);
      return;
    }

    const generation = ++fetchGeneration.current;
    setLoading(true);
    const data = await getAiUsage();
    if (generation !== fetchGeneration.current) {
      return;
    }
    setUsage(data ?? null);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeAiUsageRefresh(() => {
      void refresh();
    });
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refresh();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [enabled, refresh]);

  return { usage, loading, refresh };
}
