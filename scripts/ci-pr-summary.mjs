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
    icon: '📱',
    jobResultEnv: 'JOB_MOBILE_RESULT',
    hasFormat: true,
  },
  {
    id: 'web',
    label: 'Web',
    icon: '🌐',
    jobResultEnv: 'JOB_WEB_RESULT',
    hasFormat: false,
  },
  {
    id: 'telegram-bot',
    label: 'Telegram Bot',
    icon: '🤖',
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

function stepGate(name, outcome) {
  switch (outcome) {
    case 'success':
      return `✅ ${name}`;
    case 'failure':
      return `❌ ${name}`;
    case 'skipped':
      return `⏭️ ${name}`;
    case 'cancelled':
      return `🚫 ${name}`;
    default:
      return `— ${name}`;
  }
}

function jobStatusLabel(result) {
  switch (result) {
    case 'success':
      return '✅ Passed';
    case 'failure':
      return '❌ Failed';
    case 'cancelled':
      return '🚫 Cancelled';
    case 'skipped':
      return '⏭️ Skipped';
    default:
      return '— Unknown';
  }
}

function coverageTier(pct) {
  if (pct == null) {
    return '—';
  }
  if (pct >= 80) {
    return '🟢';
  }
  if (pct >= 50) {
    return '🟡';
  }
  return '🔴';
}

function formatPct(pct) {
  if (pct == null) {
    return '—';
  }
  return `${pct.toFixed(1)}%`;
}

function formatCoveragePct(coverage) {
  const lines = coverage?.lines?.pct;
  if (lines == null) {
    return '—';
  }
  return `${coverageTier(lines)} ${formatPct(lines)}`;
}

function formatTestsCount(tests) {
  if (!tests || tests.total === 0) {
    return '—';
  }
  return String(tests.passed);
}

function formatTestsSummary(tests, failedTests) {
  if (!tests && failedTests === 0) {
    return '—';
  }
  const passed = tests?.passed ?? 0;
  if (failedTests > 0) {
    return `❌ ${passed} passed, **${failedTests} failed**`;
  }
  return `✅ ${passed} passed`;
}

function formatChecks(report, hasFormat) {
  if (!report) {
    return '—';
  }
  const parts = [
    stepGate('Lint', report.steps.lint),
    stepGate('Types', report.steps.typecheck),
    stepGate('Test', report.steps.test),
  ];
  if (hasFormat) {
    parts.splice(1, 0, stepGate('Format', report.steps.format));
  }
  return parts.join(' · ');
}

function weightedCoveragePct(reports) {
  let covered = 0;
  let total = 0;
  for (const report of reports) {
    const metric = report?.coverage?.lines;
    if (metric?.covered != null && metric?.total != null && metric.total > 0) {
      covered += metric.covered;
      total += metric.total;
    }
  }
  if (total === 0) {
    return null;
  }
  return (covered / total) * 100;
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

const commitUrl = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
  'commit',
  process.env.GITHUB_SHA,
]
  .filter(Boolean)
  .join('/');

const shortSha = (process.env.GITHUB_SHA ?? '').slice(0, 7);
const prNumber = process.env.GITHUB_PR_NUMBER;
const headRef = process.env.GITHUB_HEAD_REF;
const prUrl = [
  process.env.GITHUB_SERVER_URL,
  process.env.GITHUB_REPOSITORY,
  'pull',
  prNumber,
]
  .filter(Boolean)
  .join('/');

const rows = APPS.map((app) => {
  const report = readReport(app.id);
  const jobResult = process.env[app.jobResultEnv] ?? 'unknown';
  return { app, report, jobResult };
});

const reports = rows.map((row) => row.report).filter(Boolean);
const jobResults = rows.map((row) => row.jobResult);

const failedJobs = jobResults.filter((r) => r === 'failure').length;
const passedJobs = jobResults.filter((r) => r === 'success').length;
const allPassed = failedJobs === 0 && passedJobs === APPS.length;

const totalTests = reports.reduce((sum, r) => sum + (r.tests?.passed ?? 0), 0);
const failedTests = reports.reduce((sum, r) => sum + (r.tests?.failed ?? 0), 0);
const avgCoverage = weightedCoveragePct(reports);

const summaryTitle = allPassed ? '## ✅ CI Summary' : '## ❌ CI Summary';
const overallStatus = allPassed ? '✅ Passed' : `❌ ${failedJobs} failed`;

const coverageCell =
  avgCoverage != null
    ? `${coverageTier(avgCoverage)} **${formatPct(avgCoverage)}** weighted`
    : '—';

const refParts = [];
if (headRef) {
  refParts.push(`\`${headRef}\``);
}
if (shortSha) {
  refParts.push(commitUrl ? `[\`${shortSha}\`](${commitUrl})` : `\`${shortSha}\``);
}
if (runUrl) {
  refParts.push(`[Workflow run](${runUrl})`);
}
if (prNumber && prUrl) {
  refParts.push(`[PR #${prNumber}](${prUrl})`);
}

const lines = [
  summaryTitle,
  '',
  '| Status | Tests | Coverage |',
  '|---|---:|---:|',
  `| ${overallStatus} | ${formatTestsSummary({ passed: totalTests }, failedTests)} | ${coverageCell} |`,
  '',
];

if (refParts.length > 0) {
  lines.push(`${refParts.join(' · ')}`, '');
}

lines.push(
  '---',
  '',
  '## Packages',
  '',
  '| Package | Status | Tests | Coverage | Gates |',
  '|---|---|---:|---:|---|',
);

for (const { app, report, jobResult } of rows) {
  lines.push(
    `| ${app.icon} **${app.label}** | ${jobStatusLabel(jobResult)} | ${formatTestsCount(report?.tests ?? null)} | ${formatCoveragePct(report?.coverage ?? null)} | ${formatChecks(report, app.hasFormat)} |`,
  );
}

const hasCoverageDetails = reports.some((r) => r.coverage?.lines?.pct != null);
if (hasCoverageDetails) {
  lines.push(
    '',
    '<details>',
    '<summary>Coverage breakdown</summary>',
    '',
    '| Package | Lines | Statements | Functions | Branches |',
    '|---|---:|---:|---:|---:|',
  );

  for (const { app, report } of rows) {
    if (!report?.coverage) {
      lines.push(`| ${app.label} | — | — | — | — |`);
      continue;
    }
    const { lines: l, statements: s, functions: f, branches: b } = report.coverage;
    lines.push(
      `| ${app.label} | ${formatPct(l?.pct ?? null)} | ${formatPct(s?.pct ?? null)} | ${formatPct(f?.pct ?? null)} | ${formatPct(b?.pct ?? null)} |`,
    );
  }

  lines.push('', '</details>');
}

lines.push('');

process.stdout.write(`${lines.join('\n')}\n`);
