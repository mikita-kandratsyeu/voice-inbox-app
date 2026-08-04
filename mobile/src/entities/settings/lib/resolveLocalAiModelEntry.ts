import { isInstallableGgufFilename } from '@/shared/lib/local-llm/isInstallableGgufFile';

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
  if (!custom || !isInstallableGgufFilename(custom.fileName)) return undefined;
  return customEntryToCatalogEntry(custom);
}

export function getAllLocalAiModelEntries(
  customModels?: CustomLocalAiModelEntry[],
): LocalAiModelCatalogEntry[] {
  const customs = customModels ?? useSettingsStore.getState().customLocalAiModels;
  const installableCustoms = customs.filter((m) => isInstallableGgufFilename(m.fileName));
  return [...LOCAL_AI_MODELS, ...installableCustoms.map(customEntryToCatalogEntry)];
}
