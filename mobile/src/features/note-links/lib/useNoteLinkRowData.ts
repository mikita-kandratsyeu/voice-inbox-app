import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Folder } from '@/entities/folder';
import { resolveFolderListRowChrome } from '@/entities/folder/lib/folderListRowChrome';
import type { VoiceRecord } from '@/entities/record';
import { useProEntitlement } from '@/features/pro-license';
import { type Colors, useAppTheme } from '@/shared/config';
import { formatRelativeTime } from '@/shared/lib';

type UseNoteLinkRowDataParams = {
  record: VoiceRecord;
  folder: Folder | null;
  color: Colors;
};

export function useNoteLinkRowData({ record, folder, color }: UseNoteLinkRowDataParams) {
  const { t, i18n } = useTranslation();
  const scheme = useAppTheme();
  const { isProActive } = useProEntitlement();

  const classificationLabel =
    record.classification && !record.folderId ? t(`classification.${record.classification}`) : null;

  const { folderTintHex, locationLabel, leadingFolderIconId, showInboxIcon } = useMemo(
    () =>
      resolveFolderListRowChrome({
        folder,
        folderId: record.folderId,
        classification: record.classification,
        isProActive,
        scheme,
        labels: {
          inbox: t('tabs.inbox'),
          folderRemoved: t('folders.detailFolderRemoved'),
          classificationLabel,
        },
      }),
    [classificationLabel, folder, isProActive, record.classification, record.folderId, scheme, t],
  );

  const leadingIconColor = folderTintHex ?? color.text.secondary;
  const stripeColor = folderTintHex ?? color.border.default;
  const dateLabel = record.createdAt ? formatRelativeTime(record.createdAt, i18n.language) : null;
  const summaryPreview = record.summary?.replace(/\s+/g, ' ').trim();

  const accessibilityLabel = [record.title, locationLabel, dateLabel, summaryPreview]
    .filter(Boolean)
    .join(', ');

  return {
    folderTintHex,
    locationLabel,
    leadingFolderIconId,
    showInboxIcon,
    leadingIconColor,
    stripeColor,
    dateLabel,
    summaryPreview,
    accessibilityLabel,
  };
}
