import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const repoRoot = path.resolve(pkgRoot, '../..');
const webGenerated = path.join(repoRoot, 'web/generated/prisma/client');

await esbuild.build({
  entryPoints: [path.join(pkgRoot, 'src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  outfile: path.join(pkgRoot, 'dist/server.mjs'),
  packages: 'external',
  alias: {
    '@': path.join(pkgRoot, 'src'),
    '@/generated/prisma/client': webGenerated,
  },
  logLevel: 'info',
});

console.info('[AI worker] build complete');
