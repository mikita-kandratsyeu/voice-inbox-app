import {
  AUTO_ORGANIZE_INBOX_FOLDER_NAME,
  type AutoOrganizeArchiveResult,
  type AutoOrganizeConsolidateResult,
  type AutoOrganizeFoldersResult,
  type AutoOrganizeMode,
} from '@/lib/auto-organize-types';
import { normalizeAutoOrganizeFolderColor } from '@/lib/folder-accent-colors';

const ALLOWED_FOLDER_ICONS = new Set([
  'briefcase',
  'home',
  'lightbulb',
  'music',
  'star',
  'heart',
  'plane',
  'rocket',
  'palette',
  'flame',
  'globe',
  'graduation',
]);

const DEFAULT_AUTO_FOLDER_ICON = 'briefcase';

function extractJsonObject(rawContent: string): unknown {
  const trimmed = rawContent.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const objectSlice = (() => {
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return withoutFences;
    return withoutFences.slice(start, end + 1);
  })();

  try {
    return JSON.parse(objectSlice);
  } catch {
    throw new Error('Invalid AI response: malformed JSON');
  }
}

function normalizeFolderIcon(icon: unknown): string {
  return typeof icon === 'string' && ALLOWED_FOLDER_ICONS.has(icon.trim())
    ? icon.trim()
    : DEFAULT_AUTO_FOLDER_ICON;
}

function normalizeFolderColor(color: unknown): string {
  return normalizeAutoOrganizeFolderColor(typeof color === 'string' ? color : '').toLowerCase();
}

export function parseAutoOrganizeFoldersResult(
  rawContent: string,
  mode: AutoOrganizeMode = 'full',
): AutoOrganizeFoldersResult {
  const parsed = extractJsonObject(rawContent);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as {
    folders?: Array<{ name?: unknown; icon?: unknown; color?: unknown }>;
    assignments?: Array<{ recordId?: unknown; folderName?: unknown }>;
  };

  if (!Array.isArray(obj.assignments)) {
    throw new Error('Invalid AI response: missing assignments');
  }

  if (mode === 'assign_existing') {
    if (!Array.isArray(obj.folders) || obj.folders.length > 0) {
      throw new Error('Invalid AI response: assign_existing requires empty folders');
    }
  } else if (!Array.isArray(obj.folders)) {
    throw new Error('Invalid AI response: missing folders');
  }

  const folderRows =
    mode === 'assign_existing'
      ? []
      : (obj.folders ?? [])
          .map((f) => ({
            name: typeof f?.name === 'string' ? f.name.trim() : '',
            icon: normalizeFolderIcon(f?.icon),
            color: normalizeFolderColor(f?.color),
          }))
          .filter((f) => Boolean(f.name));

  if (mode !== 'assign_existing' && folderRows.length === 0) {
    throw new Error('Invalid AI response: no valid folders');
  }

  const canonicalByLower = new Map<string, (typeof folderRows)[0]>();
  for (const f of folderRows) {
    const k = f.name.toLowerCase();
    if (!canonicalByLower.has(k)) {
      canonicalByLower.set(k, f);
    }
  }
  const folders = [...canonicalByLower.values()];

  const seenRecordIds = new Set<string>();
  const assignments: AutoOrganizeFoldersResult['assignments'] = [];

  for (const raw of obj.assignments) {
    const recordId = typeof raw?.recordId === 'string' ? raw.recordId.trim() : '';
    const folderName = typeof raw?.folderName === 'string' ? raw.folderName.trim() : '';
    if (!recordId) {
      throw new Error('Invalid AI response: assignment with empty recordId');
    }
    if (seenRecordIds.has(recordId)) {
      throw new Error('Invalid AI response: duplicate recordId in assignments');
    }
    seenRecordIds.add(recordId);
    if (!folderName) {
      throw new Error('Invalid AI response: assignment with empty folderName');
    }

    if (mode === 'assign_existing') {
      assignments.push({ recordId, folderName });
      continue;
    }

    const canon = canonicalByLower.get(folderName.toLowerCase());
    if (!canon) {
      throw new Error(`Invalid AI response: unknown folder in assignment: ${folderName}`);
    }
    assignments.push({ recordId, folderName: canon.name });
  }

  if (assignments.length === 0) {
    throw new Error('Invalid AI response: no valid assignments');
  }

  return { folders, assignments };
}

export function parseAutoOrganizeConsolidateResult(
  rawContent: string,
): AutoOrganizeConsolidateResult {
  const parsed = extractJsonObject(rawContent);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as {
    merges?: Array<{
      sourceFolderNames?: unknown;
      targetFolderName?: unknown;
      targetIcon?: unknown;
      targetColor?: unknown;
    }>;
    deleteEmptyFolderNames?: unknown;
  };

  if (!Array.isArray(obj.merges)) {
    throw new Error('Invalid AI response: missing merges');
  }

  const merges = obj.merges
    .map((m) => {
      const sourceFolderNames = Array.isArray(m?.sourceFolderNames)
        ? m.sourceFolderNames
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
            .map((n) => n.trim())
        : [];
      const targetFolderName =
        typeof m?.targetFolderName === 'string' ? m.targetFolderName.trim() : '';
      if (sourceFolderNames.length === 0 || !targetFolderName) return null;
      return {
        sourceFolderNames,
        targetFolderName,
        targetIcon: normalizeFolderIcon(m?.targetIcon),
        targetColor: normalizeFolderColor(m?.targetColor),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m != null);

  const deleteEmptyFolderNames = Array.isArray(obj.deleteEmptyFolderNames)
    ? obj.deleteEmptyFolderNames
        .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
        .map((n) => n.trim())
    : [];

  return { merges, deleteEmptyFolderNames };
}

export function parseAutoOrganizeArchiveResult(rawContent: string): AutoOrganizeArchiveResult {
  const parsed = extractJsonObject(rawContent);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as {
    archiveSuggestions?: Array<{ recordId?: unknown; reason?: unknown }>;
  };

  if (!Array.isArray(obj.archiveSuggestions)) {
    throw new Error('Invalid AI response: missing archiveSuggestions');
  }

  const seen = new Set<string>();
  const archiveSuggestions = obj.archiveSuggestions
    .map((s) => {
      const recordId = typeof s?.recordId === 'string' ? s.recordId.trim() : '';
      const reason = typeof s?.reason === 'string' ? s.reason.trim() : '';
      if (!recordId || !reason || seen.has(recordId)) return null;
      seen.add(recordId);
      return { recordId, reason };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  return { archiveSuggestions };
}

export type AutoOrganizeParsedResult =
  | AutoOrganizeFoldersResult
  | AutoOrganizeConsolidateResult
  | AutoOrganizeArchiveResult;

export function parseAutoOrganizeResultForMode(
  rawContent: string,
  mode: AutoOrganizeMode,
): AutoOrganizeParsedResult {
  if (mode === 'consolidate_folders') {
    return parseAutoOrganizeConsolidateResult(rawContent);
  }
  if (mode === 'suggest_archive') {
    return parseAutoOrganizeArchiveResult(rawContent);
  }
  return parseAutoOrganizeFoldersResult(rawContent, mode);
}

export function assertAutoOrganizeFoldersComplete(
  result: AutoOrganizeFoldersResult,
  expectedIds: string[],
  mode: AutoOrganizeMode = 'full',
): void {
  if (expectedIds.length === 0) return;

  if (mode === 'full' && (result.folders.length < 3 || result.folders.length > 8)) {
    throw new Error(`Invalid AI response: folders must be 3-8, got ${result.folders.length}`);
  }

  const expected = new Set(expectedIds);
  const got = new Set(result.assignments.map((a) => a.recordId));

  if (got.size !== result.assignments.length) {
    throw new Error('Invalid AI response: duplicate recordId in assignments');
  }

  if (got.size !== expected.size) {
    throw new Error(`Invalid AI response: expected ${expected.size} assignments, got ${got.size}`);
  }

  for (const id of expected) {
    if (!got.has(id)) {
      throw new Error('Invalid AI response: missing assignment for note id');
    }
  }

  for (const id of got) {
    if (!expected.has(id)) {
      throw new Error('Invalid AI response: unexpected recordId in assignments');
    }
  }

  if (mode === 'assign_existing') {
    for (const a of result.assignments) {
      if (
        a.folderName !== AUTO_ORGANIZE_INBOX_FOLDER_NAME &&
        result.folders.some((f) => f.name === a.folderName)
      ) {
        continue;
      }
    }
  }
}

export function assertAutoOrganizeArchiveComplete(
  result: AutoOrganizeArchiveResult,
  expectedIds: string[],
): void {
  const expected = new Set(expectedIds);
  for (const { recordId } of result.archiveSuggestions) {
    if (!expected.has(recordId)) {
      throw new Error('Invalid AI response: unexpected recordId in archiveSuggestions');
    }
  }
}

export function isAutoOrganizeParseFailure(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('Invalid AI response') || err.message.includes('malformed JSON'))
  );
}
