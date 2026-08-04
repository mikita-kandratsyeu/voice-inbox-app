import { findCloudAiModelCatalogEntry } from '../model/constants';
import type { LocalAiModelId } from '../model/types';
import { resolveLocalAiModelEntry } from './resolveLocalAiModelEntry';

/** Human-readable label for an OpenRouter or local LLM model id (fallback when server omits `modelLabel`). */
export function formatAiModelDisplayName(modelId: string): string {
  const id = modelId.trim();
  if (!id) return id;

  const cloud = findCloudAiModelCatalogEntry(id);
  if (cloud) return cloud.name;

  const local = resolveLocalAiModelEntry(id as LocalAiModelId);
  if (local) return local.name;

  return id;
}

/** Prefer server `modelLabel`; otherwise format the canonical model id locally. */
export function resolveAiModelDisplayLabel(
  modelId: string | undefined,
  modelLabel: string | undefined,
): string {
  const label = modelLabel?.trim();
  if (label) return label;
  const id = modelId?.trim();
  return id ? formatAiModelDisplayName(id) : '';
}
