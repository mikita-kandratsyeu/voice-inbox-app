import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { RecordLinksSection, useRecordBacklinks } from '@/features/note-links';
import { useRelatedNotes } from '@/features/related-notes';
import type { Colors } from '@/shared/config';

import { RelatedNotesSection } from './RelatedNotesSection';

type RecordNeighborSectionsProps = {
  record: VoiceRecord;
  color: Colors;
  onLinkNote: () => void;
  onUnlinkNote: (targetId: string) => void;
  onLinkRelatedNote: (targetId: string) => void;
};

export function RecordNeighborSections({
  record,
  color,
  onLinkNote,
  onUnlinkNote,
  onLinkRelatedNote,
}: RecordNeighborSectionsProps) {
  const records = useRecordStore(useShallow((s) => s.records));
  const backlinkIds = useRecordBacklinks(record.id);

  const hasBacklinkRecords = useMemo(() => {
    const recordById = new Map(records.map((item) => [item.id, item]));
    return backlinkIds.some((id) => recordById.has(id));
  }, [backlinkIds, records]);

  const canLink = record.status !== 'archived';
  const showLinkedSection = canLink || (record.linkedRecordIds?.length ?? 0) > 0;
  const showLinksSection = showLinkedSection || hasBacklinkRecords;

  const excludeRecordIds = useMemo(
    () => [...(record.linkedRecordIds ?? []), ...backlinkIds],
    [backlinkIds, record.linkedRecordIds],
  );
  const relatedNotes = useRelatedNotes(record.id, 5, excludeRecordIds);
  const showRelatedSection = relatedNotes.length > 0;

  if (!showLinksSection && !showRelatedSection) {
    return null;
  }

  return (
    <View style={{ gap: 18, marginTop: 12 }}>
      {showLinksSection ? (
        <RecordLinksSection
          record={record}
          color={color}
          onLinkNote={onLinkNote}
          onUnlinkNote={onUnlinkNote}
        />
      ) : null}
      {showRelatedSection ? (
        <RelatedNotesSection
          recordId={record.id}
          color={color}
          linkedRecordIds={record.linkedRecordIds ?? []}
          canLink={canLink}
          onLinkToRecord={onLinkRelatedNote}
        />
      ) : null}
    </View>
  );
}
