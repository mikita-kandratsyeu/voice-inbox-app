export type MessageStatus = 'processing' | 'done' | 'error';

/** Async meeting-dialogue pass (Pro meeting notes); set when `status` is already `done`. */
export type MeetingDialogueStatus = 'processing' | 'done' | 'failed' | 'skipped';

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
  /** OpenRouter reasoning trace (Smart summary job); optional. */
  reasoning?: string;
  /** Tokens charged for this summary job (main + optional meeting pass). */
  tokenUsage?: { prompt: number; completion: number };
};

export type Message =
  | { id: string; status: 'processing'; model?: string; modelLabel?: string }
  | {
      id: string;
      status: 'done';
      model?: string;
      modelLabel?: string;
      summary: string;
      suggestedTitle: string;
      tasks: AiResult['tasks'];
      tags: string[];
      classification?: RecordClassification;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogueMarkdown?: string;
      meetingDialogueStatus?: MeetingDialogueStatus;
      reasoning?: string;
      tokenUsage?: { prompt: number; completion: number };
    }
  | { id: string; status: 'error'; error: string; model?: string; modelLabel?: string };

export type AskMessage =
  | { id: string; status: 'processing'; model?: string; modelLabel?: string }
  | {
      id: string;
      status: 'done';
      model?: string;
      modelLabel?: string;
      answer: string;
      answerKind?: 'plain' | 'list' | 'tasks' | 'decisions';
      items?: string[];
      suggestedFollowUps?: string[];
      evidence?: Array<{
        quote: string;
        source?: 'transcript' | 'summary' | 'tasks' | 'recording_mark' | 'prior_conversation';
        offsetMs?: number | null;
        label?: string;
      }>;
    }
  | { id: string; status: 'error'; error: string; model?: string; modelLabel?: string };

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
