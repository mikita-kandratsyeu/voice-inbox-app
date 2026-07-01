import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tessDir = path.join(__dirname, '../android/app/src/main/assets/tessdata');

const FILES = [
  {
    name: 'eng.traineddata',
    url: 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata',
  },
  {
    name: 'rus.traineddata',
    url: 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/rus.traineddata',
  },
];

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  fs.mkdirSync(tessDir, { recursive: true });

  for (const file of FILES) {
    const dest = path.join(tessDir, file.name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      continue;
    }
    const bytes = await download(file.url);
    fs.writeFileSync(dest, bytes);
    console.log(`[ensure-android-tessdata] wrote ${file.name}`);
  }
}

main().catch((err) => {
  console.warn('[ensure-android-tessdata] skipped:', err.message);
});
