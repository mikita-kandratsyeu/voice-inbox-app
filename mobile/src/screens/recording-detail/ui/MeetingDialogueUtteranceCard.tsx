import { Pencil } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

import { utteranceStripeColor, type MeetingUtterance } from '../lib/parseMeetingDialogue';

type MeetingDialogueUtteranceCardProps = {
  utterance: MeetingUtterance;
  color: Colors;
  canRename: boolean;
  onRename?: () => void;
};

function SpeakerNameRow({
  label,
  stripe,
  color,
  canRename,
  onRename,
}: {
  label: string;
  stripe: string;
  color: Colors;
  canRename: boolean;
  onRename?: () => void;
}) {
  const { t } = useTranslation();

  const nameText = (
    <Text
      numberOfLines={1}
      style={{
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        color: stripe,
        flexGrow: 0,
        flexShrink: 1,
      }}
    >
      {label}
    </Text>
  );

  const pencil = canRename ? (
    <View style={{ marginLeft: 6, flexShrink: 0, width: 16, height: 16, justifyContent: 'center' }}>
      <Pencil size={15} color={color.text.muted} strokeWidth={2} />
    </View>
  ) : null;

  const row = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
      }}
    >
      {nameText}
      {pencil}
    </View>
  );

  if (!canRename || !onRename) {
    return <View style={{ marginBottom: 8 }}>{row}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('recordingDetail.renameSpeakerA11y', { name: label })}
      accessibilityHint={t('recordingDetail.renameSpeakerHint')}
      onPress={() => {
        hapticSelection();
        onRename();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        maxWidth: '100%',
        minHeight: 36,
        justifyContent: 'center',
        marginBottom: 8,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {row}
    </Pressable>
  );
}

export function MeetingDialogueUtteranceCard({
  utterance,
  color,
  canRename,
  onRename,
}: MeetingDialogueUtteranceCardProps) {
  const { t } = useTranslation();
  const stripe = utteranceStripeColor(color, utterance.colorSlot);
  const hasSpeaker = Boolean(utterance.speakerLabel?.trim());

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
        paddingVertical: 14,
        paddingRight: 14,
        paddingLeft: 11,
        borderLeftWidth: 3,
        borderLeftColor: stripe,
      }}
    >
      {hasSpeaker ? (
        <SpeakerNameRow
          label={utterance.speakerLabel}
          stripe={stripe}
          color={color}
          canRename={canRename}
          onRename={onRename}
        />
      ) : (
        <Text
          selectable
          style={{
            fontSize: 13,
            fontWeight: '600',
            lineHeight: 18,
            color: color.text.secondary,
            marginBottom: 8,
          }}
        >
          {t('recordingDetail.meetingDialoguePreamble')}
        </Text>
      )}
      <Text
        selectable
        style={{
          fontSize: 15,
          lineHeight: 22,
          color: color.text.primary,
        }}
      >
        {utterance.body}
      </Text>
    </View>
  );
}
