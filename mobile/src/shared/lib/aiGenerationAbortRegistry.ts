import type { AiAbortHandle } from '@/shared/lib/ai-api/abort';

export type AiGenerationKind = 'ask' | 'summary';

type RegisteredGeneration = {
  abortHandle: AiAbortHandle;
  cloudJobId: string | null;
};

function registryKey(recordId: string, kind: AiGenerationKind): string {
  return `${recordId}:${kind}`;
}

const generations = new Map<string, RegisteredGeneration>();

export function registerAiGeneration(
  recordId: string,
  kind: AiGenerationKind,
  abortHandle: AiAbortHandle,
  cloudJobId: string | null,
): void {
  generations.set(registryKey(recordId, kind), { abortHandle, cloudJobId });
}

export function unregisterAiGeneration(
  recordId: string,
  kind: AiGenerationKind,
  abortHandle: AiAbortHandle,
): void {
  const key = registryKey(recordId, kind);
  const current = generations.get(key);
  if (current?.abortHandle === abortHandle) {
    generations.delete(key);
  }
}

/** Aborts in-flight generation if registered; returns whether a handle existed. */
export function abortAiGeneration(
  recordId: string,
  kind: AiGenerationKind,
): { hadHandle: boolean; cloudJobId: string | null } {
  const key = registryKey(recordId, kind);
  const current = generations.get(key);
  if (!current) {
    return { hadHandle: false, cloudJobId: null };
  }

  current.abortHandle.abort();
  generations.delete(key);
  return { hadHandle: true, cloudJobId: current.cloudJobId };
}

export function abortAllAiGenerationsForRecord(recordId: string): {
  hadAnyHandle: boolean;
  cloudJobIds: string[];
} {
  const cloudJobIds: string[] = [];
  let hadAnyHandle = false;

  for (const kind of ['ask', 'summary'] as const) {
    const { hadHandle, cloudJobId } = abortAiGeneration(recordId, kind);
    if (hadHandle) hadAnyHandle = true;
    if (cloudJobId) cloudJobIds.push(cloudJobId);
  }

  return { hadAnyHandle, cloudJobIds };
}
