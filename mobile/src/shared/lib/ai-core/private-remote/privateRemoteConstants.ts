import type { PrivateRemoteOutputBudget } from '@/entities/settings';

/** Max output tokens for custom-server (OpenAI-compatible) requests — separate from on-device GGUF. */
export const PRIVATE_REMOTE_BUDGET_SUMMARY_MAX_TOKENS: Record<
  Exclude<PrivateRemoteOutputBudget, 'unlimited'>,
  number
> = {
  efficient: 2048,
  balanced: 4096,
  expanded: 8192,
};

export const PRIVATE_REMOTE_BUDGET_ASK_MAX_TOKENS: Record<
  Exclude<PrivateRemoteOutputBudget, 'unlimited'>,
  number
> = {
  efficient: 512,
  balanced: 1024,
  expanded: 2048,
};

export const PRIVATE_REMOTE_BUDGET_MEETING_DIALOGUE_MAX_TOKENS: Record<
  Exclude<PrivateRemoteOutputBudget, 'unlimited'>,
  number
> = {
  efficient: 3072,
  balanced: 6144,
  expanded: 12_288,
};

const REMOTE_JSON_REPAIR_MAX_TOKENS = 4096;

/** iOS/RN default URLSession timeout is ~60s; LM Studio often needs longer. */
export const PRIVATE_REMOTE_COMPLETION_TIMEOUT_MS = 10 * 60 * 1000;

/** Health check and model list. */
export const PRIVATE_REMOTE_QUICK_FETCH_TIMEOUT_MS = 45 * 1000;

/** Manual "Test AI server" should fail quickly enough to keep settings responsive. */
export const PRIVATE_REMOTE_HEALTH_CHECK_TIMEOUT_MS = 8 * 1000;

/** LAN discovery probe per host/port. */
export const PRIVATE_REMOTE_LAN_PROBE_TIMEOUT_MS = 2_000;

/** Parallel probes while scanning a /24 subnet. */
export const PRIVATE_REMOTE_LAN_SCAN_CONCURRENCY = 32;

export function resolvePrivateRemoteSummaryMaxTokens(
  budget: PrivateRemoteOutputBudget,
): number | null {
  if (budget === 'unlimited') return null;
  return PRIVATE_REMOTE_BUDGET_SUMMARY_MAX_TOKENS[budget];
}

export function resolvePrivateRemoteAskMaxTokens(budget: PrivateRemoteOutputBudget): number | null {
  if (budget === 'unlimited') return null;
  return PRIVATE_REMOTE_BUDGET_ASK_MAX_TOKENS[budget];
}

export function resolvePrivateRemoteMeetingDialogueMaxTokens(
  budget: PrivateRemoteOutputBudget,
): number | null {
  if (budget === 'unlimited') return null;
  return PRIVATE_REMOTE_BUDGET_MEETING_DIALOGUE_MAX_TOKENS[budget];
}

export function resolvePrivateRemoteJsonRepairMaxTokens(): number {
  return REMOTE_JSON_REPAIR_MAX_TOKENS;
}

/** Auto-organize JSON grows with note count; local servers need a higher floor than summaries. */
export function resolvePrivateRemoteAutoOrganizeMaxTokens(
  budget: PrivateRemoteOutputBudget,
  noteCount: number,
): number | null {
  const budgetCap = resolvePrivateRemoteSummaryMaxTokens(budget);
  const noteScaled = Math.min(16_384, 640 + Math.max(0, noteCount) * 56);
  if (budgetCap === null) return noteScaled;
  return Math.max(budgetCap, noteScaled);
}
