import type {
  AiOutputLanguage,
  LocalAiModelId,
  SummaryStyle,
  TaskStrictness,
  UserSelectableAIModelId,
} from '@/entities/settings';
import type { AiProcessingResult } from '@/shared/lib/ai-api';

export type AiTaskIntent = 'summary_tasks' | 'ask';
export type AiProviderKind = 'cloud' | 'local';

export type AiExecutionContext = {
  selectedAIModel: UserSelectableAIModelId;
  selectedLocalAiModel: LocalAiModelId;
  isLocalLlmModelDownloaded: boolean;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: 'smart_hybrid' | 'private_experimental';
  privateCapabilityTier: 'full' | 'limited' | 'unavailable';
};

export type SummaryTaskRequest = {
  id: string;
  transcript: string;
};

export type AskRequest = {
  id: string;
  transcript: string;
  question: string;
  summary?: string;
  tasks?: Array<{ text: string }>;
};

export type AiOrchestratorSuccess<T> = {
  ok: true;
  provider: AiProviderKind;
  mode: 'smart_hybrid' | 'private_experimental';
  result: T;
};

export type AiOrchestratorFailure = {
  ok: false;
  provider: AiProviderKind;
  mode: 'smart_hybrid' | 'private_experimental';
  limitExceeded?: boolean;
  usage?: { used: number; limit: number; resetAt: string };
  error: string;
};

export type AiOrchestratorResult<T> = AiOrchestratorSuccess<T> | AiOrchestratorFailure;

export type SummaryTaskResult = AiOrchestratorResult<AiProcessingResult>;
export type AskTaskResult = AiOrchestratorResult<{ answer: string }>;
