export type RecordStatus = 'unread' | 'read' | 'archived';

export type RecordingStatus = 'idle' | 'processing' | 'done' | 'error';

export type TranscriptSegment = {
  id: string;
  startTime: string;
  text: string;
};

export type TaskItem = {
  id: string;
  text: string;
  isDone: boolean;
  deadline?: string | null;
  priority?: 'high' | 'medium' | 'low';
};

export type VoiceRecord = {
  id: string;
  title: string;
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  summary?: string;
  summaryStatus?: RecordingStatus;
  tasks?: TaskItem[];
  tasksStatus?: RecordingStatus;
  duration: string;
  durationMs?: number;
  createdAt: string;
  relativeTime?: string;
  status: RecordStatus;
  aiStatus?: RecordingStatus;
  transcriptProgress?: number;
  // Метка прогресса для длинных записей: "Обработано N из M фрагментов..."
  transcriptProgressLabel?: string;
  isPinned?: boolean;
  tags?: string[];
  audioPath?: string;
};
