import { USER_FACING_AI_MODELS, useSettingsStore } from '@/entities/settings';

export function useAiModelName(): string {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const userFacing = USER_FACING_AI_MODELS.find((m) => m.id === selectedAIModel);
  return userFacing?.name ?? selectedAIModel;
}
