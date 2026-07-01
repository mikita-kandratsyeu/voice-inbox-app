import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const webRoot = path.join(repoRoot, 'web');

await esbuild.build({
  entryPoints: [path.join(__dirname, '../src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outfile: path.join(__dirname, '../dist/server.mjs'),
  packages: 'external',
  alias: {
    '@': webRoot,
  },
  logLevel: 'info',
});

console.info('[AI worker] build complete');
