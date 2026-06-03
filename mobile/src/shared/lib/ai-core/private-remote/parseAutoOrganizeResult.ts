import { normalizeAutoOrganizeFolderColor } from '@/entities/folder/lib/autoOrganizeFolderColors';

export type AutoOrganizeFoldersResult = {
  folders: Array<{ name: string; icon: string; color: string }>;
  assignments: Array<{ recordId: string; folderName: string }>;
};

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

export function parseAutoOrganizeResult(rawContent: string): AutoOrganizeFoldersResult {
  const trimmed = rawContent.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const objectSlice = (() => {
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return withoutFences;
    return withoutFences.slice(start, end + 1);
  })();

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectSlice);
  } catch {
    throw new Error('Invalid AI response: malformed JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid AI response: expected object');
  }

  const obj = parsed as {
    folders?: Array<{ name?: unknown; icon?: unknown; color?: unknown }>;
    assignments?: Array<{ recordId?: unknown; folderName?: unknown }>;
  };

  if (!Array.isArray(obj.folders) || !Array.isArray(obj.assignments)) {
    throw new Error('Invalid AI response: missing folders or assignments');
  }

  const folderRows = obj.folders
    .map((f) => ({
      name: typeof f?.name === 'string' ? f.name.trim() : '',
      icon:
        typeof f?.icon === 'string' && ALLOWED_FOLDER_ICONS.has(f.icon.trim())
          ? f.icon.trim()
          : DEFAULT_AUTO_FOLDER_ICON,
      color: normalizeAutoOrganizeFolderColor(
        typeof f?.color === 'string' ? f.color : '',
      ).toLowerCase(),
    }))
    .filter((f) => Boolean(f.name));

  if (folderRows.length === 0) {
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

export function assertAutoOrganizeComplete(
  result: AutoOrganizeFoldersResult,
  expectedIds: string[],
): void {
  const expected = new Set(expectedIds);
  if (result.assignments.length !== expectedIds.length) {
    throw new Error('Invalid AI response: assignment count mismatch');
  }
  for (const { recordId } of result.assignments) {
    if (!expected.has(recordId)) {
      throw new Error('Invalid AI response: unexpected recordId in assignments');
    }
  }
}

export function isAutoOrganizeParseFailure(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('Invalid AI response') || err.message.includes('malformed JSON'))
  );
}
