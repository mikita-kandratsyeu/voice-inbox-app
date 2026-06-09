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
