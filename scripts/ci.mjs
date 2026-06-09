#!/usr/bin/env node
/**
 * Run the same checks as .github/workflows/ci.yml locally.
 *
 * Usage:
 *   node scripts/ci.mjs
 *   ./scripts/ci.mjs
 *   node scripts/ci.mjs --skip-install
 *   node scripts/ci.mjs --only web
 *   node scripts/ci.mjs --only mobile,telegram-bot
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const WEB_DATABASE_URL =
  'postgresql://ci:ci@127.0.0.1:5432/ci?schema=public';

const PROJECTS = {
  mobile: {
    dir: 'mobile',
    steps: [
      { name: 'Lint', command: 'yarn lint' },
      { name: 'Format check', command: 'yarn format:check' },
      { name: 'Typecheck', command: 'yarn type:check' },
      { name: 'Test', command: 'yarn test --ci --forceExit' },
    ],
  },
  web: {
    dir: 'web',
    steps: [
      { name: 'Lint', command: 'yarn lint' },
      {
        name: 'Typecheck',
        command: 'yarn type:check',
        env: { DATABASE_URL: WEB_DATABASE_URL },
      },
      { name: 'Test', command: 'yarn test --ci --forceExit' },
    ],
  },
  'telegram-bot': {
    dir: 'telegram-bot',
    steps: [
      { name: 'Lint', command: 'yarn lint' },
      { name: 'Typecheck', command: 'yarn type:check' },
      { name: 'Test', command: 'yarn test --ci --forceExit' },
    ],
  },
};

function parseArgs(argv) {
  let skipInstall = false;
  let only = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skip-install') {
      skipInstall = true;
      continue;
    }
    if (arg === '--only') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --only (e.g. web or mobile,web)');
      }
      only = value.split(',').map((part) => part.trim()).filter(Boolean);
      i += 1;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (only) {
    for (const name of only) {
      if (!PROJECTS[name]) {
        throw new Error(
          `Unknown project "${name}". Expected: ${Object.keys(PROJECTS).join(', ')}`,
        );
      }
    }
  }

  return { skipInstall, only: only ?? Object.keys(PROJECTS) };
}

function printHelp() {
  console.log(`Usage: node scripts/ci.mjs [options]

Options:
  --skip-install   Skip yarn install --immutable
  --only <names>   Comma-separated list: mobile, web, telegram-bot
  -h, --help       Show this help
`);
}

function run(command, cwd, env = {}) {
  execSync(command, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
}

function main() {
  const { skipInstall, only } = parseArgs(process.argv.slice(2));

  console.log('→ Enabling Corepack');
  run('corepack enable', REPO_ROOT);

  for (const name of only) {
    const project = PROJECTS[name];
    const cwd = path.join(REPO_ROOT, project.dir);

    console.log(`\n=== ${name} ===`);

    if (!skipInstall) {
      console.log(`→ [${name}] Install dependencies`);
      run('yarn install --immutable', cwd);
    }

    for (const step of project.steps) {
      console.log(`→ [${name}] ${step.name}`);
      run(step.command, cwd, step.env);
    }
  }

  console.log('\n✓ CI checks passed');
}

try {
  main();
} catch (error) {
  const message =
    error && typeof error === 'object' && 'status' in error
      ? `Command failed with exit code ${error.status}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(`\n✗ ${message}`);
  process.exit(1);
}
