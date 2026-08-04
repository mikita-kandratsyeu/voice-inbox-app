import {
  findCloudAiModelCatalogEntry,
  isPrivateCustomServerMode,
  resolveLocalAiModelEntry,
  useSettingsStore,
} from '@/entities/settings';

import { i18n } from './i18n';

export function useAiModelName(): string {
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);

  if (aiExecutionMode === 'private_experimental') {
    if (isPrivateCustomServerMode(aiExecutionMode, privateAiProvider)) {
      return '';
    }
    if (selectedLocalAiModel == null) {
      return i18n.t('settings.whisperModelNotSet');
    }
    const localModel = resolveLocalAiModelEntry(selectedLocalAiModel);
    return localModel?.name ?? selectedLocalAiModel;
  }

  if (aiModelRoutingMode === 'auto') {
    return i18n.t('aiModels.autoRecommendedLabel');
  }

  const cloud = findCloudAiModelCatalogEntry(selectedAIModel);
  return cloud?.name ?? selectedAIModel;
}
