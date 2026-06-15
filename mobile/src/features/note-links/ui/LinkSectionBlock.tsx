import React, { memo } from 'react';
import { Text, View } from 'react-native';

import type { Folder } from '@/entities/folder';
import type { VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';

import { LinkNoteAddRow } from './LinkNoteAddRow';
import { NoteLinkRow } from './NoteLinkRow';

type LinkSectionBlockProps = {
  title: string;
  records: VoiceRecord[];
  folderById: Map<string, Folder>;
  color: Colors;
  onOpen: (record: VoiceRecord) => void;
  onUnlink?: (recordId: string) => void;
  canAdd?: boolean;
  onAdd?: () => void;
};

export const LinkSectionBlock = memo(function LinkSectionBlock({
  title,
  records,
  folderById,
  color,
  onOpen,
  onUnlink,
  canAdd = false,
  onAdd,
}: LinkSectionBlockProps) {
  if (records.length === 0 && !canAdd) return null;

  const showAddRow = canAdd && onAdd;

  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          color: color.text.secondary,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.6,
          paddingHorizontal: 2,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: color.background.card,
          borderColor: color.border.default,
          borderRadius: 12,
          borderWidth: 1,
          overflow: 'hidden',
        }}
      >
        {records.map((linkedRecord, index) => (
          <NoteLinkRow
            key={linkedRecord.id}
            record={linkedRecord}
            folder={linkedRecord.folderId ? (folderById.get(linkedRecord.folderId) ?? null) : null}
            color={color}
            isLast={!showAddRow && index === records.length - 1}
            onPress={() => onOpen(linkedRecord)}
            onUnlink={onUnlink ? () => onUnlink(linkedRecord.id) : undefined}
          />
        ))}
        {showAddRow ? (
          <LinkNoteAddRow color={color} hasLinks={records.length > 0} isLast onPress={onAdd} />
        ) : null}
      </View>
    </View>
  );
});
