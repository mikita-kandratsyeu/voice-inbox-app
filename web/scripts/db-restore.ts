import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import 'dotenv/config';

import { getDirectDatabaseUrl } from '../lib/direct-database-url';

function pgBin(name: string): string {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim();
  } catch {
    const candidates = [`/opt/homebrew/opt/libpq/bin/${name}`, `/usr/local/opt/libpq/bin/${name}`];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
    throw new Error(`Missing ${name}. Install: brew install libpq && brew link --force libpq`);
  }
}

const dumpPath = process.argv[2];
if (!dumpPath) {
  throw new Error('Usage: yarn db:restore <path-to-backup.dump>');
}

const abs = resolve(process.cwd(), dumpPath);
if (!existsSync(abs)) {
  throw new Error(`File not found: ${abs}`);
}

const url = getDirectDatabaseUrl();

const pgRestore = pgBin('pg_restore');
// --no-owner --no-acl: safe when restoring to another host (e.g. Neon → Supabase).
execFileSync(pgRestore, ['--clean', '--if-exists', '--no-owner', '--no-acl', '-d', url, abs], {
  stdio: 'inherit',
});

console.log(`Restored from: ${abs}`);
