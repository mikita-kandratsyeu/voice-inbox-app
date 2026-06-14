import type { Folder } from '@/entities/folder/model/types';
import type { RecordListItem } from '@/entities/record';
import { AllTasksNotePickerSheet } from '@/screens/all-tasks/ui/AllTasksNotePickerSheet';

type LinkNotePickerSheetProps = {
  visible: boolean;
  records: RecordListItem[];
  folders: Folder[];
  sourceRecordId: string;
  linkedRecordIds: string[];
  onClose: () => void;
  onSelect: (recordId: string) => void;
};

export function LinkNotePickerSheet({
  visible,
  records,
  folders,
  sourceRecordId,
  linkedRecordIds,
  onClose,
  onSelect,
}: LinkNotePickerSheetProps) {
  const linkedSet = new Set(linkedRecordIds);
  const pickableRecords = records.filter(
    (record) =>
      record.id !== sourceRecordId && record.status !== 'archived' && !linkedSet.has(record.id),
  );

  return (
    <AllTasksNotePickerSheet
      visible={visible}
      records={pickableRecords}
      folders={folders}
      onClose={onClose}
      onSelect={onSelect}
      titleKey="noteLinks.pickNoteTitle"
      subtitleKey="noteLinks.pickNoteSubtitle"
      searchPlaceholderKey="noteLinks.pickNoteSearchPlaceholder"
      emptyKey="noteLinks.pickNoteEmpty"
      searchEmptyKey="noteLinks.pickNoteSearchEmpty"
    />
  );
}
