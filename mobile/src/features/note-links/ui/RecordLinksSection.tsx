import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@/app/navigation/types';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore, type VoiceRecord } from '@/entities/record';
import type { Colors } from '@/shared/config';

import { useRecordBacklinks } from '../model/useRecordBacklinks';
import { LinkSectionBlock } from './LinkSectionBlock';

type RecordLinksSectionProps = {
  record: VoiceRecord;
  color: Colors;
  onLinkNote: () => void;
  onUnlinkNote: (targetId: string) => void;
};

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

  const handleOpen = useCallback(
    (target: VoiceRecord) => {
      navigation.push('RecordingDetail', { record: target });
    },
    [navigation],
  );

  if (!showLinkedSection && !backlinkRecords.length) return null;

  return (
    <View style={{ gap: 18 }}>
      {showLinkedSection && (
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
      )}

      {backlinkRecords.length > 0 && (
        <LinkSectionBlock
          title={t('noteLinks.backlinks')}
          records={backlinkRecords}
          folderById={folderById}
          color={color}
          onOpen={handleOpen}
        />
      )}
    </View>
  );
}
