import type { TFunction } from 'i18next';

import { formatTokenCount } from './formatTokenCount';

export type SummaryTokenUsage = {
  prompt: number;
  completion: number;
};

export type SummaryMetaLines = {
  modelLine?: string;
  tokensLine?: string;
};

export function buildSummaryMetaLines(
  t: TFunction,
  modelLabel: string | undefined,
  tokenUsage: SummaryTokenUsage | undefined,
): SummaryMetaLines {
  const model = modelLabel?.trim();
  const lines: SummaryMetaLines = {};

  if (model) {
    lines.modelLine = model;
  }
  if (tokenUsage) {
    lines.tokensLine = t('recordingDetail.summaryMetaTokens', {
      input: formatTokenCount(tokenUsage.prompt),
      output: formatTokenCount(tokenUsage.completion),
    });
  }

  return lines;
}

export function hasSummaryMetaLines(lines: SummaryMetaLines): boolean {
  return Boolean(lines.modelLine?.trim() || lines.tokensLine?.trim());
}

export function summaryMetaA11yHint(lines: SummaryMetaLines): string | undefined {
  const parts = [lines.modelLine, lines.tokensLine].map((s) => s?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join('. ') : undefined;
}
