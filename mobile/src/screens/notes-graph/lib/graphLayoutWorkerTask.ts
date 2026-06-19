import { computeLayoutWorkerResponse } from './graphLayoutWorkerCompute';
import type { LayoutWorkerRequest, LayoutWorkerResponse } from './graphLayoutWorkerTypes';

/** Worklet entry — must stay in a dedicated module for the Worklets Babel plugin. */
export function executeGraphLayoutWorkerTask(request: LayoutWorkerRequest): LayoutWorkerResponse {
  'worklet';
  return computeLayoutWorkerResponse(request);
}
