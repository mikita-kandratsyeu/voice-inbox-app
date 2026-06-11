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

export const PRO_AUTO_ORGANIZE_TEMPLATES: ReadonlySet<AutoOrganizeTemplate> = new Set([
  'work_personal_ideas',
  'projects',
  'meetings_tasks',
]);

export const PRO_AUTO_ORGANIZE_MODES: ReadonlySet<AutoOrganizeMode> = new Set([
  'assign_existing',
  'consolidate_folders',
  'suggest_archive',
]);

export const AUTO_ORGANIZE_INBOX_FOLDER_NAME = '__inbox__';

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

export type AutoOrganizeRunParams = {
  mode: AutoOrganizeMode;
  template?: AutoOrganizeTemplate;
};

export type AutoOrganizeRunResult =
  | {
      mode: 'full' | 'assign_existing';
      template: AutoOrganizeTemplate;
      data: AutoOrganizeFoldersResult;
    }
  | { mode: 'consolidate_folders'; data: AutoOrganizeConsolidateResult }
  | { mode: 'suggest_archive'; data: AutoOrganizeArchiveResult };

export function isAutoOrganizeMode(value: string): value is AutoOrganizeMode {
  return (AUTO_ORGANIZE_MODES as readonly string[]).includes(value);
}

export function isAutoOrganizeTemplate(value: string): value is AutoOrganizeTemplate {
  return (AUTO_ORGANIZE_TEMPLATES as readonly string[]).includes(value);
}

export function isProAutoOrganizeTemplate(template: AutoOrganizeTemplate): boolean {
  return PRO_AUTO_ORGANIZE_TEMPLATES.has(template);
}

export function isProAutoOrganizeMode(mode: AutoOrganizeMode): boolean {
  return PRO_AUTO_ORGANIZE_MODES.has(mode);
}

export function normalizeAutoOrganizeTemplate(
  template: AutoOrganizeTemplate | undefined,
): AutoOrganizeTemplate {
  return template ?? 'general';
}
