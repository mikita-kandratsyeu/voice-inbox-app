import {
  DEFAULT_LOCAL_AI_MODEL_ID,
  resolveEffectivePrivateAiProvider,
  useSettingsStore,
} from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { AiExecutionContext } from '@/shared/lib/ai-core/types';

export function buildDigestAiExecutionContext(): AiExecutionContext {
  const s = useSettingsStore.getState();
  const effectivePrivateAiProvider = resolveEffectivePrivateAiProvider(
    s.privateAiProvider,
    isProActiveFromStorageSync(),
  );

  return {
    selectedAIModel: s.selectedAIModel,
    aiModelRoutingMode: s.aiModelRoutingMode,
    selectedLocalAiModel: s.selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID,
    isLocalLlmModelDownloaded:
      s.selectedLocalAiModel != null &&
      (s.localLlmModelStatuses[s.selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded',
    summaryStyle: s.summaryStyle,
    taskStrictness: s.taskStrictness,
    aiOutputLanguage: s.aiOutputLanguage,
    aiExecutionMode: s.aiExecutionMode,
    privateLocalLlmBudget: s.privateLocalLlmBudget,
    privateRemoteOutputBudget: s.privateRemoteOutputBudget,
    privateRemotePreferJsonObject: s.privateRemotePreferJsonObject,
    privateCapabilityTier: s.privateCapabilityTier,
    privateAiProvider: effectivePrivateAiProvider,
    privateRemoteBaseUrl: s.privateRemoteBaseUrl,
    privateRemoteApiKey: s.privateRemoteApiKey,
    privateRemoteModel: s.privateRemoteModel,
    cloudMessageTtlSeconds: s.cloudAiKvTtlSeconds,
  };
}
