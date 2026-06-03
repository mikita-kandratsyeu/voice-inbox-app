import { buildPrivateRemoteJsonSchemaResponseFormat } from '../private-remote/privateRemoteResponseFormat';

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
});
