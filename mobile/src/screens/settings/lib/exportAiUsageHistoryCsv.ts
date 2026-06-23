import type { TFunction } from 'i18next';
import { Share } from 'react-native';

import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import { type AiUsageHistoryEntry, getAiUsageHistoryForExport } from '@/shared/lib/ai-api';
import { resolveAiModelRoutingDisplayLabel } from '@/shared/lib/aiModelRoutingDisplay';
import { diagWarn } from '@/shared/lib/appLogger';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';
import { formatLocalizedLongDateWithTime } from '@/shared/lib/taskDeadlineTimeDisplay';

const UTF8_BOM = '\uFEFF';

export class AiUsageHistoryExportError extends Error {
  constructor(readonly reason: 'empty' | 'fetch_failed') {
    super(reason);
    this.name = 'AiUsageHistoryExportError';
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildAiUsageHistoryCsv(
  items: AiUsageHistoryEntry[],
  t: TFunction,
  language: string,
): string {
  const headers = [
    t('settings.aiUsageDashboard.history.exportCsvColumns.date'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.kind'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.operation'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.amount'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.model'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.description'),
    t('settings.aiUsageDashboard.history.exportCsvColumns.jobId'),
  ];

  const rows = items.map((entry) => {
    const operationKey = `settings.aiUsageDashboard.history.operations.${entry.operation}`;
    const operationLabel = t(operationKey);
    return [
      formatLocalizedLongDateWithTime(entry.createdAt, language),
      t(`settings.aiUsageDashboard.history.kinds.${entry.kind}`),
      operationLabel === operationKey
        ? t('settings.aiUsageDashboard.history.operations.unknown')
        : operationLabel,
    String(entry.amount),
    resolveAiModelRoutingDisplayLabel(t, {
      modelMode: entry.modelMode,
      model: entry.model,
      modelLabel: entry.modelLabel,
    }),
    entry.description?.trim() || '',
    entry.jobId?.trim() || '',
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function exportAiUsageHistoryCsv(params: {
  t: TFunction;
  language: string;
}): Promise<void> {
  const exportResult = await getAiUsageHistoryForExport();
  if (!exportResult) {
    throw new AiUsageHistoryExportError('fetch_failed');
  }
  if (exportResult.items.length === 0) {
    throw new AiUsageHistoryExportError('empty');
  }
  if (exportResult.truncated) {
    diagWarn('[exportAiUsageHistoryCsv] export truncated at server limit');
  }

  const timestamp = Date.now();
  const fileName = `ai-credits-${timestamp}.csv`;
  const filePath = `${getCachesDirectoryPath()}/${fileName}`;
  const csv = `${UTF8_BOM}${buildAiUsageHistoryCsv(exportResult.items, params.t, params.language)}`;

  try {
    await NitroFS.writeFile(filePath, csv, 'utf8');
    await Share.share(
      {
        title: params.t('settings.aiUsageDashboard.history.exportCsvTitle'),
        url: `file://${filePath}`,
      },
      { dialogTitle: params.t('settings.aiUsageDashboard.history.exportCsv') },
    );
  } catch (err) {
    if (isUserCancelledShare(err)) {
      return;
    }
    throw err;
  } finally {
    try {
      if (await NitroFS.exists(filePath)) {
        await NitroFS.unlink(filePath);
      }
    } catch {
      diagWarn('[exportAiUsageHistoryCsv] failed to unlink', { filePath });
    }
  }
}
