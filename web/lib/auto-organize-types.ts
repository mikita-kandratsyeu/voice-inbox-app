export const AUTO_ORGANIZE_MODES = [
  'full',
  'assign_existing',
  'consolidate_folders',
  'suggest_archive',
] as const;

export type AutoOrganizeMode = (typeof AUTO_ORGANIZE_MODES)[number];

export const AUTO_ORGANIZE_TEMPLATES = [
  'general',
  'work_personal_ideas',
  'projects',
  'meetings_tasks',
] as const;

export type AutoOrganizeTemplate = (typeof AUTO_ORGANIZE_TEMPLATES)[number];

export const AUTO_ORGANIZE_INBOX_FOLDER_NAME = '__inbox__';

/** Weekly AI credits reserved per auto-organize run (keep in sync with mobile). */
export const AUTO_ORGANIZE_CHARGED_USAGE_UNITS = 2;

export type AutoOrganizeFoldersResult = {
  folders: Array<{ name: string; icon: string; color: string }>;
  assignments: Array<{ recordId: string; folderName: string }>;
};

export type AutoOrganizeFolderMerge = {
  sourceFolderNames: string[];
  targetFolderName: string;
  targetIcon: string;
  targetColor: string;
};

export type AutoOrganizeConsolidateResult = {
  merges: AutoOrganizeFolderMerge[];
  deleteEmptyFolderNames: string[];
};

export type AutoOrganizeArchiveSuggestion = {
  recordId: string;
  reason: string;
};

export type AutoOrganizeArchiveResult = {
  archiveSuggestions: AutoOrganizeArchiveSuggestion[];
};

export function isAutoOrganizeMode(value: string): value is AutoOrganizeMode {
  return (AUTO_ORGANIZE_MODES as readonly string[]).includes(value);
}

export function isAutoOrganizeTemplate(value: string): value is AutoOrganizeTemplate {
  return (AUTO_ORGANIZE_TEMPLATES as readonly string[]).includes(value);
}

export function normalizeAutoOrganizeTemplate(
  template: AutoOrganizeTemplate | undefined,
): AutoOrganizeTemplate {
  return template ?? 'general';
}
