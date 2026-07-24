import { computeLayoutWorkerResponse } from '../graphLayoutWorkerCompute';
import { runGraphLayoutOnWorker, shouldUseGraphLayoutWorker } from '../graphLayoutWorkerRuntime';
import type { LayoutWorkerRequest } from '../graphLayoutWorkerTypes';
import { recordNodeId } from '../graphTypes';

const baseRequest: LayoutWorkerRequest = {
  nodes: Array.from({ length: 30 }, (_, index) => ({
    id: recordNodeId(`n-${index}`),
    kind: 'record' as const,
    x: index * 10,
    y: index * 5,
  })),
  edges: [],
  viewportWidth: 390,
  viewportHeight: 800,
  layoutMode: 'force',
  fixedPositions: {},
};

describe('graphLayoutWorkerRuntime', () => {
  it('disables worker in Jest and uses main-thread compute', async () => {
    expect(shouldUseGraphLayoutWorker(100)).toBe(false);

    const response = await runGraphLayoutOnWorker(baseRequest);
    expect(response.nodes).toHaveLength(30);
    expect(response.width).toBeGreaterThan(0);
    expect(response.height).toBeGreaterThan(0);
  });

  it('computeLayoutWorkerResponse matches runGraphLayoutOnWorker in Jest', async () => {
    const direct = computeLayoutWorkerResponse(baseRequest);
    const viaRunner = await runGraphLayoutOnWorker(baseRequest);

    expect(viaRunner.width).toBe(direct.width);
    expect(viaRunner.height).toBe(direct.height);
    expect(viaRunner.nodes).toEqual(direct.nodes);
  });
});
