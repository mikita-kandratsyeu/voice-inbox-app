import type { LlamaContext } from 'llama.rn';

import type { LocalAiModelId } from '@/entities/settings';
import { getDeviceCapabilities } from '@/shared/lib/deviceCapabilities';

/**
 * Multi-model session manager for concurrent LLM inference.
 * Allows running different models in parallel (e.g., Ask + Summary).
 */

type SessionContext = {
  context: LlamaContext;
  modelId: LocalAiModelId;
  loadedAt: number;
  lastUsedAt: number;
  releaseTimeout: NodeJS.Timeout | null;
};

const sessions = new Map<LocalAiModelId, SessionContext>();

/** Keep model loaded for 60 seconds after last use */
const SESSION_KEEP_ALIVE_MS = 60_000;

/**
 * Returns maximum number of concurrent sessions based on device tier.
 * Ultra/high devices can handle 2+ models, lower tiers stay at 1 for stability.
 */
export function getMaxConcurrentSessions(): number {
  const capabilities = getDeviceCapabilities();

  switch (capabilities.memoryTier) {
    case 'ultra':
      return 3; // Can handle 3 small models (1B each)
    case 'high':
      return 2; // Can handle 2 models
    case 'medium':
    case 'low':
      return 1; // Single model for safety
  }
}

/**
 * Checks if a new session can be created without exceeding limits.
 */
export function canCreateNewSession(): boolean {
  const maxSessions = getMaxConcurrentSessions();
  const activeSessions = Array.from(sessions.values()).filter((s) => s.context !== null).length;
  return activeSessions < maxSessions;
}

/**
 * Registers a session context for a model.
 */
export function registerSession(modelId: LocalAiModelId, context: LlamaContext): void {
  // Cancel any pending release for this model
  const existing = sessions.get(modelId);
  if (existing?.releaseTimeout) {
    clearTimeout(existing.releaseTimeout);
  }

  const now = Date.now();
  sessions.set(modelId, {
    context,
    modelId,
    loadedAt: existing?.loadedAt ?? now,
    lastUsedAt: now,
    releaseTimeout: null,
  });
}

/**
 * Retrieves an existing session for a model, if loaded.
 */
export function getSession(modelId: LocalAiModelId): LlamaContext | null {
  const session = sessions.get(modelId);
  if (!session) {
    return null;
  }

  // Update last used timestamp
  session.lastUsedAt = Date.now();

  // Cancel scheduled release
  if (session.releaseTimeout) {
    clearTimeout(session.releaseTimeout);
    session.releaseTimeout = null;
  }

  return session.context;
}

/**
 * Schedules delayed release for a session.
 */
export function scheduleSessionRelease(
  modelId: LocalAiModelId,
  onRelease: (ctx: LlamaContext) => Promise<void>,
): void {
  const session = sessions.get(modelId);
  if (!session) {
    return;
  }

  // Cancel existing timeout
  if (session.releaseTimeout) {
    clearTimeout(session.releaseTimeout);
  }

  session.releaseTimeout = setTimeout(() => {
    void (async () => {
      const ctx = session.context;
      sessions.delete(modelId);
      await onRelease(ctx);
    })();
  }, SESSION_KEEP_ALIVE_MS);
}

/**
 * Immediately releases a specific session.
 */
export async function releaseSession(
  modelId: LocalAiModelId,
  onRelease: (ctx: LlamaContext) => Promise<void>,
): Promise<void> {
  const session = sessions.get(modelId);
  if (!session) {
    return;
  }

  if (session.releaseTimeout) {
    clearTimeout(session.releaseTimeout);
  }

  const ctx = session.context;
  sessions.delete(modelId);
  await onRelease(ctx);
}

/**
 * Evicts the least recently used session to make room for a new one.
 * Returns true if a session was evicted, false if none available.
 */
export async function evictLruSession(
  onRelease: (ctx: LlamaContext) => Promise<void>,
): Promise<boolean> {
  if (sessions.size === 0) {
    return false;
  }

  // Find LRU session
  let lruModelId: LocalAiModelId | null = null;
  let lruTime = Number.MAX_SAFE_INTEGER;

  for (const [modelId, session] of sessions.entries()) {
    if (session.lastUsedAt < lruTime) {
      lruTime = session.lastUsedAt;
      lruModelId = modelId;
    }
  }

  if (lruModelId) {
    await releaseSession(lruModelId, onRelease);
    return true;
  }

  return false;
}

/**
 * Releases all sessions immediately.
 */
export async function releaseAllSessions(
  onRelease: (ctx: LlamaContext) => Promise<void>,
): Promise<void> {
  const toRelease = Array.from(sessions.entries());
  sessions.clear();

  for (const [, session] of toRelease) {
    if (session.releaseTimeout) {
      clearTimeout(session.releaseTimeout);
    }
    await onRelease(session.context);
  }
}

/**
 * Returns statistics about active sessions.
 */
export function getSessionStats(): {
  active: number;
  maxAllowed: number;
  models: string[];
} {
  return {
    active: sessions.size,
    maxAllowed: getMaxConcurrentSessions(),
    models: Array.from(sessions.keys()),
  };
}
