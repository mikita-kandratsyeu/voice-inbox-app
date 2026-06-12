import type { TaskItem } from '@/entities/record';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Flips a GFM task checkbox line for one task (keeps optional meta suffix). */
export function patchTaskDoneInNoteDocumentMarkdown(
  markdown: string,
  task: TaskItem,
  isDone: boolean,
): string {
  const text = task.text.trim();
  if (!text) return markdown;

  const re = new RegExp(
    `^(\\-\\s+\\[)[ xX](\\]\\s+${escapeRegExp(text)}(?:\\s+\\([^)]+\\))?)`,
    'gm',
  );

  return markdown.replace(re, `$1${isDone ? 'x' : ' '}$2`);
}
