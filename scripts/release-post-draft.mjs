#!/usr/bin/env node
/**
 * Build blog release post draft from web/package.json version + git log.
 * Used by release.mjs (--blog-draft) and: node scripts/release-post-draft.mjs [en|ru]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function readVersion() {
  const raw = readFile(path.join(REPO_ROOT, 'web/package.json'), 'utf8').then((r) => {
    const v = JSON.parse(r).version;
    if (!v || typeof v !== 'string') throw new Error('web/package.json: missing version');
    return v.trim();
  });
  return raw;
}

function versionToSlug(version) {
  return version.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
}

function gitLogSubjects(max) {
  try {
    const out = execSync(`git log -${max} --pretty=format:%s`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return out ? out.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function gitLogSinceTag(tag, max) {
  const t = tag.startsWith('v') ? tag : `v${tag}`;
  try {
    execSync(`git rev-parse --verify ${JSON.stringify(t)}^{commit}`, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
    const out = execSync(`git log ${t}..HEAD --pretty=format:%s`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return out ? out.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, max) : [];
  } catch {
    return gitLogSubjects(max);
  }
}

function buildDraft(version, locale, commits) {
  const ru = locale === 'ru';
  const title = `Voice Inbox AI ${version}`;
  const summary = ru
    ? `Обновление приложения до версии ${version}.`
    : `App update to version ${version}.`;
  const bullets =
    commits.length > 0
      ? commits.map((c) => `- ${c.replace(/^-+\s*/, '')}`).join('\n')
      : ru
        ? '- Добавьте пункты вручную.'
        : '- Add items manually.';

  const body = [
    ru ? '## Основное' : '## Highlights',
    '',
    '- ',
    '',
    ru ? '## Изменения' : '## Changes',
    '',
    bullets,
    '',
    '---',
    '',
    ru
      ? `_Черновик для версии ${version}. Отредактируйте перед публикацией._`
      : `_Draft for version ${version}. Edit before publishing._`,
  ].join('\n');

  return {
    locale,
    slug: versionToSlug(version),
    title,
    version,
    summary,
    body,
    commitCount: commits.length,
  };
}

export async function generateReleasePostDraftMjs(locale = 'en', options = {}) {
  const loc = locale === 'ru' ? 'ru' : 'en';
  const version = options.version?.trim() || (await readVersion());
  const sinceTag = options.sinceTag?.trim() || `v${version}`;
  let commits = gitLogSinceTag(sinceTag, 40);
  if (commits.length === 0) commits = gitLogSubjects(35);
  return buildDraft(version, loc, commits);
}

export function printDraftInstructions(draft) {
  console.log('\nBlog draft (paste into Admin → Blog):\n');
  console.log(`  locale:    ${draft.locale}`);
  console.log(`  slug:      ${draft.slug}`);
  console.log(`  title:     ${draft.title}`);
  console.log(`  version:   ${draft.version}`);
  console.log(`  summary:   ${draft.summary}`);
  console.log(`  commits:   ${draft.commitCount}`);
  console.log('\n--- body (markdown) ---\n');
  console.log(draft.body);
  console.log('\n--- end ---\n');
}

async function main() {
  const locale = process.argv[2] === 'ru' ? 'ru' : 'en';
  const outPath = process.argv.includes('--write')
    ? path.join(REPO_ROOT, `web/.release-draft-${locale}.json`)
    : null;
  const draft = await generateReleasePostDraftMjs(locale);
  if (outPath) {
    await writeFile(outPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(REPO_ROOT, outPath)}`);
  } else {
    printDraftInstructions(draft);
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
