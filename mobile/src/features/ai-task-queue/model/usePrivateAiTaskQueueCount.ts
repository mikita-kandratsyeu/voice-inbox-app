import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { countPrivateAiTasks } from '../lib/privateAiTaskQueueDb';

export function usePrivateAiTaskQueueCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    void countPrivateAiTasks()
      .then(setCount)
      .catch(() => setCount(0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return count;
}
