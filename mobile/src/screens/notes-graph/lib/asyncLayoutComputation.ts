import type { VoiceRecord } from '@/entities/record';

import { buildGraphModel } from './buildGraphModel';
import {
  buildNotesGraphLayoutFromModel,
  type NotesGraphLayoutResult,
} from './buildNotesGraphLayout';
import { clearStaleSessionPositions, getSessionNodePositions } from './graphSessionLayout';
import { resolveGraphFilters } from './graphSimplifyMode';
import type { GraphFilters } from './graphTypes';
import { runForceLayout } from './runForceLayout';

export type AsyncLayoutComputationOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

/**
 * Yields to the event loop before running ForceAtlas2 so the UI can paint first.
 */
export async function computeLayoutAsync(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
  options: AsyncLayoutComputationOptions = {},
): Promise<NotesGraphLayoutResult> {
  const { onProgress, signal } = options;

  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  onProgress?.(0);

  await yieldToEventLoop();

  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  onProgress?.(0.2);

  const effective = resolveGraphFilters(filters, filteredRecordCount, simplifyOverride);
  const model = buildGraphModel(records, effective);
  const validIds = new Set(model.nodes.map((node) => node.id));
  clearStaleSessionPositions(validIds);
  const sessionPositions = getSessionNodePositions();
  const layoutViewportWidth = Math.max(windowWidth, 390);
  const layoutViewportHeight = Math.max(windowHeight * 0.72, 640);

  onProgress?.(0.35);

  await yieldToEventLoop();

  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  const layout = runForceLayout(
    model.nodes,
    model.edges,
    layoutViewportWidth,
    layoutViewportHeight,
    sessionPositions,
    effective.layoutMode,
  );

  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  onProgress?.(1);

  return buildNotesGraphLayoutFromModel(model, layout);
}

export class AsyncLayoutComputer {
  private abortController: AbortController | null = null;

  async compute(
    records: VoiceRecord[],
    filters: GraphFilters,
    filteredRecordCount: number,
    simplifyOverride: boolean | null,
    windowWidth: number,
    windowHeight: number,
    onProgress?: (progress: number) => void,
  ): Promise<NotesGraphLayoutResult> {
    this.cancel();

    this.abortController = new AbortController();

    try {
      return await computeLayoutAsync(
        records,
        filters,
        filteredRecordCount,
        simplifyOverride,
        windowWidth,
        windowHeight,
        {
          signal: this.abortController.signal,
          onProgress,
        },
      );
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
