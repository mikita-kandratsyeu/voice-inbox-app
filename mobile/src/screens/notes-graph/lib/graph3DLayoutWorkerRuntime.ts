import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  type WorkletRuntime,
} from 'react-native-worklets';

import {
  buildGraph3DLayoutWorkerRequest,
  computeGraph3DLayoutWorkerResponse,
} from './graph3DLayoutWorkerCompute';
import { executeGraph3DLayoutWorkerTask } from './graph3DLayoutWorkerTask';
import type { Graph3DLayoutWorkerResponse } from './graph3DLayoutWorkerTypes';
import type { GraphEdge, GraphNode } from './graphTypes';

/** Below this size, worker scheduling overhead exceeds the 3D layout cost. */
export const GRAPH_3D_LAYOUT_WORKER_MIN_NODES = 36;

let layoutRuntime: WorkletRuntime | null = null;
let layoutRuntimeInitFailed = false;
let activeJobId = 0;

function isJestEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env.JEST_WORKER_ID !== undefined;
}

export function isGraph3DLayoutWorkerSupported(): boolean {
  return !isJestEnvironment() && !layoutRuntimeInitFailed;
}

export function shouldUseGraph3DLayoutWorker(nodeCount: number): boolean {
  return isGraph3DLayoutWorkerSupported() && nodeCount >= GRAPH_3D_LAYOUT_WORKER_MIN_NODES;
}

function getGraph3DLayoutWorkerRuntime(): WorkletRuntime {
  if (layoutRuntime) return layoutRuntime;

  try {
    layoutRuntime = createWorkletRuntime({
      name: 'graph-3d-layout',
      enableEventLoop: true,
    });
    return layoutRuntime;
  } catch (error) {
    layoutRuntimeInitFailed = true;
    throw error;
  }
}

export function cancelGraph3DLayoutWorkerJobs(): void {
  activeJobId += 1;
}

export function releaseGraph3DLayoutWorkerRuntime(): void {
  cancelGraph3DLayoutWorkerJobs();
  layoutRuntime = null;
}

export async function runGraph3DLayoutOnWorker(
  nodes: GraphNode[],
  edges: GraphEdge[],
  signal?: AbortSignal,
): Promise<Graph3DLayoutWorkerResponse> {
  if (signal?.aborted) {
    throw new Error('3D layout computation cancelled');
  }

  const request = buildGraph3DLayoutWorkerRequest(nodes, edges);

  if (!shouldUseGraph3DLayoutWorker(request.nodes.length)) {
    return computeGraph3DLayoutWorkerResponse(request);
  }

  const jobId = activeJobId + 1;
  activeJobId = jobId;

  try {
    const runtime = getGraph3DLayoutWorkerRuntime();
    const result = await runOnRuntimeAsync(runtime, executeGraph3DLayoutWorkerTask, request);

    if (signal?.aborted || jobId !== activeJobId) {
      throw new Error('3D layout computation cancelled');
    }

    return result;
  } catch (_error) {
    if (signal?.aborted || jobId !== activeJobId) {
      throw new Error('3D layout computation cancelled');
    }

    layoutRuntimeInitFailed = true;
    layoutRuntime = null;
    return computeGraph3DLayoutWorkerResponse(request);
  }
}
