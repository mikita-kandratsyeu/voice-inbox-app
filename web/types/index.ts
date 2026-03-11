export type MessageStatus = 'processing' | 'done' | 'error';

export type AiResult = {
  summary: string;
  tasks: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    deadline: string | null;
  }>;
  tags: string[];
};

export type Message =
  | { id: string; status: 'processing' }
  | {
      id: string;
      status: 'done';
      summary: string;
      tasks: AiResult['tasks'];
      tags: string[];
    }
  | { id: string; status: 'error'; error: string };
