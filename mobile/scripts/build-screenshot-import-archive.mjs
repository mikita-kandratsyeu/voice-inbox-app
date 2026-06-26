#!/usr/bin/env node
/**
 * Builds voice-inbox-screenshots-demo.zip — import via Settings → Import (same format as app export v3).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ZIP store (no compression); compatible with mobile @zip.js/zip.js archives. */
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(entries) {
  const chunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const size = data.length;
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    chunks.push(local, data);
    centralChunks.push(central);
    offset += local.length + data.length;
  }

  const centralOffset = offset;
  const centralBlob = Buffer.concat(centralChunks);
  chunks.push(centralBlob);
  const centralSize = centralBlob.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  chunks.push(eocd);

  return Buffer.concat(chunks);
}

function writeSilentWav(filePath, durationSec, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  writeFileSync(filePath, buf);
}

const demoJsonPath = join(__dirname, '../assets/voice-inbox-screenshots-demo.json');
const basePayload = JSON.parse(readFileSync(demoJsonPath, 'utf8'));
if (basePayload.version !== 3 || !Array.isArray(basePayload.records)) {
  throw new Error('Invalid voice-inbox-screenshots-demo.json');
}

const exportedAt = new Date().toISOString();
const records = basePayload.records.map((r) => ({
  ...r,
  audioPath: `audio/${r.id}.wav`,
}));

const payload = {
  ...basePayload,
  exportedAt,
  records,
};

const buildRoot = join(__dirname, '../assets/screenshot-demo-build');
const zipOut = join(__dirname, '../assets/voice-inbox-screenshots-demo.zip');

rmSync(buildRoot, { recursive: true, force: true });
mkdirSync(join(buildRoot, 'audio'), { recursive: true });

const wavDurationSec = 0.35;

for (const r of records) {
  const rel = r.audioPath;
  writeSilentWav(join(buildRoot, rel), wavDurationSec);
}

const metadataBody = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
writeFileSync(join(buildRoot, 'metadata.json'), metadataBody);

const zipEntries = [{ name: 'metadata.json', data: metadataBody }];
for (const r of records) {
  zipEntries.push({
    name: r.audioPath,
    data: readFileSync(join(buildRoot, r.audioPath)),
  });
}

mkdirSync(dirname(zipOut), { recursive: true });
writeFileSync(zipOut, zipStore(zipEntries));

rmSync(buildRoot, { recursive: true, force: true });

// eslint-disable-next-line no-console
console.log('Wrote', zipOut);
