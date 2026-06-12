import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { NoteMarkdown } from '@/shared/ui/NoteMarkdown';

import { stripNoteDocumentMarkers } from '../lib/noteDocumentSectionMarkers';
import { splitNoteDocumentAtTasksSection } from '../lib/splitNoteDocumentAtTasksSection';
import { NoteDocumentInteractiveTaskList } from './NoteDocumentInteractiveTaskList';

type NoteDocumentReadingBodyProps = {
  color: Colors;
  documentMarkdown: string;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

export function NoteDocumentReadingBody({
  color,
  documentMarkdown,
  tasks,
  onToggleTask,
}: NoteDocumentReadingBodyProps) {
  const split = useMemo(
    () => splitNoteDocumentAtTasksSection(documentMarkdown),
    [documentMarkdown],
  );

  if (!split || tasks.length === 0) {
    return (
      <NoteMarkdown color={color} variant="document">
        {stripNoteDocumentMarkers(documentMarkdown)}
      </NoteMarkdown>
    );
  }

  return (
    <View>
      {split.beforeMarkdown.length > 0 ? (
        <NoteMarkdown color={color} variant="document">
          {split.beforeMarkdown}
        </NoteMarkdown>
      ) : null}
      <NoteDocumentInteractiveTaskList color={color} tasks={tasks} onToggleTask={onToggleTask} />
      {split.afterMarkdown.length > 0 ? (
        <NoteMarkdown color={color} variant="document">
          {split.afterMarkdown}
        </NoteMarkdown>
      ) : null}
    </View>
  );
}
