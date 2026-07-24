import { useCallback, useState } from 'react';

export type PlaybackPositionHandle = {
  currentPositionMs: number;
  onPositionUpdate: (positionMs: number) => void;
  reset: () => void;
};

export const usePlaybackPosition = (): PlaybackPositionHandle => {
  const [currentPositionMs, setCurrentPositionMs] = useState(0);

  const onPositionUpdate = useCallback((positionMs: number) => {
    setCurrentPositionMs(positionMs);
  }, []);

  const reset = useCallback(() => {
    setCurrentPositionMs(0);
  }, []);

  return { currentPositionMs, onPositionUpdate, reset };
};
