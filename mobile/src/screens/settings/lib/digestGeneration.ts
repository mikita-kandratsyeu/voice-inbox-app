import { useSyncExternalStore } from 'react';

import { generateDigest } from '@/shared/lib/ai-api';
import { toUserFacingFetchErrorFromUnknown } from '@/shared/lib/fetch/userFacingFetchError';

import { saveCachedDigest } from './digest';

type DigestGenerationPendingError = { type: 'limit' } | { type: 'message'; message: string };

export type StartDigestGenerationArgs = {
  cacheKey: string;
  payload: string;
  model: string;
  modelMode?: 'manual' | 'auto';
};

const inflightKeys = new Set<string>();
const inflightPromises = new Map<string, Promise<void>>();
const pendingErrors = new Map<string, DigestGenerationPendingError>();
const listeners = new Set<() => void>();

function emitDigestGenerationChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDigestGeneration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isDigestGenerating(cacheKey: string): boolean {
  return inflightKeys.has(cacheKey);
}

export function useDigestGenerating(cacheKey: string): boolean {
  return useSyncExternalStore(
    subscribeDigestGeneration,
    () => isDigestGenerating(cacheKey),
    () => false,
  );
}

/** Clears and returns a generation error that finished while the screen was away. */
export function consumeDigestGenerationError(
  cacheKey: string,
): DigestGenerationPendingError | null {
  const error = pendingErrors.get(cacheKey) ?? null;
  if (error) {
    pendingErrors.delete(cacheKey);
  }
  return error;
}

export function startDigestGeneration(args: StartDigestGenerationArgs): Promise<void> {
  const existing = inflightPromises.get(args.cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    inflightKeys.add(args.cacheKey);
    emitDigestGenerationChange();

    try {
      const result = await generateDigest({
        payload: args.payload,
        model: args.model,
        modelMode: args.modelMode,
      });

      if (!result.ok) {
        if (result.limitExceeded) {
          pendingErrors.set(args.cacheKey, { type: 'limit' });
        } else {
          pendingErrors.set(args.cacheKey, { type: 'message', message: result.error });
        }
        return;
      }

      saveCachedDigest(args.cacheKey, result.result);
    } catch (err) {
      pendingErrors.set(args.cacheKey, {
        type: 'message',
        message: toUserFacingFetchErrorFromUnknown(err),
      });
    } finally {
      inflightKeys.delete(args.cacheKey);
      inflightPromises.delete(args.cacheKey);
      emitDigestGenerationChange();
    }
  })();

  inflightPromises.set(args.cacheKey, promise);
  return promise;
}
