import type { LucideIcon } from 'lucide-react-native';
import {
  AudioLines,
  Footprints,
  GitBranch,
  Languages,
  ListTodo,
  MessagesSquare,
  Quote,
  Sparkles,
  Speech,
  Tags,
} from 'lucide-react-native';

/** Distinct Lucide icons per `vi:section:*` id for reading-mode section headers. */
export const NOTE_DOCUMENT_SECTION_ICONS: Record<string, LucideIcon> = {
  tags: Tags,
  summary: Sparkles,
  'key-phrases': Quote,
  tasks: ListTodo,
  'next-steps': Footprints,
  transcript: AudioLines,
  translation: Languages,
  'meeting-dialogue': MessagesSquare,
  'speaker-turns': Speech,
  linked: GitBranch,
};

export function resolveNoteDocumentSectionIcon(sectionId?: string): LucideIcon | null {
  if (!sectionId) return null;
  return NOTE_DOCUMENT_SECTION_ICONS[sectionId] ?? null;
}
