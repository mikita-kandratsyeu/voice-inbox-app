import { RefreshCw, UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type MeetingModeSwitchRowProps = {
  checked: boolean;
  disabled?: boolean;
  color: Colors;
  title: string;
  description: string;
  accessibilityLabel: string;
  onToggle: () => void;
  leadingIcon?: React.ReactNode;
  borderedTop?: boolean;
};

function MeetingModeSwitchRow({
  checked,
  disabled = false,
  color,
  title,
  description,
  accessibilityLabel,
  onToggle,
  leadingIcon,
  borderedTop = false,
}: MeetingModeSwitchRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onToggle}
      className="flex-row items-center gap-3 px-4 py-3.5"
      style={{
        opacity: disabled ? 0.55 : 1,
        ...(borderedTop
          ? { borderTopWidth: 1, borderTopColor: color.border.default }
          : undefined),
      }}
    >
      {leadingIcon ?? <View className="h-9 w-9" />}
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
          {title}
        </Text>
        <Text className="mt-0.5 text-[13px] leading-5" style={{ color: color.text.secondary }}>
          {description}
        </Text>
      </View>
      <View
        className="h-6 w-11 justify-center rounded-full px-0.5"
        style={{
          backgroundColor: checked ? color.accent.primary : color.border.default,
        }}
      >
        <View
          className="h-5 w-5 rounded-full bg-white"
          style={{ alignSelf: checked ? 'flex-end' : 'flex-start' }}
        />
      </View>
    </Pressable>
  );
}

type RecordingMeetingModeSectionProps = {
  isMeetingMode: boolean;
  autoRefreshSpeakersOnRegen: boolean;
  disabled?: boolean;
  color: Colors;
  surfaceBackgroundColor: string;
  onToggleMeetingMode: () => void;
  onToggleAutoRefreshSpeakers: () => void;
};

export const RecordingMeetingModeSection = ({
  isMeetingMode,
  autoRefreshSpeakersOnRegen,
  disabled = false,
  color,
  surfaceBackgroundColor,
  onToggleMeetingMode,
  onToggleAutoRefreshSpeakers,
}: RecordingMeetingModeSectionProps) => {
  const { t } = useTranslation();

  const meetingIcon = (
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
  );

  const autoRefreshIcon = (
    <View
      className="h-9 w-9 items-center justify-center rounded-full"
      style={{
        backgroundColor: autoRefreshSpeakersOnRegen
          ? color.accent.primary
          : color.background.tertiary,
      }}
    >
      <RefreshCw
        size={18}
        color={autoRefreshSpeakersOnRegen ? '#fff' : color.text.secondary}
        strokeWidth={2}
      />
    </View>
  );

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: surfaceBackgroundColor }}
    >
      <MeetingModeSwitchRow
        checked={isMeetingMode}
        disabled={disabled}
        color={color}
        title={t('record.meetingMode')}
        description={t('recordingDetail.meetingModeDetailHint')}
        accessibilityLabel={t('record.meetingMode')}
        onToggle={onToggleMeetingMode}
        leadingIcon={meetingIcon}
      />
      {isMeetingMode ? (
        <MeetingModeSwitchRow
          checked={autoRefreshSpeakersOnRegen}
          disabled={disabled}
          color={color}
          title={t('recordingDetail.meetingAutoRefreshSpeakersTitle')}
          description={t('recordingDetail.meetingAutoRefreshSpeakersHint')}
          accessibilityLabel={t('recordingDetail.meetingAutoRefreshSpeakersA11y')}
          onToggle={onToggleAutoRefreshSpeakers}
          leadingIcon={autoRefreshIcon}
          borderedTop
        />
      ) : null}
    </View>
  );
};
