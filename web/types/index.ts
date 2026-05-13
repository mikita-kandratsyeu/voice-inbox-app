export type MessageStatus = 'processing' | 'done' | 'error';

export type RecordClassification = 'personal' | 'work' | 'meeting' | 'idea' | 'other';

export type AiResult = {
  summary: string;
  suggestedTitle: string;
  tasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string | null;
  }>;
  tags: string[];
  classification?: RecordClassification;
  keyPhrases?: string[];
  nextSteps?: string[];
  /** Pro + meeting pseudo-diarization; plain text, optional. */
  meetingDialogueMarkdown?: string;
};

export type Message =
  | { id: string; status: 'processing'; model?: string }
  | {
      id: string;
      status: 'done';
      model?: string;
      summary: string;
      suggestedTitle: string;
      tasks: AiResult['tasks'];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogueMarkdown?: string;
    }
  | { id: string; status: 'error'; error: string; model?: string };

export type AskMessage =
  | { id: string; status: 'processing'; model?: string }
  | { id: string; status: 'done'; model?: string; answer: string }
  | { id: string; status: 'error'; error: string; model?: string };

export type AutoOrganizeResult = {
  folders: Array<{
    name: string;
    icon: string;
    color: string;
  }>;
  assignments: Array<{
    recordId: string;
    folderName: string;
  }>;
};

export type AutoOrganizeMessage =
  | { id: string; status: 'processing' }
  | { id: string; status: 'done'; result: AutoOrganizeResult }
  | { id: string; status: 'error'; error: string };
