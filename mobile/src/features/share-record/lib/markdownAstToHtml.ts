import type { MarkdownNode } from 'react-native-nitro-markdown/headless';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderChildren(node: MarkdownNode): string {
  return (node.children ?? []).map(renderMarkdownNode).join('');
}

function renderInlineChildren(node: MarkdownNode): string {
  return (node.children ?? []).map(renderMarkdownNode).join('');
}

function renderMarkdownNode(node: MarkdownNode): string {
  switch (node.type) {
    case 'document':
      return renderChildren(node);
    case 'heading': {
      const level = node.level ?? 1;
      const tag = `h${Math.min(6, Math.max(1, level))}`;
      return `<${tag}>${renderInlineChildren(node)}</${tag}>`;
    }
    case 'paragraph':
      return `<p>${renderInlineChildren(node)}</p>`;
    case 'text':
      return escapeHtml(node.content ?? '');
    case 'bold':
      return `<strong>${renderInlineChildren(node)}</strong>`;
    case 'italic':
      return `<em>${renderInlineChildren(node)}</em>`;
    case 'strikethrough':
      return `<s>${renderInlineChildren(node)}</s>`;
    case 'link': {
      const href = escapeHtml(node.href ?? '#');
      const title = node.title ? ` title="${escapeHtml(node.title)}"` : '';
      return `<a href="${href}"${title}>${renderInlineChildren(node)}</a>`;
    }
    case 'code_inline':
      return `<code>${escapeHtml(node.content ?? '')}</code>`;
    case 'code_block':
      return `<pre><code>${escapeHtml(node.content ?? '')}</code></pre>`;
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`;
    case 'horizontal_rule':
      return '<hr />';
    case 'line_break':
    case 'soft_break':
      return '<br />';
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const start = node.ordered && node.start && node.start > 1 ? ` start="${node.start}"` : '';
      const className =
        !node.ordered && (node.children ?? []).some((child) => child.type === 'task_list_item')
          ? ' class="contains-task-list"'
          : '';
      return `<${tag}${start}${className}>${renderChildren(node)}</${tag}>`;
    }
    case 'list_item':
      return `<li>${renderChildren(node)}</li>`;
    case 'task_list_item': {
      const checked = node.checked ? ' checked' : '';
      return `<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled${checked} />${renderChildren(node)}</li>`;
    }
    case 'table':
      return `<table>${renderChildren(node)}</table>`;
    case 'table_head':
      return `<thead>${renderChildren(node)}</thead>`;
    case 'table_body':
      return `<tbody>${renderChildren(node)}</tbody>`;
    case 'table_row':
      return `<tr>${renderChildren(node)}</tr>`;
    case 'table_cell': {
      const tag = node.isHeader ? 'th' : 'td';
      const align = node.align ? ` style="text-align:${node.align}"` : '';
      return `<${tag}${align}>${renderChildren(node)}</${tag}>`;
    }
    case 'math_inline':
    case 'math_block':
      return `<code>${escapeHtml(node.content ?? '')}</code>`;
    case 'html_block':
    case 'html_inline':
      return node.content ?? '';
    case 'image': {
      const src = escapeHtml(node.href ?? '');
      const alt = escapeHtml(node.alt ?? '');
      return `<img src="${src}" alt="${alt}" />`;
    }
    default:
      return renderChildren(node);
  }
}

/** Renders a Nitro Markdown AST into an HTML fragment for PDF export. */
export function markdownAstToHtml(root: MarkdownNode): string {
  return renderMarkdownNode(root);
}
