import {
  AI_MODEL_MIMO_V2_5_PRO,
  AI_MODEL_NEMOTRON_3_SUPER,
  normalizeIncomingAiModel,
} from '@/config/constants';

const PRO_ONLY_AI_MODELS = new Set<string>([
  AI_MODEL_MIMO_V2_5_PRO,
  'minimax/minimax-m2.7',
  AI_MODEL_NEMOTRON_3_SUPER,
]);

export function isProOnlyAiModel(model: string): boolean {
  return PRO_ONLY_AI_MODELS.has(normalizeIncomingAiModel(model.trim()));
}
