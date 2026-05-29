import { useCallback, useEffect, useRef, useState } from 'react';

import { type AiUsage, getAiUsage } from '@/shared/lib/ai-api';

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

  return { usage, loading, refresh };
}
