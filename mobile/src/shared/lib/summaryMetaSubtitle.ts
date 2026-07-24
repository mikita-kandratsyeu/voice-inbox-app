import type { TFunction } from 'i18next';

import { formatSummaryGenerationDuration } from './formatSummaryGenerationDuration';
import { formatTokenCount } from './formatTokenCount';
import { i18n } from './i18n';

export type SummaryTokenUsage = {
  prompt: number;
  completion: number;
};

export type SummaryMetaLines = {
  modelLine?: string;
  tokensLine?: string;
  durationLine?: string;
};

export function buildSummaryMetaLines(
  t: TFunction,
  modelLabel: string | undefined,
  tokenUsage: SummaryTokenUsage | undefined,
  generationDurationMs?: number,
): SummaryMetaLines {
  const model = modelLabel?.trim();
  const lines: SummaryMetaLines = {};

  if (model) {
    lines.modelLine = model;
  }
  if (tokenUsage) {
    const locale = i18n.language;
    lines.tokensLine = t('recordingDetail.summaryMetaTokens', {
      input: formatTokenCount(tokenUsage.prompt, locale),
      output: formatTokenCount(tokenUsage.completion, locale),
    });
  }
  if (generationDurationMs != null && generationDurationMs > 0) {
    const duration = formatSummaryGenerationDuration(generationDurationMs, t);
    lines.durationLine = t('recordingDetail.summaryMetaDuration', { duration });
  }

  return lines;
}

export function hasSummaryMetaLines(lines: SummaryMetaLines): boolean {
  return Boolean(lines.modelLine?.trim() || lines.tokensLine?.trim() || lines.durationLine?.trim());
}

export function summaryMetaA11yHint(lines: SummaryMetaLines): string | undefined {
  const parts = [lines.modelLine, lines.tokensLine, lines.durationLine]
    .map((s) => s?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join('. ') : undefined;
}
