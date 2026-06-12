import React, { useEffect, useMemo, useState } from 'react';
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

function buildInitialExpandedState(sections: NoteDocumentReadingSectionSegment[]): Record<string, boolean> {
  return Object.fromEntries(sections.map((section) => [section.id, section.defaultExpanded]));
}

export function NoteDocumentReadingBody({
  color,
  documentMarkdown,
  tasks,
  onToggleTask,
}: NoteDocumentReadingBodyProps) {
  const layout = useMemo(() => splitNoteDocumentForReading(documentMarkdown), [documentMarkdown]);
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

  if (!layout.hasSections) {
    return (
      <NoteMarkdown color={color} variant="document">
        {stripNoteDocumentMarkers(documentMarkdown)}
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

        const expanded = expandedBySectionId[segment.id] ?? segment.defaultExpanded;
        const toggle = () => {
          setExpandedBySectionId((current) => ({
            ...current,
            [segment.id]: !expanded,
          }));
        };

        return (
          <NoteDocumentCollapsibleSection
            key={segment.id}
            color={color}
            title={segment.title}
            expanded={expanded}
            onToggle={toggle}
          >
            {segment.id === 'tasks' && tasks.length > 0 ? (
              <NoteDocumentInteractiveTaskList
                color={color}
                tasks={tasks}
                onToggleTask={onToggleTask}
              />
            ) : (
              <NoteMarkdown color={color} variant="document">
                {segment.bodyMarkdown}
              </NoteMarkdown>
            )}
          </NoteDocumentCollapsibleSection>
        );
      })}
    </View>
  );
}
