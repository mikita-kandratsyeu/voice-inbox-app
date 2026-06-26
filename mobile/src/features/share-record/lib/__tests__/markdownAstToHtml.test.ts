import type { MarkdownNode } from 'react-native-nitro-markdown/headless';

import { markdownAstToHtml } from '../markdownAstToHtml';

describe('markdownAstToHtml', () => {
  it('renders headings, task lists, and tables', () => {
    const ast: MarkdownNode = {
      type: 'document',
      children: [
        { type: 'heading', level: 1, children: [{ type: 'text', content: 'Title' }] },
        {
          type: 'list',
          ordered: false,
          children: [
            {
              type: 'task_list_item',
              checked: true,
              children: [{ type: 'text', content: 'done' }],
            },
          ],
        },
        {
          type: 'table',
          children: [
            {
              type: 'table_head',
              children: [
                {
                  type: 'table_row',
                  children: [
                    {
                      type: 'table_cell',
                      isHeader: true,
                      children: [{ type: 'text', content: 'A' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const html = markdownAstToHtml(ast);

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('task-list-item-checkbox');
    expect(html).toContain('<table>');
    expect(html).toContain('<th');
  });
});
