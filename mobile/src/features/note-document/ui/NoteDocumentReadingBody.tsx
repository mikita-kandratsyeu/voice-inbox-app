import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import type { TaskItem } from '@/entities/record';
import type { Colors } from '@/shared/config';
import { NoteMarkdown } from '@/shared/ui/NoteMarkdown';

import { stripNoteDocumentMarkers } from '../lib/noteDocumentSectionMarkers';
import {
  type NoteDocumentReadingSectionSegment,
  splitNoteDocumentForReading,
} from '../lib/splitNoteDocumentForReading';
import { NoteDocumentCollapsibleSection } from './NoteDocumentCollapsibleSection';
import { NoteDocumentInteractiveTaskList } from './NoteDocumentInteractiveTaskList';

type NoteDocumentReadingBodyProps = {
  color: Colors;
  documentMarkdown: string;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

type NoteDocumentReadingSectionRowProps = {
  color: Colors;
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
  segment,
  expanded,
  onToggle,
  tasks,
  onToggleTask,
}: NoteDocumentReadingSectionRowProps) {
  const handleToggle = useCallback(() => {
    onToggle(segment.id, segment.defaultExpanded);
  }, [onToggle, segment.defaultExpanded, segment.id]);

  return (
    <NoteDocumentCollapsibleSection
      color={color}
      title={segment.title}
      expanded={expanded}
      onToggle={handleToggle}
    >
      {segment.id === 'tasks' && tasks.length > 0 ? (
        <NoteDocumentInteractiveTaskList color={color} tasks={tasks} onToggleTask={onToggleTask} />
      ) : (
        <NoteMarkdown color={color} variant="document">
          {segment.bodyMarkdown}
        </NoteMarkdown>
      )}
    </NoteDocumentCollapsibleSection>
  );
});

export const NoteDocumentReadingBody = React.memo(function NoteDocumentReadingBody({
  color,
  documentMarkdown,
  tasks,
  onToggleTask,
}: NoteDocumentReadingBodyProps) {
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
      <NoteMarkdown color={color} variant="document">
        {flatMarkdown}
      </NoteMarkdown>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {layout.segments.map((segment) => {
        if (segment.kind === 'preamble') {
          return (
            <NoteMarkdown key="preamble" color={color} variant="document">
              {segment.markdown}
            </NoteMarkdown>
          );
        }

        return (
          <NoteDocumentReadingSectionRow
            key={segment.id}
            color={color}
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
