import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(process.cwd(), '..');

export type ReleasePostDraftLocale = 'en' | 'ru';

export type ReleasePostDraft = {
  locale: ReleasePostDraftLocale;
  slug: string;
  title: string;
  version: string;
  summary: string;
  body: string;
  commitCount: number;
};

export async function readRepoAppVersion(): Promise<string> {
  const raw = await readFile(path.join(REPO_ROOT, 'web/package.json'), 'utf8');
  const j = JSON.parse(raw) as { version?: string };
  const v = typeof j.version === 'string' ? j.version.trim() : '';
  if (!v) throw new Error('web/package.json has no version');
  return v;
}

export function versionToReleaseSlug(version: string): string {
  return version
    .replace(/\./g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
}

export function collectRecentCommitSubjects(max = 35): string[] {
  try {
    const out = execSync(`git log -${max} --pretty=format:%s`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!out) return [];
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collectCommitsSinceTag(tag: string, max = 40): string[] {
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
    if (!out) return [];
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, max);
  } catch {
    return collectRecentCommitSubjects(max);
  }
}

function copyForLocale(
  locale: ReleasePostDraftLocale,
  version: string,
): {
  title: string;
  summary: string;
  highlights: string;
  changesHeading: string;
  emptyCommits: string;
} {
  if (locale === 'ru') {
    return {
      title: `Voice Inbox AI ${version}`,
      summary: `Обновление приложения до версии ${version}.`,
      highlights: '## Основное',
      changesHeading: '## Изменения',
      emptyCommits: '- Добавьте пункты вручную или сгенерируйте снова после коммита релиза.',
    };
  }
  return {
    title: `Voice Inbox AI ${version}`,
    summary: `App update to version ${version}.`,
    highlights: '## Highlights',
    changesHeading: '## Changes',
    emptyCommits: '- Add items manually, or regenerate after the release commit.',
  };
}

export function buildReleasePostDraft(
  version: string,
  locale: ReleasePostDraftLocale,
  commits: string[],
): ReleasePostDraft {
  const copy = copyForLocale(locale, version);
  const bulletLines =
    commits.length > 0
      ? commits.map((c) => `- ${c.replace(/^-+\s*/, '')}`).join('\n')
      : copy.emptyCommits;

  const body = [
    copy.highlights,
    '',
    '- ',
    '',
    copy.changesHeading,
    '',
    bulletLines,
    '',
    '---',
    '',
    locale === 'ru'
      ? `_Черновик для версии ${version}. Отредактируйте перед публикацией._`
      : `_Draft for version ${version}. Edit before publishing._`,
  ].join('\n');

  return {
    locale,
    slug: versionToReleaseSlug(version),
    title: copy.title,
    version,
    summary: copy.summary,
    body,
    commitCount: commits.length,
  };
}

export async function generateReleasePostDraft(
  locale: ReleasePostDraftLocale,
  options?: { version?: string; sinceTag?: string },
): Promise<ReleasePostDraft> {
  const version = options?.version?.trim() || (await readRepoAppVersion());
  const sinceTag = options?.sinceTag?.trim() || `v${version}`;
  let commits = collectCommitsSinceTag(sinceTag);
  if (commits.length === 0) commits = collectRecentCommitSubjects();
  return buildReleasePostDraft(version, locale, commits);
}
