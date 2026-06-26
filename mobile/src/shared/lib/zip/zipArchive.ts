import {
  type EntryMetaData,
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import { Buffer } from 'buffer';

import { NitroFS } from '@/shared/lib/fs';

import { ensureZipArchiveConfigured } from './configureZipArchive';

const BACKUP_ZIP_AES_STRENGTH = 3 as const;

type ZipDirectoryEntry = {
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
};

function normalizeZipEntryPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function joinZipPath(base: string, name: string): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedName = name.replace(/^\/+/, '');
  return normalizedBase ? `${normalizedBase}/${normalizedName}` : normalizedName;
}

async function collectDirectoryEntries(
  rootDir: string,
  currentDir = rootDir,
  relativePrefix = '',
): Promise<ZipDirectoryEntry[]> {
  const entries: ZipDirectoryEntry[] = [];
  const items = await NitroFS.readdir(currentDir);

  for (const item of items) {
    const relativePath = joinZipPath(relativePrefix, item.name);
    const stat = await NitroFS.stat(item.path);

    if (stat.isDirectory) {
      entries.push({
        relativePath: normalizeZipEntryPath(`${relativePath}/`),
        absolutePath: item.path,
        isDirectory: true,
      });
      entries.push(...(await collectDirectoryEntries(rootDir, item.path, relativePath)));
      continue;
    }

    entries.push({
      relativePath: normalizeZipEntryPath(relativePath),
      absolutePath: item.path,
      isDirectory: false,
    });
  }

  return entries;
}

async function readFileAsUint8Array(path: string): Promise<Uint8Array> {
  const base64 = await NitroFS.readFile(path, 'base64');
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

async function writeUint8ArrayToFile(path: string, data: Uint8Array): Promise<void> {
  await NitroFS.writeFile(path, Buffer.from(data).toString('base64'), 'base64');
}

function isEncryptedZipError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') {
    return false;
  }
  const code = 'code' in err ? String((err as { code?: unknown }).code) : '';
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === 'Encrypted' ||
    code === 'Invalid password' ||
    /password/i.test(message) ||
    /encrypt/i.test(message)
  );
}

async function readZipBytes(zipPath: string): Promise<Uint8Array> {
  return readFileAsUint8Array(zipPath);
}

async function zipDirectoryInternal(
  sourceDir: string,
  targetZipPath: string,
  password?: string,
): Promise<void> {
  ensureZipArchiveConfigured();

  const exists = await NitroFS.exists(targetZipPath);
  if (exists) {
    await NitroFS.unlink(targetZipPath);
  }

  const writer = new Uint8ArrayWriter();
  const zipWriter = new ZipWriter(writer);
  const entries = await collectDirectoryEntries(sourceDir);

  try {
    for (const entry of entries) {
      if (entry.isDirectory) {
        continue;
      }

      const data = await readFileAsUint8Array(entry.absolutePath);
      const reader = new Uint8ArrayReader(data);
      const addOptions = password
        ? { password, encryptionStrength: BACKUP_ZIP_AES_STRENGTH }
        : undefined;

      await zipWriter.add(entry.relativePath, reader, addOptions);
    }

    await zipWriter.close();
    const zipBytes = await writer.getData();
    await writeUint8ArrayToFile(targetZipPath, zipBytes);
  } catch (err) {
    await zipWriter.close().catch(() => {});
    throw err;
  }
}

export async function zipDirectory(sourceDir: string, targetZipPath: string): Promise<void> {
  await zipDirectoryInternal(sourceDir, targetZipPath);
}

export async function zipDirectoryWithPassword(
  sourceDir: string,
  targetZipPath: string,
  password: string,
): Promise<void> {
  await zipDirectoryInternal(sourceDir, targetZipPath, password);
}

export async function isZipPasswordProtected(zipPath: string): Promise<boolean> {
  ensureZipArchiveConfigured();

  const zipBytes = await readZipBytes(zipPath);
  const zipReader = new ZipReader(new Uint8ArrayReader(zipBytes));

  try {
    const entries = await zipReader.getEntries();
    return entries.some((entry: EntryMetaData) => entry.encrypted === true);
  } finally {
    await zipReader.close().catch(() => {});
  }
}

export async function unzipArchive(
  zipPath: string,
  targetDir: string,
  password?: string,
): Promise<void> {
  ensureZipArchiveConfigured();

  const exists = await NitroFS.exists(targetDir);
  if (!exists) {
    await NitroFS.mkdir(targetDir);
  }

  const zipBytes = await readZipBytes(zipPath);
  const trimmedPassword = password?.trim();
  const zipReader = new ZipReader(
    new Uint8ArrayReader(zipBytes),
    trimmedPassword ? { password: trimmedPassword } : undefined,
  );

  try {
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      if (entry.directory) {
        const dirPath = `${targetDir}/${entry.filename}`.replace(/\/+/g, '/');
        const dirExists = await NitroFS.exists(dirPath);
        if (!dirExists) {
          await NitroFS.mkdir(dirPath);
        }
        continue;
      }

      const outPath = `${targetDir}/${entry.filename}`.replace(/\/+/g, '/');
      const parent = outPath.slice(0, outPath.lastIndexOf('/'));
      if (parent) {
        const parentExists = await NitroFS.exists(parent);
        if (!parentExists) {
          await NitroFS.mkdir(parent);
        }
      }

      const lower = entry.filename.toLowerCase();
      const isText =
        lower.endsWith('.json') ||
        lower.endsWith('.md') ||
        lower.endsWith('.txt') ||
        lower.endsWith('.csv');

      if (isText) {
        const text = await entry.getData(new TextWriter());
        await NitroFS.writeFile(outPath, text, 'utf8');
      } else {
        const bytes = await entry.getData(new Uint8ArrayWriter());
        await writeUint8ArrayToFile(outPath, bytes);
      }
    }
  } finally {
    await zipReader.close().catch(() => {});
  }
}

export { isEncryptedZipError };

/** @deprecated Use {@link zipDirectory}. Kept for drop-in migration from react-native-zip-archive. */
export async function zip(sourceDir: string, targetZipPath: string): Promise<void> {
  await zipDirectory(sourceDir, targetZipPath);
}

/** @deprecated Use {@link zipDirectoryWithPassword}. */
export async function zipWithPassword(
  sourceDir: string,
  targetZipPath: string,
  password: string,
  _encryptionMethod?: string,
): Promise<void> {
  await zipDirectoryWithPassword(sourceDir, targetZipPath, password);
}

/** @deprecated Use {@link unzipArchive}. */
export async function unzip(zipPath: string, targetDir: string): Promise<void> {
  await unzipArchive(zipPath, targetDir);
}

/** @deprecated Use {@link unzipArchive}. */
export async function unzipWithPassword(
  zipPath: string,
  targetDir: string,
  password: string,
): Promise<void> {
  await unzipArchive(zipPath, targetDir, password);
}

/** @deprecated Use {@link isZipPasswordProtected}. */
export async function isPasswordProtected(zipPath: string): Promise<boolean> {
  return isZipPasswordProtected(zipPath);
}
