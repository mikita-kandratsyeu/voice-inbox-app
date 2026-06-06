import { UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';

import type { MeetingSummaryTemplate } from '@/entities/record';
import type { Colors } from '@/shared/config';

const MEETING_TEMPLATES: MeetingSummaryTemplate[] = [
  'general',
  'standup',
  'sales_call',
  'one_on_one',
  'interview',
  'product_meeting',
  'lecture',
];

type RecordingMeetingModeSectionProps = {
  isMeetingMode: boolean;
  selectedTemplate?: MeetingSummaryTemplate;
  disabled?: boolean;
  color: Colors;
  surfaceBackgroundColor: string;
  onToggleMeetingMode: () => void;
  onSelectTemplate?: (template: MeetingSummaryTemplate) => void;
};

export const RecordingMeetingModeSection = ({
  isMeetingMode,
  selectedTemplate = 'general',
  disabled = false,
  color,
  surfaceBackgroundColor,
  onToggleMeetingMode,
  onSelectTemplate,
}: RecordingMeetingModeSectionProps) => {
  const { t } = useTranslation();

  const meetingIcon = (
    <View
      className="h-8 w-8 items-center justify-center rounded-full"
      style={{
        backgroundColor: isMeetingMode ? color.accent.primary : color.background.tertiary,
      }}
    >
      <UsersRound size={17} color={isMeetingMode ? '#fff' : color.text.secondary} strokeWidth={2} />
    </View>
  );

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: surfaceBackgroundColor }}
    >
      <View
        className="flex-row items-center gap-3 px-4 py-3"
        style={{ opacity: disabled ? 0.55 : 1 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          accessibilityLabel={t('record.meetingMode')}
          disabled={disabled}
          onPress={onToggleMeetingMode}
          className="min-w-0 flex-1 flex-row items-center gap-2.5"
        >
          {meetingIcon}
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
              {t('record.meetingMode')}
            </Text>
            <Text
              className="mt-0.5 text-[12px] leading-4"
              numberOfLines={2}
              style={{ color: color.text.secondary }}
            >
              {t('recordingDetail.meetingModeDetailHint')}
            </Text>
          </View>
        </Pressable>
        <Switch
          value={isMeetingMode}
          disabled={disabled}
          onValueChange={onToggleMeetingMode}
          accessibilityLabel={t('record.meetingMode')}
          style={{ alignSelf: 'center', transform: [{ translateY: 2 }] }}
          trackColor={{
            false: color.background.tertiary,
            true: color.accent.primary,
          }}
          thumbColor={color.icon.onAccent}
          ios_backgroundColor={color.background.tertiary}
        />
      </View>
      {isMeetingMode ? (
        <View className="border-t pb-3 pt-3" style={{ borderColor: color.border.default }}>
          <Text
            className="mb-2 px-4 text-[12px] font-semibold"
            style={{ color: color.text.secondary }}
          >
            {t('recordingDetail.meetingSummaryTemplateTitle')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <View className="flex-row flex-nowrap pb-2">
              {MEETING_TEMPLATES.map((template) => {
                const selected = selectedTemplate === template;
                return (
                  <TouchableOpacity
                    key={template}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    activeOpacity={0.7}
                    onPress={() => onSelectTemplate?.(template)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginRight: 8,
                      opacity: disabled ? 0.55 : 1,
                      backgroundColor: selected ? color.accent.primary : color.background.tertiary,
                    }}
                  >
                    <Text
                      className="text-[13px] font-semibold"
                      numberOfLines={1}
                      style={{ color: selected ? color.icon.onAccent : color.text.primary }}
                    >
                      {t(`recordingDetail.meetingSummaryTemplates.${template}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};
