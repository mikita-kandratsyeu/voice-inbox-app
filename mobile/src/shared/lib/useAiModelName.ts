import { AI_MODELS, useSettingsStore } from '@/entities/settings';

export function useAiModelName(): string {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);

  return AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
}
