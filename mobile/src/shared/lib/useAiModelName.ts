import { LOCAL_AI_MODELS, USER_FACING_AI_MODELS, useSettingsStore } from '@/entities/settings';

export function useAiModelName(): string {
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);

  if (aiExecutionMode === 'private_experimental') {
    const localModel = LOCAL_AI_MODELS.find((m) => m.id === selectedLocalAiModel);
    return localModel?.name ?? selectedLocalAiModel;
  }

  const userFacing = USER_FACING_AI_MODELS.find((m) => m.id === selectedAIModel);
  return userFacing?.name ?? selectedAIModel;
}
