import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import { type MeetingUtterance, utteranceStripeColor } from '../lib/parseMeetingDialogue';

type MeetingDialogueUtteranceCardProps = {
  utterance: MeetingUtterance;
  color: Colors;
  /** Speaker name on first turn of a run (when the speaker changes). */
  showInlineSpeakerLabel?: boolean;
  /** `subtle` when a participant chip row is shown above the transcript. */
  speakerLabelVariant?: 'subtle' | 'emphasized';
};

export function MeetingDialogueUtteranceCard({
  utterance,
  color,
  showInlineSpeakerLabel = false,
  speakerLabelVariant = 'emphasized',
}: MeetingDialogueUtteranceCardProps) {
  const { t } = useTranslation();
  const stripe = utteranceStripeColor(color, utterance.colorSlot);
  const hasSpeaker = Boolean(utterance.speakerLabel?.trim());
  const subtleLabel = speakerLabelVariant === 'subtle';

  const a11yLabel = hasSpeaker ? `${utterance.speakerLabel}. ${utterance.body}` : utterance.body;

  return (
    <View
      accessible
      accessibilityLabel={a11yLabel}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
        overflow: 'hidden',
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: showInlineSpeakerLabel && hasSpeaker ? 28 : 10,
          bottom: 10,
          width: 3,
          backgroundColor: stripe,
        }}
      />
      <View style={{ paddingVertical: 14, paddingRight: 14, paddingLeft: 13 }}>
        {hasSpeaker && showInlineSpeakerLabel ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: subtleLabel ? 12 : 13,
              fontWeight: '600',
              lineHeight: subtleLabel ? 16 : 18,
              color: subtleLabel ? color.text.secondary : stripe,
              marginBottom: 6,
              alignSelf: 'flex-start',
              maxWidth: '100%',
            }}
          >
            {utterance.speakerLabel}
          </Text>
        ) : !hasSpeaker ? (
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
        ) : null}
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
    </View>
  );
}
