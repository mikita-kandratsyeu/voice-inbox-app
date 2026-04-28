import type {
  AiOutputLanguage,
  LocalAiModelId,
  PrivateLocalLlmBudget,
  SummaryStyle,
  TaskStrictness,
  UserSelectableAIModelId,
} from '@/entities/settings';
import type { AiProcessingResult } from '@/shared/lib/ai-api';

export type AiTaskIntent = 'summary_tasks' | 'ask';
export type AiProviderKind = 'cloud' | 'local';

export type AiLocalGenerationProgressEvent =
  | { kind: 'prepare_model_start' }
  | { kind: 'prepare_model_done' }
  | { kind: 'completion_token'; tokenIndex: number; nPredictBudget: number };

export type AiExecutionContext = {
  selectedAIModel: UserSelectableAIModelId;
  aiModelRoutingMode: 'manual' | 'auto';
  selectedLocalAiModel: LocalAiModelId;
  isLocalLlmModelDownloaded: boolean;
  summaryStyle: SummaryStyle;
  taskStrictness: TaskStrictness;
  aiOutputLanguage: AiOutputLanguage;
  aiExecutionMode: 'smart_hybrid' | 'private_experimental';
  privateLocalLlmBudget: PrivateLocalLlmBudget;
  privateCapabilityTier: 'full' | 'limited' | 'unavailable';
};

export type SummaryTaskRequest = {
  id: string;
  transcript: string;
  existingTaskTexts?: string[];
  taskExtractionHint?: string;
  onLocalGenerationProgress?: (event: AiLocalGenerationProgressEvent) => void;
};

export type AskPriorTurn = { question: string; answer: string };

export type AskRequest = {
  id: string;
  transcript: string;
  question: string;
  priorTurns?: AskPriorTurn[];
  summary?: string;
  tasks?: Array<{ text: string }>;
  onLocalGenerationProgress?: (event: AiLocalGenerationProgressEvent) => void;
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
export type AskTaskResult = AiOrchestratorResult<{ answer: string; model?: string }>;
