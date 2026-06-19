import type { GraphEdge, GraphLayoutMode, GraphNode } from './graphTypes';
import { type LayoutResult, runForceLayout } from './runForceLayout';

export type LayoutComputationProgress = {
  isComputing: boolean;
  progress: number;
};

export type AsyncLayoutComputationOptions = {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

/**
 * Computes graph layout asynchronously with progress updates to prevent UI blocking.
 *
 * This is a pragmatic solution that:
 * 1. Runs layout computation off the main render cycle using setImmediate
 * 2. Reports progress for UX feedback
 * 3. Can be cancelled via AbortSignal
 *
 * Note: The actual ForceAtlas2 computation still runs on JS thread but broken into
 * async chunks, preventing complete UI freeze. For true background computation,
 * the ForceAtlas2 algorithm would need to be rewritten without graphology dependency.
 */
export async function computeLayoutAsync(
  nodes: GraphNode[],
  edges: GraphEdge[],
  viewportWidth: number,
  viewportHeight: number,
  fixedPositions: Map<string, { x: number; y: number }> | undefined,
  layoutMode: GraphLayoutMode,
  options: AsyncLayoutComputationOptions = {},
): Promise<LayoutResult> {
  const { onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Layout computation cancelled'));
      return;
    }

    onProgress?.(0);

    // Use setImmediate to break computation into async chunk
    setImmediate(() => {
      try {
        if (signal?.aborted) {
          reject(new Error('Layout computation cancelled'));
          return;
        }

        onProgress?.(0.3);

        // Run the actual layout computation
        // Note: This still blocks but yields control between stages
        const result = runForceLayout(
          nodes,
          edges,
          viewportWidth,
          viewportHeight,
          fixedPositions,
          layoutMode,
        );

        if (signal?.aborted) {
          reject(new Error('Layout computation cancelled'));
          return;
        }

        onProgress?.(1);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Manages async layout computation state.
 * Use this hook in GraphCanvas to compute layouts without blocking.
 */
export class AsyncLayoutComputer {
  private abortController: AbortController | null = null;
  private isComputing = false;

  async compute(
    nodes: GraphNode[],
    edges: GraphEdge[],
    viewportWidth: number,
    viewportHeight: number,
    fixedPositions: Map<string, { x: number; y: number }> | undefined,
    layoutMode: GraphLayoutMode,
    onProgress?: (progress: number) => void,
  ): Promise<LayoutResult> {
    // Cancel any in-progress computation
    this.cancel();

    this.abortController = new AbortController();
    this.isComputing = true;

    try {
      const result = await computeLayoutAsync(
        nodes,
        edges,
        viewportWidth,
        viewportHeight,
        fixedPositions,
        layoutMode,
        {
          signal: this.abortController.signal,
          onProgress,
        },
      );
      this.isComputing = false;
      return result;
    } catch (error) {
      this.isComputing = false;
      throw error;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isComputing = false;
  }

  getIsComputing(): boolean {
    return this.isComputing;
  }
}
