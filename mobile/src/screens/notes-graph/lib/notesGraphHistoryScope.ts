export type NotesGraphHistoryScope = { kind: 'global' } | { kind: 'local'; focusRecordId: string };

export function buildNotesGraphHistoryScopePrefix(scope: NotesGraphHistoryScope): string {
  if (scope.kind === 'global') return 'global';
  return `local:${scope.focusRecordId}`;
}

export function parseNotesGraphHistoryScopePrefix(prefix: string): NotesGraphHistoryScope | null {
  if (prefix === 'global') return { kind: 'global' };
  if (prefix.startsWith('local:')) {
    const focusRecordId = prefix.slice('local:'.length);
    if (!focusRecordId) return null;
    return { kind: 'local', focusRecordId };
  }
  return null;
}

export function stripNotesGraphHistoryScopeFromLayoutKey(layoutKey: string): {
  scope: NotesGraphHistoryScope;
  bodyKey: string;
} {
  const semicolon = layoutKey.indexOf(';');
  if (semicolon === -1) {
    return { scope: { kind: 'global' }, bodyKey: layoutKey };
  }

  const prefix = layoutKey.slice(0, semicolon);
  const parsedScope = parseNotesGraphHistoryScopePrefix(prefix);
  if (!parsedScope) {
    return { scope: { kind: 'global' }, bodyKey: layoutKey };
  }

  return { scope: parsedScope, bodyKey: layoutKey.slice(semicolon + 1) };
}

export function matchesNotesGraphHistoryScope(
  layoutKey: string,
  scope: NotesGraphHistoryScope,
): boolean {
  const { scope: keyScope } = stripNotesGraphHistoryScopeFromLayoutKey(layoutKey);
  if (scope.kind === 'global' && keyScope.kind === 'global') return true;
  if (scope.kind === 'local' && keyScope.kind === 'local') {
    return scope.focusRecordId === keyScope.focusRecordId;
  }
  return false;
}

/** Scoped key first, then legacy body-only key saved before scope prefixes existed. */
export function resolveLayoutKeyLookupCandidates(layoutKey: string): string[] {
  const { bodyKey } = stripNotesGraphHistoryScopeFromLayoutKey(layoutKey);
  if (bodyKey === layoutKey) return [layoutKey];
  return [layoutKey, bodyKey];
}
