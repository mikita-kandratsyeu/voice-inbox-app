import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { TaskListItemPressEvent } from 'react-native-enriched-markdown';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';

import { buildNoteDocumentEnrichedMarkdownStyle } from '../lib/enrichedMarkdownTheme';
import { stripNoteDocumentMarkers } from '../lib/noteDocumentSectionMarkers';
import {
  type NoteDocumentReadingSectionSegment,
  splitNoteDocumentForReading,
} from '../lib/splitNoteDocumentForReading';
import { NoteDocumentCollapsibleSection } from './NoteDocumentCollapsibleSection';
import { NoteDocumentEnhancedMarkdown } from './NoteDocumentEnhancedMarkdown';

type NoteDocumentReadingBodyProps = {
  color: Colors;
  documentMarkdown: string;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

type NoteDocumentReadingSectionRowProps = {
  color: Colors;
  markdownStyle: ReturnType<typeof buildNoteDocumentEnrichedMarkdownStyle>;
  segment: NoteDocumentReadingSectionSegment;
  expanded: boolean;
  onToggle: (sectionId: string, defaultExpanded: boolean) => void;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

function buildInitialExpandedState(
  sections: NoteDocumentReadingSectionSegment[],
): Record<string, boolean> {
  return Object.fromEntries(sections.map((section) => [section.id, section.defaultExpanded]));
}

const NoteDocumentReadingSectionRow = React.memo(function NoteDocumentReadingSectionRow({
  color,
  markdownStyle,
  segment,
  expanded,
  onToggle,
  tasks,
  onToggleTask,
}: NoteDocumentReadingSectionRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(segment.id, segment.defaultExpanded);
  }, [onToggle, segment.defaultExpanded, segment.id]);

  const handleTaskListItemPress = useCallback(
    (event: TaskListItemPressEvent) => {
      if (segment.id !== 'tasks') return;
      const task = tasks[event.index];
      if (task) {
        onToggleTask(task.id);
      }
    },
    [onToggleTask, segment.id, tasks],
  );

  return (
    <NoteDocumentCollapsibleSection
      color={color}
      title={segment.title}
      expanded={expanded}
      onToggle={handleToggle}
    >
      <NoteDocumentEnhancedMarkdown
        color={color}
        markdown={segment.bodyMarkdown}
        markdownStyle={markdownStyle}
        onTaskListItemPress={segment.id === 'tasks' ? handleTaskListItemPress : undefined}
      />
    </NoteDocumentCollapsibleSection>
  );
});

export const NoteDocumentReadingBody = React.memo(function NoteDocumentReadingBody({
  color,
  documentMarkdown,
  tasks,
  onToggleTask,
}: NoteDocumentReadingBodyProps) {
  const markdownStyle = useMemo(() => buildNoteDocumentEnrichedMarkdownStyle(color), [color]);
  const layout = useMemo(() => splitNoteDocumentForReading(documentMarkdown), [documentMarkdown]);
  const flatMarkdown = useMemo(
    () => stripNoteDocumentMarkers(documentMarkdown),
    [documentMarkdown],
  );
  const sectionSegments = useMemo(
    () =>
      layout.segments.filter(
        (segment): segment is NoteDocumentReadingSectionSegment => segment.kind === 'section',
      ),
    [layout.segments],
  );

  const [expandedBySectionId, setExpandedBySectionId] = useState<Record<string, boolean>>(() =>
    buildInitialExpandedState(sectionSegments),
  );

  useEffect(() => {
    setExpandedBySectionId((current) => {
      const next = { ...current };
      let changed = false;

      for (const section of sectionSegments) {
        if (!(section.id in next)) {
          next[section.id] = section.defaultExpanded;
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [sectionSegments]);

  const toggleSection = useCallback((sectionId: string, defaultExpanded: boolean) => {
    setExpandedBySectionId((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? defaultExpanded),
    }));
  }, []);

  if (!layout.hasSections) {
    return (
      <NoteDocumentEnhancedMarkdown
        color={color}
        markdown={flatMarkdown}
        markdownStyle={markdownStyle}
      />
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {layout.segments.map((segment) => {
        if (segment.kind === 'preamble') {
          return (
            <NoteDocumentEnhancedMarkdown
              key="preamble"
              color={color}
              markdown={segment.markdown}
              markdownStyle={markdownStyle}
            />
          );
        }

        return (
          <NoteDocumentReadingSectionRow
            key={segment.id}
            color={color}
            markdownStyle={markdownStyle}
            segment={segment}
            expanded={expandedBySectionId[segment.id] ?? segment.defaultExpanded}
            onToggle={toggleSection}
            tasks={tasks}
            onToggleTask={onToggleTask}
          />
        );
      })}
    </View>
  );
});
