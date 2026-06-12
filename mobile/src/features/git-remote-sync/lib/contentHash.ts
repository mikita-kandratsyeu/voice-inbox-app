import QuickCrypto from 'react-native-quick-crypto';

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
