/** Heuristic: whether to offer Markdown preview for backup text fields. */
export function looksLikeMarkdown(text: string): boolean {
  const s = text.trim();
  if (s.length < 2) return false;
  if (/^\s{0,3}#{1,6}\s/m.test(s)) return true;
  if (/\*\*[^*\n][^*]*\*\*/.test(s)) return true;
  if (/^\s*[-*+]\s+\S/m.test(s)) return true;
  if (/^\s*\d+\.\s+\S/m.test(s)) return true;
  if (/\[[^\]]+\]\([^)\s]+\)/.test(s)) return true;
  if (/^>{1}\s/m.test(s)) return true;
  if (/```[\s\S]*?```/.test(s)) return true;
  return false;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function triggerTextFileDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function buildNoteDownloadBasename(title: string, id: string): string {
  const base =
    (title.trim() || 'note')
      .slice(0, 48)
      .replace(/[/\\?%*:|"<>#]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'note';
  return `${base}-${id.slice(0, 8)}`;
}
