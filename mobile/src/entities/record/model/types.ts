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
};

export type VoiceRecord = {
  id: string;
  title: string;
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  summary?: string;
  tasks?: TaskItem[];
  duration: string;
  createdAt: string;
  relativeTime?: string;
  status: RecordStatus;
  aiStatus?: RecordingStatus;
  transcriptProgress?: number;
  isPinned?: boolean;
  tags?: string[];
  audioPath?: string;
};
