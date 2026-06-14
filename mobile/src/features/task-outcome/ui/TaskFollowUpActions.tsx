import { Mic, SquarePen } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { getRecordingMarkKindAccentColors } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { isDarkSurfaceColor } from '@/shared/lib';
import { PickerKindCard } from '@/shared/ui/PickerKindCard';

type TaskFollowUpActionsProps = {
  color: Colors;
  onVoiceFollowUp: () => void;
  onTextFollowUp: () => void;
};

export function TaskFollowUpActions({
  color,
  onVoiceFollowUp,
  onTextFollowUp,
}: TaskFollowUpActionsProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const surfaceDark = isDarkSurfaceColor(color);
  const voiceAccent = getRecordingMarkKindAccentColors('moment', theme, surfaceDark).accent;
  const textAccent = getRecordingMarkKindAccentColors('topic', theme, surfaceDark).accent;

  return (
    <View className="mt-8 gap-2">
      <View className="flex-row justify-center gap-2">
        <View className="w-[32%] max-w-[148px] min-w-0 shrink-0">
          <PickerKindCard
            color={color}
            icon={Mic}
            accent={voiceAccent}
            title={t('taskOutcome.recordFollowUp')}
            description={t('taskOutcome.recordFollowUpSubtitle')}
            accessibilityLabel={t('taskOutcome.recordFollowUpA11y')}
            onPress={onVoiceFollowUp}
          />
        </View>
        <View className="w-[32%] max-w-[148px] min-w-0 shrink-0">
          <PickerKindCard
            color={color}
            icon={SquarePen}
            accent={textAccent}
            title={t('taskOutcome.textFollowUp')}
            description={t('taskOutcome.textFollowUpSubtitle')}
            accessibilityLabel={t('taskOutcome.textFollowUpA11y')}
            onPress={onTextFollowUp}
          />
        </View>
      </View>
    </View>
  );
}
