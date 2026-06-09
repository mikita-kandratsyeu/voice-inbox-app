#!/usr/bin/env node
/**
 * Build a markdown PR comment from collected ci-metrics/*.json artifacts.
 *
 * Usage (from repo root):
 *   node scripts/ci-pr-summary.mjs > pr-summary.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const METRICS_DIR = path.join(REPO_ROOT, 'ci-metrics');

const APPS = [
  {
    id: 'mobile',
    label: 'Mobile',
    jobResultEnv: 'JOB_MOBILE_RESULT',
    hasFormat: true,
  },
  {
    id: 'web',
    label: 'Web',
    jobResultEnv: 'JOB_WEB_RESULT',
    hasFormat: false,
  },
  {
    id: 'telegram-bot',
    label: 'Telegram bot',
    jobResultEnv: 'JOB_TELEGRAM_BOT_RESULT',
    hasFormat: true,
  },
];

function readReport(appId) {
  const filePath = path.join(METRICS_DIR, `${appId}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function stepIcon(outcome) {
  switch (outcome) {
    case 'success':
      return '✅';
    case 'failure':
      return '❌';
    case 'skipped':
      return '⏭️';
    case 'cancelled':
      return '🚫';
    default:
      return '—';
  }
}

function formatCoverage(coverage) {
  if (!coverage || coverage.lines == null) {
    return '—';
  }
  const lines = `${coverage.lines.toFixed(1)}%`;
  const branches =
    coverage.branches != null ? ` (${coverage.branches.toFixed(1)}% branches)` : '';
  return `${lines}${branches}`;
}

function formatTests(tests) {
  if (!tests) {
    return '—';
  }
  if (tests.failed > 0) {
    return `${tests.passed}/${tests.total} (${tests.failed} failed)`;
  }
  return `${tests.passed}/${tests.total}`;
}

function jobIcon(result) {
  switch (result) {
    case 'success':
      return '✅';
    case 'failure':
      return '❌';
    case 'cancelled':
      return '🚫';
    case 'skipped':
      return '⏭️';
    default:
      return '—';
  }
}

const runUrl = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
  'actions',
  'runs',
  process.env.GITHUB_RUN_ID,
]
  .filter(Boolean)
  .join('/');

const shortSha = (process.env.GITHUB_SHA ?? '').slice(0, 7);

const lines = [
  '## CI summary',
  '',
  `Workflow run: [${shortSha || 'view'}](${runUrl || '#'})`,
  '',
  '| App | Job | Tests | Coverage (lines) | Lint | Format | Types |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];

for (const app of APPS) {
  const report = readReport(app.id);
  const jobResult = process.env[app.jobResultEnv] ?? 'unknown';

  if (!report) {
    const formatCell = app.hasFormat ? '—' : 'n/a';
    lines.push(
      `| ${app.label} | ${jobIcon(jobResult)} | — | — | — | ${formatCell} | — |`,
    );
    continue;
  }

  const formatCell = app.hasFormat
    ? stepIcon(report.steps.format)
    : 'n/a';

  lines.push(
    `| ${app.label} | ${jobIcon(jobResult)} | ${formatTests(report.tests)} | ${formatCoverage(report.coverage)} | ${stepIcon(report.steps.lint)} | ${formatCell} | ${stepIcon(report.steps.typecheck)} |`,
  );
}

lines.push('', '_Updated on each push to this PR._');

process.stdout.write(`${lines.join('\n')}\n`);
