import { useEffect, useState } from 'react';

export const NOTES_GRAPH_LOADING_TIP_KEYS = [
  'notesGraph.loadingTips.pinchPan',
  'notesGraph.loadingTips.doubleTap',
  'notesGraph.loadingTips.dragNode',
  'notesGraph.loadingTips.filters',
  'notesGraph.loadingTips.search',
  'notesGraph.loadingTips.legend',
  'notesGraph.loadingTips.minimap',
] as const;

export const NOTES_GRAPH_LOADING_TIP_INTERVAL_MS = 3000;

export function pickRandomGraphLoadingTipIndex(): number {
  if (NOTES_GRAPH_LOADING_TIP_KEYS.length <= 1) return 0;
  return Math.floor(Math.random() * NOTES_GRAPH_LOADING_TIP_KEYS.length);
}

export function useRotatingGraphLoadingTip(
  showTips = true,
): (typeof NOTES_GRAPH_LOADING_TIP_KEYS)[number] {
  const [tipIndex, setTipIndex] = useState(() => pickRandomGraphLoadingTipIndex());

  useEffect(() => {
    if (!showTips || NOTES_GRAPH_LOADING_TIP_KEYS.length <= 1) return;

    const intervalId = setInterval(() => {
      setTipIndex((current) => (current + 1) % NOTES_GRAPH_LOADING_TIP_KEYS.length);
    }, NOTES_GRAPH_LOADING_TIP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showTips]);

  return NOTES_GRAPH_LOADING_TIP_KEYS[tipIndex]!;
}
