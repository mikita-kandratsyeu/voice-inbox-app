import { MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS } from '@/config/constants';
import { isAiJobCancelled } from '@/lib/ai-job-cancel';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import {
  buildMeetingDialogueUserContent,
  type MeetingDialogueUserPromptInput,
} from '@/lib/meeting-dialogue-user-prompt';
import { mergeOpenRouterTokenUsage } from '@/lib/openrouter-token-usage';
import { getMessage, saveMessage } from '@/lib/redis';
import { processMeetingDialogueMarkdown } from '@/services/ai.service';
import type { MeetingDialogueJobPayload } from '@/types/ai-job';
import type { Message } from '@/types';

function shouldOmitFullTranscript(input: MeetingDialogueUserPromptInput): boolean {
  return (
    Boolean(input.segments?.length) &&
    input.plainTranscript.trim().length > MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS
  );
}

export async function runMeetingDialogueJob(payload: MeetingDialogueJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    phase1,
    clientUserAgent,
  } = payload;

  if (await isAiJobCancelled(id)) {
    return;
  }

  const existing = await getMessage(id);
  if (!existing || existing.status !== 'done') {
    throw new Error('Meeting dialogue job requires a completed summarize message');
  }

  const mdStatus = (existing as { meetingDialogueStatus?: string }).meetingDialogueStatus;
  if (mdStatus === 'skipped' || mdStatus === 'done' || mdStatus === 'failed') {
    return;
  }

  const promptInput: MeetingDialogueUserPromptInput = {
    plainTranscript: transcript,
    segments: meetingDialogueAux?.transcriptSegments,
    phase1,
    taskExtractionHint: meetingDialogueAux?.taskExtractionHint,
    omitFullTranscript: false,
  };
  promptInput.omitFullTranscript = shouldOmitFullTranscript(promptInput);

  try {
    const mdUserContent = buildMeetingDialogueUserContent(promptInput);
    const mdPart = await processMeetingDialogueMarkdown(
      mdUserContent,
      meetingDialogueSystemPrompt.trim(),
      clientUserAgent,
      deviceId,
    );

    if (await isAiJobCancelled(id)) {
      return;
    }

    const done = existing as Extract<Message, { status: 'done' }>;
    const mergedTokenUsage = mergeOpenRouterTokenUsage(done.tokenUsage, mdPart.tokenUsage);

    await saveMessage(
      id,
      {
        ...done,
        ...(mdPart.meetingDialogueMarkdown?.trim()
          ? { meetingDialogueMarkdown: mdPart.meetingDialogueMarkdown.trim() }
          : {}),
        meetingDialogueStatus: 'done',
        ...(mergedTokenUsage ? { tokenUsage: mergedTokenUsage } : {}),
      },
      ttl,
    );

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'Meeting dialogue complete',
    });
  } catch (err) {
    const done = existing as Extract<Message, { status: 'done' }>;
    if (!isRetryableAiJobError(err)) {
      await saveMessage(
        id,
        {
          ...done,
          meetingDialogueStatus: 'failed',
        },
        ttl,
      );
    }
    throw err;
  }
}
