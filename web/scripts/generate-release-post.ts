/**
 * Print or write a blog release draft from web/package.json version + git log.
 *
 * Usage (from web/):
 *   yarn release-post:draft
 *   yarn release-post:draft ru
 *   yarn release-post:draft en --write
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { generateReleasePostDraft } from '../lib/release-post-generate';

async function main() {
  const locale = process.argv[2] === 'ru' ? 'ru' : 'en';
  const write = process.argv.includes('--write');
  const draft = await generateReleasePostDraft(locale);

  if (write) {
    const out = path.join(process.cwd(), `.release-draft-${locale}.json`);
    await writeFile(out, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${out}`);
    return;
  }

  console.log('\nBlog draft (Admin → Blog):\n');
  console.log(`  locale:    ${draft.locale}`);
  console.log(`  slug:      ${draft.slug}`);
  console.log(`  title:     ${draft.title}`);
  console.log(`  version:   ${draft.version}`);
  console.log(`  summary:   ${draft.summary}`);
  console.log(`  commits:   ${draft.commitCount}`);
  console.log('\n--- body ---\n');
  console.log(draft.body);
  console.log('\n--- end ---\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
