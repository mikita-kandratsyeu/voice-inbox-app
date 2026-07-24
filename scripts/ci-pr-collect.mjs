#!/usr/bin/env node
/**
 * Collect CI step outcomes and test metrics for PR summary comments.
 * Invoked at the end of each app job when github.event_name is pull_request.
 *
 * Usage (from app directory):
 *   node ../scripts/ci-pr-collect.mjs mobile
 */

import fs from 'node:fs';
import path from 'node:path';

const app = process.argv[2];
if (!app) {
  console.error('Usage: node ci-pr-collect.mjs <app>');
  process.exit(1);
}

const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
const appDir = process.cwd();

function readJsonIfExists(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function pickCoverageMetric(summary, key) {
  const metric = summary?.[key];
  if (!metric || metric.pct == null) {
    return null;
  }
  return {
    pct: metric.pct,
    covered: metric.covered ?? null,
    total: metric.total ?? null,
  };
}

const steps = {
  lint: process.env.STEP_LINT_OUTCOME ?? 'skipped',
  typecheck: process.env.STEP_TYPECHECK_OUTCOME ?? 'skipped',
  test: process.env.STEP_TEST_OUTCOME ?? 'skipped',
};

if (process.env.STEP_FORMAT_OUTCOME != null) {
  steps.format = process.env.STEP_FORMAT_OUTCOME;
}

const coverageSummary = readJsonIfExists(
  path.join(appDir, 'coverage', 'coverage-summary.json'),
);
const testResults = readJsonIfExists(path.join(appDir, 'test-results.json'));

const coverage = coverageSummary?.total
  ? {
      lines: pickCoverageMetric(coverageSummary.total, 'lines'),
      statements: pickCoverageMetric(coverageSummary.total, 'statements'),
      functions: pickCoverageMetric(coverageSummary.total, 'functions'),
      branches: pickCoverageMetric(coverageSummary.total, 'branches'),
    }
  : null;

let durationMs = null;
if (testResults?.testResults) {
  durationMs = testResults.testResults.reduce(
    (sum, suite) => sum + (suite.perfStats?.runtime ?? 0),
    0,
  );
}

const tests = testResults
  ? {
      total: testResults.numTotalTests ?? 0,
      passed: testResults.numPassedTests ?? 0,
      failed: testResults.numFailedTests ?? 0,
      skipped: testResults.numPendingTests ?? 0,
      durationMs,
    }
  : null;

const report = { app, steps, coverage, tests };

const outDir = path.join(workspace, 'ci-metrics');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, `${app}.json`),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(`Wrote ci-metrics/${app}.json`);
