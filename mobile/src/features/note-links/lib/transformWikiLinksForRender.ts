import { buildNoteInternalLinkUrl } from './noteInternalLinkScheme';
import {
  buildWikiLinkIndex,
  resolveWikiLinkTarget,
  type WikiLinkResolvableRecord,
} from './resolveWikiLinkTarget';

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function escapeMarkdownLinkLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

export function transformWikiLinksForRender(
  markdown: string,
  records: readonly WikiLinkResolvableRecord[],
): string {
  const index = buildWikiLinkIndex(records);

  return markdown.replace(WIKI_LINK_REGEX, (full, ref: string, alias?: string) => {
    const targetId = resolveWikiLinkTarget(ref, index);
    if (!targetId) return full;

    const label = escapeMarkdownLinkLabel(alias?.trim() || ref.trim());
    return `[${label}](${buildNoteInternalLinkUrl(targetId)})`;
  });
}
