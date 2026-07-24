import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

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

const url = getDirectDatabaseUrl();

const backupsDir = join(process.cwd(), 'backups');
if (!existsSync(backupsDir)) {
  mkdirSync(backupsDir, { recursive: true });
}

const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
const outFile = join(backupsDir, `backup-${stamp}.dump`);

const pgDump = pgBin('pg_dump');
execFileSync(pgDump, ['-Fc', '-f', outFile, url], { stdio: 'inherit' });

console.log(`Backup written: ${outFile}`);
