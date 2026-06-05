import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, isDarkSurfaceColor, withAlphaHex } from '@/shared/lib';

import type { MeetingDialogueSpeakerRosterEntry } from '../lib/buildSpeakerRoster';
import { utteranceStripeColor } from '../lib/parseMeetingDialogue';

export type { MeetingDialogueSpeakerRosterEntry } from '../lib/buildSpeakerRoster';

type SpeakerChipProps = {
  speaker: MeetingDialogueSpeakerRosterEntry;
  color: Colors;
  surfaceDark: boolean;
  renameA11yLabel: string;
  renameHint: string;
  onPress: () => void;
};

/** Pill chip aligned with {@link FolderChipBar} folder chips. */
const SpeakerChip = ({
  speaker,
  color,
  surfaceDark,
  renameA11yLabel,
  renameHint,
  onPress,
}: SpeakerChipProps) => {
  const stripe = utteranceStripeColor(color, speaker.colorSlot);
  const inactiveTint = surfaceDark ? 0.22 : 0.14;
  const inactiveBorder = surfaceDark ? 0.5 : 0.42;
  const label = speaker.displayLabel;

  return (
    <TouchableOpacity
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={renameA11yLabel}
      accessibilityHint={renameHint}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        maxWidth: 240,
        backgroundColor: withAlphaHex(stripe, inactiveTint),
        borderWidth: 1,
        borderColor: withAlphaHex(stripe, inactiveBorder),
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: color.text.primary,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

type MeetingDialogueSpeakerRosterProps = {
  speakers: MeetingDialogueSpeakerRosterEntry[];
  color: Colors;
  onRename: (originalLabels: string[]) => void;
};

export function MeetingDialogueSpeakerRoster({
  speakers,
  color,
  onRename,
}: MeetingDialogueSpeakerRosterProps) {
  const { t } = useTranslation();
  const surfaceDark = isDarkSurfaceColor(color);
  const renameHint = t('recordingDetail.renameSpeakerHint');

  const renameA11yFor = useCallback(
    (name: string) => t('recordingDetail.renameSpeakerA11y', { name }),
    [t],
  );

  if (speakers.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ gap: 2 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            lineHeight: 18,
            color: color.text.secondary,
          }}
        >
          {t('recordingDetail.meetingDialogueSpeakersSection')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: color.text.muted,
          }}
        >
          {t('recordingDetail.meetingDialogueSpeakersSectionHint')}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 4 }}
      >
        {speakers.map((speaker) => (
          <SpeakerChip
            key={speaker.originalLabels.join('\u0000')}
            speaker={speaker}
            color={color}
            surfaceDark={surfaceDark}
            renameA11yLabel={renameA11yFor(speaker.displayLabel)}
            renameHint={renameHint}
            onPress={() => onRename(speaker.originalLabels)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
