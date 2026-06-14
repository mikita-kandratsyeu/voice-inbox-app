import React from 'react';
import { useTranslation } from 'react-i18next';

import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { isDarkSurfaceColor } from '@/shared/lib';
import { PickerKindCard } from '@/shared/ui/PickerKindCard';

import {
  getRecordingMarkKindAccentColors,
  getRecordingMarkKindUi,
} from '../lib/recordingMarkKindUi';
import type { RecordingMarkKind } from '../model/types';

type RecordingMarkKindCardProps = {
  kind: RecordingMarkKind;
  color: Colors;
  onPress: (kind: RecordingMarkKind) => void;
  onLongPress?: (kind: RecordingMarkKind) => void;
};

export function RecordingMarkKindCard({
  kind,
  color: c,
  onPress,
  onLongPress,
}: RecordingMarkKindCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const surfaceDark = isDarkSurfaceColor(c);
  const { Icon, recordA11yKey, descriptionKey } = getRecordingMarkKindUi(kind);
  const { accent } = getRecordingMarkKindAccentColors(kind, theme, surfaceDark);

  const title = t(recordA11yKey);
  const description = t(descriptionKey);

  return (
    <PickerKindCard
      color={c}
      icon={Icon}
      accent={accent}
      title={title}
      description={description}
      onPress={() => onPress(kind)}
      onLongPress={onLongPress ? () => onLongPress(kind) : undefined}
      accessibilityHint={onLongPress ? t('record.markHoldForLabel') : undefined}
    />
  );
}
