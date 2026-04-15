#!/usr/bin/env node
/**
 * Interactive (or env-driven) release version bump for the monorepo.
 *
 * Updates:
 *   - mobile/package.json  → "version"
 *   - web/package.json     → "version"
 *   - mobile/ios/.../project.pbxproj → MARKETING_VERSION, CURRENT_PROJECT_VERSION (all targets)
 *   - mobile/android/app/build.gradle → versionName, versionCode
 *
 * Usage:
 *   node scripts/release.mjs
 *   node scripts/release.mjs --dry-run
 *   node scripts/release.mjs --no-git
 *   RELEASE_VERSION=0.5.0 RELEASE_BUILD=200 node scripts/release.mjs --yes
 *
 * Git (optional): stages the files above, commits, tags v<semver>.
 * Requires a clean working tree unless you pass --allow-dirty.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output, exit } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const PATHS = {
  mobilePkg: path.join(REPO_ROOT, 'mobile/package.json'),
  webPkg: path.join(REPO_ROOT, 'web/package.json'),
  pbxproj: path.join(REPO_ROOT, 'mobile/ios/VoiceInboxApp.xcodeproj/project.pbxproj'),
  androidGradle: path.join(REPO_ROOT, 'mobile/android/app/build.gradle'),
};

const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function parseArgs(argv) {
  const out = {
    dryRun: false,
    noGit: false,
    yes: false,
    allowDirty: false,
    help: false,
  };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-git') out.noGit = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--allow-dirty') out.allowDirty = true;
    else if (a === '-h' || a === '--help') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`Usage: node scripts/release.mjs [options]

Options:
  --dry-run       Show current versions only (no prompts). With --yes + env, preview a bump.
  --no-git        Bump files only (no commit / tag)
  --yes           Non-interactive (set RELEASE_VERSION and RELEASE_BUILD)
  --allow-dirty   Allow other uncommitted changes; only version files are committed
  -h, --help      Show help

Environment (with --yes):
  RELEASE_VERSION   Semver, e.g. 0.5.0
  RELEASE_BUILD     Integer build number, e.g. 200
`);
}

async function readJsonVersion(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const j = JSON.parse(raw);
  return { version: j.version, raw };
}

function parsePbxprojVersions(content) {
  const m = content.match(/MARKETING_VERSION = ([^;\n]+);/);
  const c = content.match(/CURRENT_PROJECT_VERSION = (\d+);/);
  return {
    marketing: m ? m[1].trim() : null,
    build: c ? parseInt(c[1], 10) : null,
  };
}

function parseAndroidVersions(content) {
  const nameM = content.match(/versionName\s+"([^"]+)"/);
  const codeM = content.match(/versionCode\s+(\d+)/);
  return {
    versionName: nameM ? nameM[1] : null,
    versionCode: codeM ? parseInt(codeM[1], 10) : null,
  };
}

function bumpPbxproj(content, marketingVersion, buildNumber) {
  let next = content.replace(/MARKETING_VERSION = [^;\n]+;/g, `MARKETING_VERSION = ${marketingVersion};`);
  next = next.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
  return next;
}

function bumpAndroidGradle(content, versionName, versionCode) {
  let next = content.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);
  next = next.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  return next;
}

async function bumpPackageJson(filePath, newVersion, dryRun) {
  const raw = await readFile(filePath, 'utf8');
  const j = JSON.parse(raw);
  const prev = j.version;
  j.version = newVersion;
  const out = `${JSON.stringify(j, null, 2)}\n`;
  if (!dryRun) await writeFile(filePath, out, 'utf8');
  return { filePath, prev, next: newVersion };
}

function git(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit' });
}

function gitQuiet(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function isWorkingTreeClean() {
  try {
    const s = gitQuiet('git status --porcelain');
    return s.length === 0;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    exit(0);
  }

  if (args.dryRun && !args.yes) {
    const mobile = await readJsonVersion(PATHS.mobilePkg);
    const web = await readJsonVersion(PATHS.webPkg);
    const pbxRaw = await readFile(PATHS.pbxproj, 'utf8');
    const gradleRaw = await readFile(PATHS.androidGradle, 'utf8');
    const ios = parsePbxprojVersions(pbxRaw);
    const android = parseAndroidVersions(gradleRaw);
    console.log('\nCurrent versions (no changes, no prompts):\n');
    console.log(`  mobile/package.json       ${mobile.version}`);
    console.log(`  web/package.json          ${web.version}`);
    console.log(`  iOS MARKETING_VERSION     ${ios.marketing ?? '?'}`);
    console.log(`  iOS CURRENT_PROJECT_VERSION ${ios.build ?? '?'}`);
    console.log(`  Android versionName       ${android.versionName ?? '?'}`);
    console.log(`  Android versionCode      ${android.versionCode ?? '?'}`);
    console.log('\nRun without --dry-run for interactive bump, or:\n');
    console.log('  RELEASE_VERSION=0.5.0 RELEASE_BUILD=200 node scripts/release.mjs --dry-run --yes\n');
    exit(0);
  }

  const mobile = await readJsonVersion(PATHS.mobilePkg);
  const web = await readJsonVersion(PATHS.webPkg);
  const pbxRaw = await readFile(PATHS.pbxproj, 'utf8');
  const gradleRaw = await readFile(PATHS.androidGradle, 'utf8');
  const ios = parsePbxprojVersions(pbxRaw);
  const android = parseAndroidVersions(gradleRaw);

  console.log('\nCurrent versions:\n');
  console.log(`  mobile/package.json     ${mobile.version}`);
  console.log(`  web/package.json        ${web.version}`);
  console.log(`  iOS MARKETING_VERSION   ${ios.marketing ?? '?'}`);
  console.log(`  iOS build               ${ios.build ?? '?'}`);
  console.log(`  Android versionName     ${android.versionName ?? '?'}`);
  console.log(`  Android versionCode     ${android.versionCode ?? '?'}`);
  console.log('');

  let semver;
  let buildNum;

  if (args.yes) {
    semver = (process.env.RELEASE_VERSION ?? '').trim();
    const b = (process.env.RELEASE_BUILD ?? '').trim();
    buildNum = parseInt(b, 10);
    if (!SEMVER_RE.test(semver)) {
      console.error('RELEASE_VERSION must match semver (e.g. 0.5.0 or 1.0.0-rc.1).');
      exit(1);
    }
    if (!Number.isFinite(buildNum) || buildNum < 1) {
      console.error('RELEASE_BUILD must be a positive integer.');
      exit(1);
    }
  } else {
    const rl = createInterface({ input, output });
    const suggestedSemver = ios.marketing || mobile.version;
    const suggestedBuild = Number.isFinite(ios.build) ? ios.build + 1 : 1;

    const vAns = await rl.question(`New semver (mobile + web + iOS marketing + Android versionName) [${suggestedSemver}]: `);
    semver = (vAns || suggestedSemver).trim();

    const bAns = await rl.question(`New build number (iOS CURRENT_PROJECT_VERSION + Android versionCode) [${suggestedBuild}]: `);
    buildNum = parseInt((bAns || String(suggestedBuild)).trim(), 10);

    rl.close();

    if (!SEMVER_RE.test(semver)) {
      console.error('Invalid semver. Use MAJOR.MINOR.PATCH optional -prerelease.');
      exit(1);
    }
    if (!Number.isFinite(buildNum) || buildNum < 1) {
      console.error('Build number must be a positive integer.');
      exit(1);
    }
  }

  const nextPbx = bumpPbxproj(pbxRaw, semver, buildNum);
  const nextGradle = bumpAndroidGradle(gradleRaw, semver, buildNum);

  console.log('\nPlanned:\n');
  console.log(`  Semver:      ${semver}`);
  console.log(`  Build:       ${buildNum}`);
  console.log(`  Git tag:     v${semver}`);
  console.log('');

  if (args.dryRun) {
    console.log('[dry-run] No files written.');
    exit(0);
  }

  if (!args.noGit && !args.allowDirty && !isWorkingTreeClean()) {
    console.error(
      'Working tree is not clean. Commit or stash other changes first, or pass --allow-dirty (only version files will be committed).',
    );
    exit(1);
  }

  const changes = [];
  changes.push(await bumpPackageJson(PATHS.mobilePkg, semver, false));
  changes.push(await bumpPackageJson(PATHS.webPkg, semver, false));
  await writeFile(PATHS.pbxproj, nextPbx, 'utf8');
  changes.push({
    filePath: PATHS.pbxproj,
    prev: `${ios.marketing} / ${ios.build}`,
    next: `${semver} / ${buildNum}`,
  });
  await writeFile(PATHS.androidGradle, nextGradle, 'utf8');
  changes.push({
    filePath: PATHS.androidGradle,
    prev: `${android.versionName} / ${android.versionCode}`,
    next: `${semver} / ${buildNum}`,
  });

  console.log('Updated files:\n');
  for (const c of changes) {
    console.log(`  ${path.relative(REPO_ROOT, c.filePath)}  ${c.prev} → ${c.next}`);
  }
  console.log('');

  if (args.noGit) {
    console.log('Skipping git (--no-git).');
    exit(0);
  }

  if (!args.yes) {
    const rl2 = createInterface({ input, output });
    const ans = (await rl2.question('Create git commit and tag v' + semver + '? [y/N]: ')).trim().toLowerCase();
    rl2.close();
    if (ans !== 'y' && ans !== 'yes') {
      console.log('Done (no git).');
      exit(0);
    }
  }

  const relFiles = [
    'mobile/package.json',
    'web/package.json',
    'mobile/ios/VoiceInboxApp.xcodeproj/project.pbxproj',
    'mobile/android/app/build.gradle',
  ];

  git(`git add ${relFiles.join(' ')}`);
  const subject = `chore(release): v${semver} (build ${buildNum})`;
  const body = `Mobile + web package.json, iOS project version, Android versionName/versionCode.`;
  git(`git commit -m ${JSON.stringify(subject)} -m ${JSON.stringify(body)}`);

  try {
    gitQuiet(`git rev-parse v${semver}`);
    console.error(`Tag v${semver} already exists. Skip tagging.`);
  } catch {
    git(`git tag -a v${semver} -m ${JSON.stringify(`Release v${semver} (build ${buildNum})`)}`);
    console.log(`\nCreated tag v${semver}. Push with: git push && git push origin v${semver}`);
  }
}

main().catch((e) => {
  console.error(e);
  exit(1);
});
