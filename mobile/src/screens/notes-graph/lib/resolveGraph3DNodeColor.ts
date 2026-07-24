import type { Folder } from '@/entities/folder';
import type { Colors } from '@/shared/config';
import { resolveDisplayFolderColor } from '@/shared/lib';

import type { GraphNode } from '../lib/graphTypes';

export function resolveGraph3DNodeColor(
  node: GraphNode,
  color: Colors,
  foldersById: Map<string, Folder>,
  isProActive: boolean,
): string {
  if (node.kind === 'task' && node.task) {
    if (node.task.isDone) {
      return color.text.muted;
    }
    if (node.task.priority === 'high') {
      return color.accent.delete;
    }
    if (node.task.priority === 'medium') {
      return color.accent.cache;
    }
    return color.accent.primary;
  }

  if (node.kind === 'record') {
    const folderId = node.record?.folderId;
    if (folderId) {
      const folderColor = foldersById.get(folderId)?.color;
      if (folderColor) {
        return resolveDisplayFolderColor(folderColor, isProActive);
      }
    }
    if (node.record?.status === 'archived') {
      return color.accent.archive;
    }
    return color.accent.primary;
  }

  return color.accent.primary;
}
