import { UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type RecordingMeetingModeSectionProps = {
  isMeetingMode: boolean;
  disabled?: boolean;
  color: Colors;
  surfaceBackgroundColor: string;
  onToggle: () => void;
};

export const RecordingMeetingModeSection = ({
  isMeetingMode,
  disabled = false,
  color,
  surfaceBackgroundColor,
  onToggle,
}: RecordingMeetingModeSectionProps) => {
  const { t } = useTranslation();

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: surfaceBackgroundColor }}
    >
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isMeetingMode, disabled }}
        accessibilityLabel={t('record.meetingMode')}
        disabled={disabled}
        onPress={onToggle}
        className="flex-row items-center gap-3 px-4 py-3.5"
        style={{ opacity: disabled ? 0.55 : 1 }}
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: isMeetingMode ? color.accent.primary : color.background.tertiary,
          }}
        >
          <UsersRound
            size={18}
            color={isMeetingMode ? '#fff' : color.text.secondary}
            strokeWidth={2}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
            {t('record.meetingMode')}
          </Text>
          <Text className="mt-0.5 text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {t('recordingDetail.meetingModeDetailHint')}
          </Text>
        </View>
        <View
          className="h-6 w-11 justify-center rounded-full px-0.5"
          style={{
            backgroundColor: isMeetingMode ? color.accent.primary : color.border.default,
          }}
        >
          <View
            className="h-5 w-5 rounded-full bg-white"
            style={{ alignSelf: isMeetingMode ? 'flex-end' : 'flex-start' }}
          />
        </View>
      </Pressable>
    </View>
  );
};
