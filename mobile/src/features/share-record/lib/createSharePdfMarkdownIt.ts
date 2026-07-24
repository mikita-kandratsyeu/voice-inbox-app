import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

/**
 * PDF export markdown parser with GitHub Flavored Markdown used in share exports:
 * - tables + strikethrough: built into markdown-it 14 default preset
 * - task lists (`- [ ]` / `- [x]`): markdown-it-task-lists
 *
 * `@mdit/plugin-gfm` is not published on npm; this factory is the single GFM entry point.
 */
export function createSharePdfMarkdownIt(): MarkdownIt {
  return new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true,
  }).use(markdownItTaskLists, { enabled: false, label: true });
}
