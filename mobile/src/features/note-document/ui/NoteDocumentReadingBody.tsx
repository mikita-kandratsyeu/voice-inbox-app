import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { TaskListItemPressEvent } from 'react-native-enriched-markdown';

import type { TaskItem } from '@/entities/record';
import type { WikiLinkResolvableRecord } from '@/features/note-links';
import type { Colors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';

import {
  buildNoteDocumentReadingMarkdownStyle,
  buildNoteDocumentSectionBodyMarkdownStyle,
} from '../lib/enrichedMarkdownTheme';
import { stripNoteDocumentMarkers } from '../lib/noteDocumentSectionMarkers';
import {
  type NoteDocumentReadingSectionSegment,
  splitNoteDocumentForReading,
} from '../lib/splitNoteDocumentForReading';
import { splitNoteDocumentPreamble } from '../lib/splitNoteDocumentPreamble';
import { NoteDocumentCollapsibleSection } from './NoteDocumentCollapsibleSection';
import { NoteDocumentEnhancedMarkdown } from './NoteDocumentEnhancedMarkdown';
import { NoteDocumentLinkedNotesSection } from './NoteDocumentLinkedNotesSection';
import { NoteDocumentReadingHero } from './NoteDocumentReadingHero';

type NoteDocumentReadingBodyProps = {
  color: Colors;
  documentMarkdown: string;
  tasks: TaskItem[];
  linkedRecordIds?: string[];
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[];
  onOpenRecord?: (recordId: string) => void;
  onToggleTask: (taskId: string) => void;
};

type NoteDocumentReadingSectionRowProps = {
  color: Colors;
  markdownStyle: ReturnType<typeof buildNoteDocumentSectionBodyMarkdownStyle>;
  segment: NoteDocumentReadingSectionSegment;
  expanded: boolean;
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[];
  onOpenRecord?: (recordId: string) => void;
  onToggle: (sectionId: string, defaultExpanded: boolean) => void;
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

const READING_SECTION_GAP = 20;

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
  wikiLinkRecords,
  onOpenRecord,
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
      variant="reading"
      sectionId={segment.id}
    >
      <NoteDocumentEnhancedMarkdown
        color={color}
        markdown={segment.bodyMarkdown}
        markdownStyle={markdownStyle}
        wikiLinkRecords={wikiLinkRecords}
        onOpenRecord={onOpenRecord}
        onTaskListItemPress={segment.id === 'tasks' ? handleTaskListItemPress : undefined}
      />
    </NoteDocumentCollapsibleSection>
  );
});

export const NoteDocumentReadingBody = React.memo(function NoteDocumentReadingBody({
  color,
  documentMarkdown,
  tasks,
  linkedRecordIds = [],
  wikiLinkRecords,
  onOpenRecord,
  onToggleTask,
}: NoteDocumentReadingBodyProps) {
  const isTablet = useIsTablet();
  const readingMarkdownStyle = useMemo(
    () => buildNoteDocumentReadingMarkdownStyle(color, { isTablet }),
    [color, isTablet],
  );
  const sectionMarkdownStyle = useMemo(
    () => buildNoteDocumentSectionBodyMarkdownStyle(color, { isTablet }),
    [color, isTablet],
  );
  const layout = useMemo(() => splitNoteDocumentForReading(documentMarkdown), [documentMarkdown]);
  const flatMarkdown = useMemo(
    () => stripNoteDocumentMarkers(documentMarkdown),
    [documentMarkdown],
  );
  const flatPreamble = useMemo(() => splitNoteDocumentPreamble(flatMarkdown), [flatMarkdown]);
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

  const linkedNotesBlock = (
    <NoteDocumentLinkedNotesSection
      color={color}
      linkedRecordIds={linkedRecordIds}
      wikiLinkRecords={wikiLinkRecords}
      onOpenRecord={onOpenRecord}
    />
  );

  if (!layout.hasSections) {
    return (
      <View style={{ gap: READING_SECTION_GAP }}>
        <NoteDocumentReadingHero color={color} parts={flatPreamble} />
        {flatPreamble.bodyMarkdown ? (
          <NoteDocumentEnhancedMarkdown
            color={color}
            markdown={flatPreamble.bodyMarkdown}
            markdownStyle={readingMarkdownStyle}
            wikiLinkRecords={wikiLinkRecords}
            onOpenRecord={onOpenRecord}
          />
        ) : null}
        {linkedNotesBlock}
      </View>
    );
  }

  return (
    <View style={{ gap: READING_SECTION_GAP }}>
      {layout.segments.map((segment) => {
        if (segment.kind === 'preamble') {
          const preamble = splitNoteDocumentPreamble(segment.markdown);

          return (
            <View key="preamble" style={{ gap: 12 }}>
              <NoteDocumentReadingHero color={color} parts={preamble} />
              {preamble.bodyMarkdown ? (
                <NoteDocumentEnhancedMarkdown
                  color={color}
                  markdown={preamble.bodyMarkdown}
                  markdownStyle={readingMarkdownStyle}
                  wikiLinkRecords={wikiLinkRecords}
                  onOpenRecord={onOpenRecord}
                />
              ) : null}
            </View>
          );
        }

        return (
          <NoteDocumentReadingSectionRow
            key={segment.id}
            color={color}
            markdownStyle={sectionMarkdownStyle}
            segment={segment}
            expanded={expandedBySectionId[segment.id] ?? segment.defaultExpanded}
            wikiLinkRecords={wikiLinkRecords}
            onOpenRecord={onOpenRecord}
            onToggle={toggleSection}
            tasks={tasks}
            onToggleTask={onToggleTask}
          />
        );
      })}
      {linkedNotesBlock}
    </View>
  );
});
