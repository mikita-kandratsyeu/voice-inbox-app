#!/usr/bin/env node
/**
 * JS bundle + source map, then HTML treemap + text top modules.
 *
 * Uses --minify false so Metro’s source map stays compatible with source-map-explorer
 * (minified maps often hit "column Infinity" and fail). Sizes are module-level, not byte-identical to release.
 * Set ANALYZE_MINIFY=1 to force minify (explorer may fail).
 *
 * Usage (from mobile/):
 *   yarn analyze:bundle              # iOS (default)
 *   yarn analyze:bundle:android
 *   BUNDLE_PLATFORM=android node scripts/analyze-bundle.mjs
 *
 * Outputs (gitignored):
 *   reports/main.<platform>.jsbundle
 *   reports/main.<platform>.jsbundle.map
 *   reports/bundle-<platform>.html   — open in a browser
 *   reports/bundle-top.txt           — paste into chat / @-mention in Cursor
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, '..');
const reportsDir = path.join(mobileRoot, 'reports');

function parsePlatform() {
  const arg = process.argv[2];
  if (arg === 'android' || arg === 'ios') return arg;
  const env = process.env.BUNDLE_PLATFORM;
  if (env === 'android' || env === 'ios') return env;
  return 'ios';
}

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '?';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    cwd: mobileRoot,
    stdio: 'inherit',
    env: { ...process.env, APP_ENV: 'production', ...options.env },
    ...options,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function runAllowFail(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    cwd: mobileRoot,
    stdio: 'inherit',
    env: { ...process.env, APP_ENV: 'production', ...options.env },
    ...options,
  });
  if (r.error) {
    console.warn('[analyze-bundle]', r.error.message);
    return false;
  }
  return r.status === 0;
}

function runCaptureAllowFail(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: mobileRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, APP_ENV: 'production' },
  });
  if (r.error) {
    console.warn('[analyze-bundle]', r.error.message);
    return '';
  }
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    if (err) console.warn('[analyze-bundle] command stderr:\n', err);
    return '';
  }
  return r.stdout ?? '';
}

function toResolvedSourcePath(sourcePath) {
  if (!sourcePath || typeof sourcePath !== 'string') return null;
  if (path.isAbsolute(sourcePath)) return sourcePath;
  return path.resolve(mobileRoot, sourcePath);
}

function buildTopFromSourceMap(mapPathValue) {
  try {
    const raw = fs.readFileSync(mapPathValue, 'utf8');
    const parsed = JSON.parse(raw);
    const sources = Array.isArray(parsed?.sources) ? parsed.sources : [];
    const sourcesContent = Array.isArray(parsed?.sourcesContent) ? parsed.sourcesContent : [];
    const out = [];

    for (let i = 0; i < sources.length; i += 1) {
      const p = sources[i];
      if (typeof p !== 'string' || p.length === 0) continue;
      const inline = sourcesContent[i];
      let bytes = 0;

      if (typeof inline === 'string') {
        bytes = Buffer.byteLength(inline, 'utf8');
      } else {
        const resolved = toResolvedSourcePath(p);
        if (resolved && fs.existsSync(resolved)) {
          bytes = fs.statSync(resolved).size;
        }
      }

      if (bytes > 0) out.push([p, bytes]);
    }

    out.sort((a, b) => b[1] - a[1]);
    return out;
  } catch (e) {
    console.warn(
      '[analyze-bundle] could not build source-map fallback:',
      e instanceof Error ? e.message : String(e),
    );
    return [];
  }
}

/** @param {unknown} data */
function normalizeBundles(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const o = /** @type {Record<string, unknown>} */ (data);
    if (Array.isArray(o.bundles)) return o.bundles;
    if (Array.isArray(o.results)) return o.results;
  }
  return [];
}

/** @param {unknown} fileVal */
function fileSize(fileVal) {
  if (typeof fileVal === 'number') return fileVal;
  if (fileVal && typeof fileVal === 'object' && 'size' in fileVal) {
    const s = /** @type {{ size?: unknown }} */ (fileVal).size;
    return typeof s === 'number' ? s : 0;
  }
  return 0;
}

const platform = parsePlatform();
const minify = process.env.ANALYZE_MINIFY === '1' || process.env.ANALYZE_MINIFY === 'true';
fs.mkdirSync(reportsDir, { recursive: true });

const bundleFile = `main.${platform}.jsbundle`;
const bundlePath = path.join(reportsDir, bundleFile);
const mapPath = `${bundlePath}.map`;
const htmlPath = path.join(reportsDir, `bundle-${platform}.html`);
const topPath = path.join(reportsDir, 'bundle-top.txt');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// eslint-disable-next-line no-console
console.log(`[analyze-bundle] platform=${platform}`);
// eslint-disable-next-line no-console
console.log(
  `[analyze-bundle] minify=${minify} (set ANALYZE_MINIFY=1 for prod-like minify; may break source-map-explorer)`,
);
// eslint-disable-next-line no-console
console.log(`[analyze-bundle] writing bundle + map → reports/${bundleFile}(.map)`);

run(npx, [
  'react-native',
  'bundle',
  '--platform',
  platform,
  '--dev',
  'false',
  '--minify',
  minify ? 'true' : 'false',
  '--entry-file',
  'index.js',
  '--bundle-output',
  bundlePath,
  '--sourcemap-output',
  mapPath,
]);

const smeArgsBase = [bundlePath, mapPath];

let htmlGenerated = false;
const lines = [
  'Voice Inbox mobile — bundle top modules (source-map-explorer, uncompressed mapped sizes)',
  `Platform: ${platform}`,
  `Generated: ${new Date().toISOString()}`,
  '',
];
// eslint-disable-next-line no-console
console.log('[analyze-bundle] generating HTML treemap…');

htmlGenerated = runAllowFail(npx, ['source-map-explorer', ...smeArgsBase, '--html', htmlPath]);

if (htmlGenerated) {
  lines.push(`Open treemap: mobile/reports/bundle-${platform}.html`);
  lines.push('');
} else {
  lines.push('Treemap: source-map-explorer failed for this Metro sourcemap.');
  lines.push('Falling back to sourcemap source-size heuristic below.');
  lines.push('');
}

// eslint-disable-next-line no-console
console.log('[analyze-bundle] collecting JSON for top modules…');

const jsonRaw = runCaptureAllowFail(npx, ['source-map-explorer', ...smeArgsBase, '--json']);

if (jsonRaw.trim()) {
  try {
    const data = JSON.parse(jsonRaw);
    const bundles = normalizeBundles(data);
    const merged = new Map();

    for (const b of bundles) {
      if (!b || typeof b !== 'object') continue;
      const files = /** @type {{ files?: Record<string, unknown> }} */ (b).files;
      if (!files || typeof files !== 'object') continue;
      for (const [k, v] of Object.entries(files)) {
        const sz = fileSize(v);
        merged.set(k, (merged.get(k) ?? 0) + sz);
      }
    }

    const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, n]) => s + n, 0);

    lines.push(`Total mapped (sum of file entries): ${formatBytes(total)}`);
    lines.push('');
    lines.push('Top modules:');
    sorted.slice(0, 80).forEach(([p, size], i) => {
      lines.push(`${String(i + 1).padStart(3)}. ${formatBytes(size).padStart(12)}  ${p}`);
    });
  } catch (e) {
    lines.push(`Could not parse --json output: ${e instanceof Error ? e.message : String(e)}`);
    lines.push('Use the HTML report for details.');
  }
} else {
  const fallback = buildTopFromSourceMap(mapPath);
  if (fallback.length > 0) {
    const total = fallback.reduce((s, [, n]) => s + n, 0);
    lines.push(`Fallback total source bytes (sources/sourcesContent): ${formatBytes(total)}`);
    lines.push('');
    lines.push('Top source files (heuristic, not mapped bundle attribution):');
    fallback.slice(0, 80).forEach(([p, size], i) => {
      lines.push(`${String(i + 1).padStart(3)}. ${formatBytes(size).padStart(12)}  ${p}`);
    });
  } else {
    lines.push('No JSON from source-map-explorer and fallback from sourcemap also failed.');
  }
}

fs.writeFileSync(topPath, `${lines.join('\n')}\n`, 'utf8');

// eslint-disable-next-line no-console
console.log('');
// eslint-disable-next-line no-console
console.log(`[analyze-bundle] done → ${path.relative(mobileRoot, topPath)}`);
if (htmlGenerated) {
  // eslint-disable-next-line no-console
  console.log(`[analyze-bundle] done → ${path.relative(mobileRoot, htmlPath)}`);
} else {
  // eslint-disable-next-line no-console
  console.log('[analyze-bundle] treemap was not generated (see warnings above).');
}
