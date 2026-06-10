#!/usr/bin/env node
/**
 * Baseline Prisma Migrate on a database that was created with `db:push` (P3005).
 *
 * Marks selected migrations as already applied without running SQL, then optionally
 * runs `migrate deploy` for any remaining migrations (e.g. new indexes).
 *
 * Usage (from web/, with DIRECT_URL or DATABASE_URL in .env):
 *   yarn db:baseline
 *   yarn db:baseline -- --then-deploy
 *   yarn db:baseline -- --through 20260610120000_in_app_event_page --then-deploy
 *   yarn db:baseline -- --dry-run
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadEnv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(WEB_ROOT, 'prisma', 'migrations');

function loadWebEnv() {
  const webEnv = path.join(WEB_ROOT, '.env');
  if (existsSync(webEnv)) {
    loadEnv({ path: webEnv });
  }
  const rootEnv = path.resolve(WEB_ROOT, '..', '.env');
  if (existsSync(rootEnv)) {
    loadEnv({ path: rootEnv, override: false });
  }
}

loadWebEnv();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const thenDeploy = args.includes('--then-deploy');

function readArg(flag) {
  const i = args.indexOf(flag);
  if (i === -1 || i + 1 >= args.length) return null;
  return args[i + 1].trim();
}

const through = readArg('--through');
const except = readArg('--except');

function listMigrationNames() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  if (dryRun) return;
  execSync(cmd, { cwd: WEB_ROOT, stdio: 'inherit', env: process.env });
}

function main() {
  if (!dryRun && !process.env.DIRECT_URL?.trim() && !process.env.DATABASE_URL?.trim()) {
    const webEnv = path.join(WEB_ROOT, '.env');
    const rootEnv = path.resolve(WEB_ROOT, '..', '.env');
    console.error('Set DIRECT_URL (preferred) or DATABASE_URL in web/.env');
    console.error(`  looked for: ${webEnv}${existsSync(webEnv) ? ' (found)' : ''}`);
    console.error(`  and:      ${rootEnv}${existsSync(rootEnv) ? ' (found)' : ''}`);
    process.exit(1);
  }

  const all = listMigrationNames();
  if (all.length === 0) {
    console.error('No migrations found in prisma/migrations');
    process.exit(1);
  }

  let toMark = all;
  if (through) {
    const idx = all.indexOf(through);
    if (idx === -1) {
      console.error(`Unknown migration: ${through}`);
      process.exit(1);
    }
    toMark = all.slice(0, idx + 1);
  }
  if (except) {
    toMark = toMark.filter((name) => name !== except);
  }
  if (!through && !except) {
    // Default: mark all except the latest migration (assumes only the newest SQL is pending).
    toMark = all.slice(0, -1);
  }

  const pending = all.filter((name) => !toMark.includes(name));

  console.log('Prisma migrate baseline');
  console.log(`  migrations total: ${all.length}`);
  console.log(`  mark as applied:  ${toMark.length}`);
  console.log(
    `  leave pending:    ${pending.length}${pending.length ? ` → ${pending.join(', ')}` : ''}`,
  );
  if (dryRun) console.log('  (dry run — no changes)');

  for (const name of toMark) {
    run(`yarn prisma migrate resolve --applied ${JSON.stringify(name)}`);
  }

  if (thenDeploy) {
    if (pending.length === 0) {
      console.log('\nNo pending migrations after baseline.');
    } else {
      run('yarn prisma migrate deploy');
    }
  } else {
    console.log('\nDone. Run `yarn db:migrate` to apply pending migrations.');
  }
}

main();
