import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/shared/config';
import { AiHintSheet } from '@/shared/ui';

type SummaryRegenerateHintSheetProps = {
  visible: boolean;
  isMeeting?: boolean;
  onClose: () => void;
  onConfirm: (hint: string | undefined) => void;
};

export function SummaryRegenerateHintSheet({
  visible,
  isMeeting = false,
  onClose,
  onConfirm,
}: SummaryRegenerateHintSheetProps) {
  const { t } = useTranslation();
  const color = useColors();

  const presets = useMemo(() => {
    const items = [
      {
        label: t('recordingDetail.summaryRegeneratePresetShorterLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetShorterHint'),
      },
      {
        label: t('recordingDetail.summaryRegeneratePresetBulletsLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetBulletsHint'),
      },
      {
        label: t('recordingDetail.summaryRegeneratePresetDecisionsLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetDecisionsHint'),
      },
    ];
    if (isMeeting) {
      items.push({
        label: t('recordingDetail.summaryRegeneratePresetMeetingLabel'),
        hint: t('recordingDetail.summaryRegeneratePresetMeetingHint'),
      });
    }
    return items;
  }, [isMeeting, t]);

  return (
    <AiHintSheet
      visible={visible}
      color={color}
      title={t('recordingDetail.summaryRegenerateSheetTitle')}
      subtitle={t('recordingDetail.summaryRegenerateSheetSubtitle')}
      presets={presets}
      placeholder={t('recordingDetail.summaryRegenerateHintPlaceholder')}
      hintA11y={t('recordingDetail.summaryRegenerateHintA11y')}
      charCountLabel={(current, max) =>
        t('recordingDetail.summaryRegenerateCharCount', { current, max })
      }
      primaryLabel={t('recordingDetail.regenerateSummary')}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
