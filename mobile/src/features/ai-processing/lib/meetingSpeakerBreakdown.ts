import {
  type AiExecutionMode,
  isPrivateCustomServerMode,
  type PrivateAiProvider,
} from '@/entities/settings';

/** Settings → AI: show meeting speaker refresh toggle (Smart or Private + custom server). */
export function isMeetingSpeakerSettingsAvailable(
  aiExecutionMode: AiExecutionMode,
  privateAiProvider: PrivateAiProvider,
  isProActive: boolean,
): boolean {
  if (!isProActive) return false;
  if (aiExecutionMode !== 'private_experimental') return true;
  return isPrivateCustomServerMode(aiExecutionMode, privateAiProvider, isProActive);
}

/** Two-pass summary + participant breakdown (Smart cloud or Private custom OpenAI). */
export function shouldIncludeMeetingSpeakerBreakdown(input: {
  isProActive: boolean;
  recordIsMeeting: boolean;
  wasSummaryRegeneration: boolean;
  aiExecutionMode: AiExecutionMode;
  privateAiProvider: PrivateAiProvider;
  autoRefreshMeetingSpeakersOnRegen: boolean;
  hasNativeSpeakerDiarization?: boolean;
}): boolean {
  if (!input.isProActive || !input.recordIsMeeting) return false;
  if (input.hasNativeSpeakerDiarization) return false;
  if (
    !isMeetingSpeakerSettingsAvailable(
      input.aiExecutionMode,
      input.privateAiProvider,
      input.isProActive,
    )
  ) {
    return false;
  }
  return input.autoRefreshMeetingSpeakersOnRegen || !input.wasSummaryRegeneration;
}
