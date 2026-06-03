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
