import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  type WorkletRuntime,
} from 'react-native-worklets';

import { computeLayoutWorkerResponse } from './graphLayoutWorkerCompute';
import { executeGraphLayoutWorkerTask } from './graphLayoutWorkerTask';
import type { LayoutWorkerRequest, LayoutWorkerResponse } from './graphLayoutWorkerTypes';

/** Below this size, worker scheduling overhead exceeds the layout cost. */
export const GRAPH_LAYOUT_WORKER_MIN_NODES = 24;

let layoutRuntime: WorkletRuntime | null = null;
let layoutRuntimeInitFailed = false;
let activeJobId = 0;

function isJestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined;
}

export function isGraphLayoutWorkerSupported(): boolean {
  return !isJestEnvironment() && !layoutRuntimeInitFailed;
}

export function shouldUseGraphLayoutWorker(nodeCount: number): boolean {
  return isGraphLayoutWorkerSupported() && nodeCount >= GRAPH_LAYOUT_WORKER_MIN_NODES;
}

function getLayoutWorkerRuntime(): WorkletRuntime {
  if (layoutRuntime) return layoutRuntime;

  try {
    layoutRuntime = createWorkletRuntime({
      name: 'graph-layout',
      enableEventLoop: true,
    });
    return layoutRuntime;
  } catch (error) {
    layoutRuntimeInitFailed = true;
    throw error;
  }
}

export function cancelGraphLayoutWorkerJobs(): void {
  activeJobId += 1;
}

export function releaseGraphLayoutWorkerRuntime(): void {
  cancelGraphLayoutWorkerJobs();
  layoutRuntime = null;
}

export async function runGraphLayoutOnWorker(
  request: LayoutWorkerRequest,
  signal?: AbortSignal,
): Promise<LayoutWorkerResponse> {
  if (signal?.aborted) {
    throw new Error('Layout computation cancelled');
  }

  if (!shouldUseGraphLayoutWorker(request.nodes.length)) {
    return computeLayoutWorkerResponse(request);
  }

  const jobId = activeJobId + 1;
  activeJobId = jobId;

  try {
    const runtime = getLayoutWorkerRuntime();
    const result = await runOnRuntimeAsync(runtime, executeGraphLayoutWorkerTask, request);

    if (signal?.aborted || jobId !== activeJobId) {
      throw new Error('Layout computation cancelled');
    }

    return result;
  } catch (_error) {
    if (signal?.aborted || jobId !== activeJobId) {
      throw new Error('Layout computation cancelled');
    }

    layoutRuntimeInitFailed = true;
    layoutRuntime = null;
    return computeLayoutWorkerResponse(request);
  }
}
