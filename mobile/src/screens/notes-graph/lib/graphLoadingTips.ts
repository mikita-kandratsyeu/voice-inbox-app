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

export const NOTES_GRAPH_3D_LOADING_TIP_KEYS = [
  'notesGraph.loadingTips.orbit3d',
  'notesGraph.loadingTips.pinchZoom3d',
  'notesGraph.loadingTips.filters',
  'notesGraph.loadingTips.switchView3d',
] as const;

export const NOTES_GRAPH_LOADING_TIP_INTERVAL_MS = 3000;

export function pickRandomGraphLoadingTipIndex(
  tipKeys: readonly string[] = NOTES_GRAPH_LOADING_TIP_KEYS,
): number {
  if (tipKeys.length <= 1) return 0;
  return Math.floor(Math.random() * tipKeys.length);
}

export function useRotatingGraphLoadingTip(
  showTips = true,
  tipKeys: readonly string[] = NOTES_GRAPH_LOADING_TIP_KEYS,
): string {
  const [tipIndex, setTipIndex] = useState(() => pickRandomGraphLoadingTipIndex(tipKeys));

  useEffect(() => {
    if (!showTips || tipKeys.length <= 1) return;

    const intervalId = setInterval(() => {
      setTipIndex((current) => (current + 1) % tipKeys.length);
    }, NOTES_GRAPH_LOADING_TIP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [showTips, tipKeys]);

  return tipKeys[tipIndex]!;
}
