import {
  buildPrivateRemoteJsonSchemaResponseFormat,
  resolveAutoOrganizeSchemaKind,
} from '../private-remote/privateRemoteResponseFormat';

function collectTypeFields(value: unknown, path = '$'): string[] {
  if (!value || typeof value !== 'object') return [];
  const issues: string[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      issues.push(...collectTypeFields(value[i], `${path}[${i}]`));
    }
    return issues;
  }
  const record = value as Record<string, unknown>;
  if ('type' in record && Array.isArray(record.type)) {
    issues.push(`${path}.type is a union array`);
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === 'type') continue;
    issues.push(...collectTypeFields(child, `${path}.${key}`));
  }
  return issues;
}

describe('buildPrivateRemoteJsonSchemaResponseFormat', () => {
  it('uses only string JSON Schema type fields (LM Studio / outlines)', () => {
    const format = buildPrivateRemoteJsonSchemaResponseFormat('summary');
    const schema = (format.json_schema as { schema: unknown }).schema;
    expect(collectTypeFields(schema)).toEqual([]);
  });

  it('declares task deadline as string', () => {
    const format = buildPrivateRemoteJsonSchemaResponseFormat('summary');
    const schema = (format.json_schema as { schema: Record<string, unknown> }).schema;
    const tasks = (schema.properties as Record<string, unknown>).tasks as {
      items: { properties: { deadline: { type: string } } };
    };
    expect(tasks.items.properties.deadline.type).toBe('string');
  });

  it('digest schema uses only string JSON Schema type fields', () => {
    const format = buildPrivateRemoteJsonSchemaResponseFormat('digest');
    const schema = (format.json_schema as { schema: unknown }).schema;
    expect(collectTypeFields(schema)).toEqual([]);
  });

  it('archive organize schema requires archiveSuggestions only', () => {
    const kind = resolveAutoOrganizeSchemaKind('suggest_archive');
    expect(kind).toBe('auto_organize_archive');
    const format = buildPrivateRemoteJsonSchemaResponseFormat(kind);
    const schema = (format.json_schema as { schema: Record<string, unknown> }).schema;
    expect((schema.required as string[]) ?? []).toEqual(['archiveSuggestions']);
    expect(schema.properties).toHaveProperty('archiveSuggestions');
    expect(schema.properties).not.toHaveProperty('folders');
  });

  it('consolidate organize schema requires merges and deleteEmptyFolderNames', () => {
    const kind = resolveAutoOrganizeSchemaKind('consolidate_folders');
    expect(kind).toBe('auto_organize_consolidate');
    const format = buildPrivateRemoteJsonSchemaResponseFormat(kind);
    const schema = (format.json_schema as { schema: Record<string, unknown> }).schema;
    expect((schema.required as string[]) ?? []).toEqual(['merges', 'deleteEmptyFolderNames']);
  });

  it('ask schema exposes interpretations for private remote structured output', () => {
    const format = buildPrivateRemoteJsonSchemaResponseFormat('ask');
    const schema = (format.json_schema as { schema: Record<string, unknown> }).schema;
    const properties = schema.properties as Record<string, unknown>;
    expect(properties).toHaveProperty('answer');
    expect(properties).toHaveProperty('interpretations');
    expect(properties).toHaveProperty('evidence');
    expect(properties).toHaveProperty('suggestedFollowUps');
    expect(collectTypeFields(schema)).toEqual([]);
  });
});
