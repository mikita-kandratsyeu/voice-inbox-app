import type { VoiceRecord } from '@/entities/record';

import { buildGraphModel } from './buildGraphModel';
import {
  buildNotesGraphLayoutFromModel,
  type NotesGraphLayoutResult,
} from './buildNotesGraphLayout';
import { buildLayoutWorkerRequest, mergeLayoutWorkerResponse } from './graphLayoutWorkerPayload';
import { runGraphLayoutOnWorker } from './graphLayoutWorkerRuntime';
import { clearStaleSessionPositions, getSessionNodePositions } from './graphSessionLayout';
import { resolveGraphFilters } from './graphSimplifyMode';
import type { GraphFilters } from './graphTypes';

export type AsyncLayoutComputationOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

/**
 * Builds graph model on the main thread, runs ForceAtlas2 on a background worklet
 * runtime when available, then merges positions back into full nodes.
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

  onProgress?.(0.15);

  const effective = resolveGraphFilters(filters, filteredRecordCount, simplifyOverride);
  const model = buildGraphModel(records, effective);
  const validIds = new Set(model.nodes.map((node) => node.id));
  clearStaleSessionPositions(validIds);
  const sessionPositions = getSessionNodePositions();
  const layoutViewportWidth = Math.max(windowWidth, 390);
  const layoutViewportHeight = Math.max(windowHeight * 0.72, 640);

  onProgress?.(0.3);

  const workerRequest = buildLayoutWorkerRequest(
    model.nodes,
    model.edges,
    layoutViewportWidth,
    layoutViewportHeight,
    effective.layoutMode,
    sessionPositions,
  );

  onProgress?.(0.4);

  const workerResponse = await runGraphLayoutOnWorker(workerRequest, signal);

  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  onProgress?.(0.95);

  const layoutNodes = mergeLayoutWorkerResponse(model.nodes, workerResponse);
  const layout = {
    nodes: layoutNodes,
    width: workerResponse.width,
    height: workerResponse.height,
  };

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
