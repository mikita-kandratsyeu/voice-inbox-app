export type RecordStatus = 'unread' | 'read' | 'archived';

export type VoiceRecord = {
  id: string;
  title: string;
  transcript: string;
  duration: string;
  createdAt: string;
  status: RecordStatus;
  isPinned?: boolean;
  tags?: string[];
};
