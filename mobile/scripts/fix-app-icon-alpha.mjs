#!/usr/bin/env node
/**
 * Removes alpha channel from iOS app icons (required by App Store validation).
 * Flattens onto white background so the output PNG has no alpha channel.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONSET = join(
  __dirname,
  '..',
  'ios',
  'VoiceInboxApp',
  'Images.xcassets',
  'AppIcon.appiconset',
);

async function main() {
  const sharp = (await import('sharp')).default;
  const files = await readdir(ICONSET);
  const pngFiles = files.filter((f) => f.endsWith('.png'));

  for (const filename of pngFiles) {
    const inputPath = join(ICONSET, filename);
    const input = await readFile(inputPath);
    const output = await sharp(input)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    await writeFile(inputPath, output);
    // eslint-disable-next-line no-console
    console.log('Processed:', filename);
  }

  // eslint-disable-next-line no-console
  console.log('Done. Alpha channel removed from all app icons.');
  // eslint-disable-next-line no-console
  console.log('\nImportant: In Xcode, do Product → Clean Build Folder (⇧⌘K), then archive again.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
