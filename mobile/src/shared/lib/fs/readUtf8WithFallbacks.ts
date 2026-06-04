import { NitroFS } from './appFs';

function decodeBase64ToUtf8(base64: string): string {
  const binary = atob(base64);
  let escaped = '';
  for (let i = 0; i < binary.length; i += 1) {
    escaped += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
  }
  return decodeURIComponent(escaped);
}

/** Read UTF-8 text from a local path (plain, file://, or base64 fallback). */
export async function readUtf8WithAllFallbacks(path: string): Promise<string> {
  try {
    return await NitroFS.readFile(path, 'utf8');
  } catch {
    try {
      return await NitroFS.readFile(`file://${path}`, 'utf8');
    } catch {
      try {
        const base64 = await NitroFS.readFile(path, 'base64');
        return decodeBase64ToUtf8(base64);
      } catch {
        const base64 = await NitroFS.readFile(`file://${path}`, 'base64');
        return decodeBase64ToUtf8(base64);
      }
    }
  }
}
