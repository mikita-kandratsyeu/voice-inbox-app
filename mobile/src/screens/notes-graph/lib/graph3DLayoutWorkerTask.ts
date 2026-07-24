import { computeGraph3DLayoutWorkerResponse } from './graph3DLayoutWorkerCompute';
import type {
  Graph3DLayoutWorkerRequest,
  Graph3DLayoutWorkerResponse,
} from './graph3DLayoutWorkerTypes';

/** Worklet entry — must stay in a dedicated module for the Worklets Babel plugin. */
export function executeGraph3DLayoutWorkerTask(
  request: Graph3DLayoutWorkerRequest,
): Graph3DLayoutWorkerResponse {
  'worklet';
  return computeGraph3DLayoutWorkerResponse(request);
}
