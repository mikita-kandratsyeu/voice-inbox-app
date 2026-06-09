export type GraphNodeInteractionState = 'idle' | 'pressing' | 'dragging';

export const GRAPH_NODE_LONG_PRESS_MS = 180;

/** Shared-value phases for Reanimated (0 = idle, 1 = pressing, 2 = dragging). */
export const GRAPH_NODE_INTERACTION_IDLE = 0;
export const GRAPH_NODE_INTERACTION_PRESSING = 1;
export const GRAPH_NODE_INTERACTION_DRAGGING = 2;

export const GRAPH_NODE_PRESS_IN_MS = 120;
export const GRAPH_NODE_RELEASE_MS = 160;
export const GRAPH_NODE_MOVE_MS = 220;

export const GRAPH_VIEWPORT_TIMING_MS = 280;

export const GRAPH_VIEWPORT_SPRING = {
  damping: 22,
  stiffness: 190,
  mass: 0.85,
} as const;
