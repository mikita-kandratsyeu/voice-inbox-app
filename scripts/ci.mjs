#!/usr/bin/env node
/**
 * Full monorepo CI via Turborepo (format, lint, typecheck, build, test).
 *
 * Usage:
 *   node scripts/ci.mjs
 *   node scripts/ci.mjs --affected
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exit } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CI_DATABASE_URL = 'postgresql://ci:ci@127.0.0.1:5432/ci?schema=public';
const affected = process.argv.includes('--affected');

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? CI_DATABASE_URL,
  CI: process.env.CI ?? 'true',
};

function run(command) {
  console.log(`\n> ${command}\n`);
  execSync(command, { cwd: REPO_ROOT, env, stdio: 'inherit' });
}

const filter = affected ? ' --filter=...[origin/main]' : '';

try {
  run(`yarn turbo run format:check lint type:check build${filter}`);
  run(`yarn turbo run test${filter} -- --ci --forceExit`);
} catch {
  exit(1);
}
