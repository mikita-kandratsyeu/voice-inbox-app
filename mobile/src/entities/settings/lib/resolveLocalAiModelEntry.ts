import {
  customEntryToCatalogEntry,
  getLocalAiModelEntry,
  LOCAL_AI_MODELS,
  type LocalAiModelCatalogEntry,
} from '../model/constants';
import { useSettingsStore } from '../model/store';
import type { CustomLocalAiModelEntry, LocalAiModelId } from '../model/types';

export function resolveLocalAiModelEntry(
  id: LocalAiModelId,
  customModels?: CustomLocalAiModelEntry[],
): LocalAiModelCatalogEntry | undefined {
  const curated = getLocalAiModelEntry(id);
  if (curated) return curated;

  const customs = customModels ?? useSettingsStore.getState().customLocalAiModels;
  const custom = customs.find((m) => m.id === id);
  return custom ? customEntryToCatalogEntry(custom) : undefined;
}

export function getAllLocalAiModelEntries(
  customModels?: CustomLocalAiModelEntry[],
): LocalAiModelCatalogEntry[] {
  const customs = customModels ?? useSettingsStore.getState().customLocalAiModels;
  return [...LOCAL_AI_MODELS, ...customs.map(customEntryToCatalogEntry)];
}
