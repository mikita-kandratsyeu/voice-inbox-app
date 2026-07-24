import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';

export type ShareExportContext = {
  folderNameById?: Record<string, string>;
  /** Linked follow-up note titles for task outcome export. */
  recordTitleById?: Record<string, string>;
  /** Omit note metadata and duplicate title — used for HTML/plain email bodies. */
  forEmail?: boolean;
  /** In-app full-note document: section markers, no footer/record id. */
  forDocument?: boolean;
};

function buildFolderNameById(): Record<string, string> {
  const folders = useFolderStore.getState().folders;
  const folderNameById: Record<string, string> = {};
  for (const f of folders) {
    folderNameById[f.id] = f.name;
  }
  return folderNameById;
}

function buildRecordTitleById(): Record<string, string> {
  const records = useRecordStore.getState().records;
  const recordTitleById: Record<string, string> = {};
  for (const record of records) {
    recordTitleById[record.id] = record.title;
  }
  return recordTitleById;
}

export function resolveShareExportContext(override?: ShareExportContext): ShareExportContext {
  const folderNameById = override?.folderNameById ?? buildFolderNameById();
  const recordTitleById = override?.recordTitleById ?? buildRecordTitleById();
  return {
    ...override,
    folderNameById,
    recordTitleById,
  };
}
