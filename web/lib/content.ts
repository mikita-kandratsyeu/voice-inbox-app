import { readFile } from 'fs/promises';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export async function getMarkdownContent(
  doc: 'privacy' | 'terms',
  locale: string,
): Promise<string> {
  const localeSuffix = locale === 'en' ? 'en' : 'ru';
  const filename = `${doc}.${localeSuffix}.md`;
  const filePath = path.join(CONTENT_DIR, filename);

  try {
    return await readFile(filePath, 'utf-8');
  } catch (err) {
    const fallbackPath = path.join(CONTENT_DIR, `${doc}.en.md`);
    return readFile(fallbackPath, 'utf-8');
  }
}
