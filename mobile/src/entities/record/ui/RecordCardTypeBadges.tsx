import { Bookmark, FileText, Mic, Users } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import type { RecordCardNoteKind } from '@/entities/record/lib/recordCardExpandedPreview';
import type { Colors } from '@/shared/config';

type RecordCardTypeBadgesProps = {
  noteKind: RecordCardNoteKind;
  marksCount: number;
  color: Colors;
};

function TypeBadge({
  color,
  icon,
  label,
}: {
  color: Colors;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: color.background.tertiary,
      }}
    >
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '600', color: color.text.secondary }}>{label}</Text>
    </View>
  );
}

export const RecordCardTypeBadges = memo(function RecordCardTypeBadges({
  noteKind,
  marksCount,
  color,
}: RecordCardTypeBadgesProps) {
  const { t } = useTranslation();

  const showNoteKind = noteKind !== 'voice';
  const showMarks = marksCount > 0;

  if (!showNoteKind && !showMarks) {
    return null;
  }

  const noteKindLabel =
    noteKind === 'text'
      ? t('inbox.cardLayout.noteTypeText')
      : noteKind === 'meeting'
        ? t('inbox.cardLayout.noteTypeMeeting')
        : t('inbox.cardLayout.noteTypeVoice');

  const noteKindIcon =
    noteKind === 'text' ? (
      <FileText size={12} color={color.text.secondary} strokeWidth={2.2} />
    ) : noteKind === 'meeting' ? (
      <Users size={12} color={color.text.secondary} strokeWidth={2.2} />
    ) : (
      <Mic size={12} color={color.text.secondary} strokeWidth={2.2} />
    );

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {showNoteKind ? <TypeBadge color={color} icon={noteKindIcon} label={noteKindLabel} /> : null}
      {showMarks ? (
        <TypeBadge
          color={color}
          icon={<Bookmark size={12} color={color.text.secondary} strokeWidth={2.2} />}
          label={t('inbox.cardLayout.recordingMarks', { count: marksCount })}
        />
      ) : null}
    </View>
  );
});
