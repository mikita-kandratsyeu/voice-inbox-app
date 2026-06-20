import QuickCrypto from 'react-native-quick-crypto';

import { NitroFS } from '@/shared/lib/fs';

export function sha256Hex(content: string): string {
  const hash = QuickCrypto.createHash('sha256');
  hash.update(content, 'utf8');
  return hash.digest('hex');
}

export function hashFileMap(files: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, content] of files.entries()) {
    out[path] = sha256Hex(content);
  }
  return out;
}

export async function sha256HexFromFile(localPath: string): Promise<string> {
  const normalized = localPath.startsWith('file://') ? localPath.slice(7) : localPath;
  const base64 = await NitroFS.readFile(normalized, 'base64');
  const hash = QuickCrypto.createHash('sha256');
  hash.update(base64, 'base64');
  return hash.digest('hex');
}
