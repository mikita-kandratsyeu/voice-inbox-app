import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import type { Folder } from '@/entities/folder';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore, type VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';

import { useRecordBacklinks } from '../model/useRecordBacklinks';
import { LinkNoteAddRow } from './LinkNoteAddRow';
import { NoteLinkRow } from './NoteLinkRow';

type RecordLinksSectionProps = {
  record: VoiceRecord;
  color: Colors;
  onLinkNote: () => void;
  onUnlinkNote: (targetId: string) => void;
};

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

function LinkSectionBlock({
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
}

export function RecordLinksSection({
  record,
  color,
  onLinkNote,
  onUnlinkNote,
}: RecordLinksSectionProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const folders = useFolderStore(useShallow((s) => s.folders));
  const records = useRecordStore(useShallow((s) => s.records));
  const backlinkIds = useRecordBacklinks(record.id);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const recordById = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  const linkedRecords = useMemo(() => {
    const ids = record.linkedRecordIds ?? [];
    return ids.map((id) => recordById.get(id)).filter((item): item is VoiceRecord => item != null);
  }, [record.linkedRecordIds, recordById]);

  const backlinkRecords = useMemo(
    () =>
      backlinkIds
        .map((id) => recordById.get(id))
        .filter((item): item is VoiceRecord => item != null),
    [backlinkIds, recordById],
  );

  const canLink = record.status !== 'archived';
  const showLinkedSection = canLink || linkedRecords.length > 0;

  if (!showLinkedSection && !backlinkRecords.length) return null;

  const handleOpen = (target: VoiceRecord) => {
    navigation.push('RecordingDetail', { record: target });
  };

  return (
    <View style={{ gap: 14, marginTop: 8 }}>
      {showLinkedSection ? (
        <LinkSectionBlock
          title={t('noteLinks.linked')}
          records={linkedRecords}
          folderById={folderById}
          color={color}
          onOpen={handleOpen}
          onUnlink={onUnlinkNote}
          canAdd={canLink}
          onAdd={onLinkNote}
        />
      ) : null}

      <LinkSectionBlock
        title={t('noteLinks.backlinks')}
        records={backlinkRecords}
        folderById={folderById}
        color={color}
        onOpen={handleOpen}
      />
    </View>
  );
}
