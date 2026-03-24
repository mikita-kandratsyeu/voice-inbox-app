import { useCallback, useRef, useState } from 'react';

export type PlaybackPositionHandle = {
  currentPositionMs: number;
  onPositionUpdate: (positionMs: number) => void;
  reset: () => void;
};

export const usePlaybackPosition = (): PlaybackPositionHandle => {
  const [currentPositionMs, setCurrentPositionMs] = useState(0);
  const lastSecRef = useRef(-1);

  const onPositionUpdate = useCallback((positionMs: number) => {
    const sec = Math.floor(positionMs / 1000);
    if (sec !== lastSecRef.current) {
      lastSecRef.current = sec;
      setCurrentPositionMs(positionMs);
    }
  }, []);

  const reset = useCallback(() => {
    lastSecRef.current = -1;
    setCurrentPositionMs(0);
  }, []);

  return { currentPositionMs, onPositionUpdate, reset };
};
