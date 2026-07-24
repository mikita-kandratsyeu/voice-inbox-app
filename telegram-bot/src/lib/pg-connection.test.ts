import { normalizePgConnectionString, normalizePostgresConnectionUrl } from './pg-connection.js';

describe('normalizePostgresConnectionUrl', () => {
  it('encodes special characters in password', () => {
    const url = 'postgresql://postgres:pa@ss^word@db.example.com:5432/postgres';
    expect(normalizePostgresConnectionUrl(url)).toBe(
      'postgresql://postgres:pa%40ss%5Eword@db.example.com:5432/postgres',
    );
  });
});

describe('normalizePgConnectionString', () => {
  it('adds sslmode=require for Supabase hosts', () => {
    const url =
      'postgresql://postgres.ref:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const normalized = normalizePgConnectionString(url)!;
    const parsed = new URL(normalized);
    expect(parsed.searchParams.get('sslmode')).toBe('require');
    expect(parsed.searchParams.get('uselibpqcompat')).toBe('true');
  });

  it('adds uselibpqcompat for explicit sslmode=require', () => {
    const url = 'postgresql://user:pass@db.example.com:5432/postgres?sslmode=require';
    const normalized = normalizePgConnectionString(url)!;
    const parsed = new URL(normalized);
    expect(parsed.searchParams.get('uselibpqcompat')).toBe('true');
  });
});
