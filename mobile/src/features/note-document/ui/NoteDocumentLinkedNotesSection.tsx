import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildLinkedNotesReadingMarkdown,
  type WikiLinkResolvableRecord,
} from '@/features/note-links';
import type { Colors } from '@/shared/config';
import { useIsTablet } from '@/shared/lib';

import {
  buildNoteDocumentSectionBodyMarkdownStyle,
} from '../lib/enrichedMarkdownTheme';
import { NoteDocumentCollapsibleSection } from './NoteDocumentCollapsibleSection';
import { NoteDocumentEnhancedMarkdown } from './NoteDocumentEnhancedMarkdown';

type NoteDocumentLinkedNotesSectionProps = {
  color: Colors;
  linkedRecordIds: string[];
  wikiLinkRecords?: readonly WikiLinkResolvableRecord[];
  onOpenRecord?: (recordId: string) => void;
};

export const NoteDocumentLinkedNotesSection = React.memo(function NoteDocumentLinkedNotesSection({
  color,
  linkedRecordIds,
  wikiLinkRecords,
  onOpenRecord,
}: NoteDocumentLinkedNotesSectionProps) {
  const { t } = useTranslation();
  const isTablet = useIsTablet();
  const [expanded, setExpanded] = useState(true);
  const markdownStyle = useMemo(
    () => buildNoteDocumentSectionBodyMarkdownStyle(color, { isTablet }),
    [color, isTablet],
  );

  const linkedNotesMarkdown = useMemo(
    () =>
      buildLinkedNotesReadingMarkdown(
        linkedRecordIds,
        wikiLinkRecords ?? [],
        t('noteLinks.linked'),
      ),
    [linkedRecordIds, t, wikiLinkRecords],
  );

  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  if (!linkedNotesMarkdown) return null;

  return (
    <NoteDocumentCollapsibleSection
      color={color}
      title={t('noteLinks.linked')}
      expanded={expanded}
      onToggle={handleToggle}
      variant="reading"
      sectionId="linked"
    >
      <NoteDocumentEnhancedMarkdown
        color={color}
        markdown={linkedNotesMarkdown}
        markdownStyle={markdownStyle}
        wikiLinkRecords={wikiLinkRecords}
        onOpenRecord={onOpenRecord}
      />
    </NoteDocumentCollapsibleSection>
  );
});
