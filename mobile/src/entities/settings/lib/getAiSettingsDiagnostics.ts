import { findCloudAiModelCatalogEntry } from '../model/constants';
import { useSettingsStore } from '../model/store';
import type { AiUserTierCode, UserSelectableAIModelId } from '../model/types';

export type AiSettingsDiagnostics = {
  selectedOpenRouterModelId: UserSelectableAIModelId;
  userTier: AiUserTierCode | 'unknown';
  displayName: string;
};

export function getAiSettingsDiagnostics(): AiSettingsDiagnostics {
  const selectedOpenRouterModelId = useSettingsStore.getState().selectedAIModel;
  const facing = findCloudAiModelCatalogEntry(selectedOpenRouterModelId);

  return {
    selectedOpenRouterModelId,
    userTier: facing?.supportTierCode ?? 'unknown',
    displayName: facing?.name ?? selectedOpenRouterModelId,
  };
}
