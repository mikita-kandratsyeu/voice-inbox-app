import { isPrivateCustomServerMode, LOCAL_AI_MODELS, useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import { i18n } from '@/shared/lib/i18n';
import { useAiModelName } from '@/shared/lib';

export function useAskAiModelLabel(): string {
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const { isProActive } = useProEntitlement();
  const cloudModelName = useAiModelName();

  if (isPrivateCustomServerMode(aiExecutionMode, privateAiProvider, isProActive)) {
    const trimmed = privateRemoteModel.trim();
    return trimmed.length > 0 ? trimmed : i18n.t('recordingDetail.askModelChipEmpty');
  }

  if (aiExecutionMode === 'private_experimental') {
    if (selectedLocalAiModel != null) {
      const local = LOCAL_AI_MODELS.find((m) => m.id === selectedLocalAiModel);
      if (local) return local.name;
    }
    return i18n.t('recordingDetail.askModelChipEmpty');
  }

  return cloudModelName;
}
