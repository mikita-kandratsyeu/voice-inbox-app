import {
  MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS,
  SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS,
} from '@/config/constants';
import { decrementBy } from '@/lib/ai-rate-limit';
import { isRetryableAiJobError } from '@/lib/ai-job-retry';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import { dispatchMeetingDialogueJob } from '@/lib/meeting-dialogue-dispatch';
import {
  buildMeetingDialogueUserContent,
  type MeetingDialogueUserPromptInput,
} from '@/lib/meeting-dialogue-user-prompt';
import { mergeOpenRouterTokenUsage } from '@/lib/openrouter-token-usage';
import { aiModelResponseFields } from '@/lib/ai-model-display';
import { updateAiUsageLedgerMetadata } from '@/lib/ai-usage-ledger';
import { saveMessage } from '@/lib/redis';
import { processMeetingDialogueMarkdown, processTranscript } from '@/services/ai.service';
import type { MeetingDialogueJobPayload, SummarizeJobPayload } from '@/types/ai-job';
import type { MeetingDialogueStatus } from '@/types';

function shouldOmitFullTranscript(input: MeetingDialogueUserPromptInput): boolean {
  return (
    Boolean(input.segments?.length) &&
    input.plainTranscript.trim().length > MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS
  );
}

function isMeetingDialogueEligible(payload: SummarizeJobPayload): boolean {
  return Boolean(payload.pseudoDiarizationEligible && payload.meetingDialogueSystemPrompt?.trim());
}

async function runInlineMeetingDialogue(
  payload: SummarizeJobPayload,
  mainResult: Awaited<ReturnType<typeof processTranscript>>,
): Promise<Awaited<ReturnType<typeof processTranscript>>> {
  const {
    jobId: id,
    transcript,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    clientUserAgent,
    deviceId,
  } = payload;

  const promptInput: MeetingDialogueUserPromptInput = {
    plainTranscript: transcript,
    segments: meetingDialogueAux?.transcriptSegments,
    phase1: {
      suggestedTitle: mainResult.suggestedTitle,
      keyPhrases: mainResult.keyPhrases,
      summary: mainResult.summary,
    },
    taskExtractionHint: meetingDialogueAux?.taskExtractionHint,
  };
  promptInput.omitFullTranscript = shouldOmitFullTranscript(promptInput);

  try {
    const mdUserContent = buildMeetingDialogueUserContent(promptInput);
    const mdPart = await processMeetingDialogueMarkdown(
      mdUserContent,
      meetingDialogueSystemPrompt!.trim(),
      clientUserAgent,
      deviceId,
    );
    return {
      ...mainResult,
      ...mdPart,
      tokenUsage: mergeOpenRouterTokenUsage(mainResult.tokenUsage, mdPart.tokenUsage),
    };
  } catch (mdErr) {
    console.warn('[AI] meeting dialogue inline failed; returning main extraction only', {
      messageId: id,
      error: mdErr instanceof Error ? mdErr.message : String(mdErr),
    });
    return mainResult;
  }
}

export async function runSummarizeJob(payload: SummarizeJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    model,
    systemPrompt,
    clientUserAgent,
  } = payload;

  try {
    const mainResult = await processTranscript(
      transcript,
      model,
      systemPrompt,
      clientUserAgent,
      deviceId,
    );

    const meetingEligible = isMeetingDialogueEligible(payload);
    const useAsyncMeetingDialogue =
      meetingEligible && transcript.length > SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS;

    let result = mainResult;
    let meetingDialogueStatus: MeetingDialogueStatus | undefined;

    if (meetingEligible && !useAsyncMeetingDialogue) {
      result = await runInlineMeetingDialogue(payload, mainResult);
      meetingDialogueStatus = result.meetingDialogueMarkdown?.trim() ? 'done' : 'failed';
    } else if (useAsyncMeetingDialogue) {
      meetingDialogueStatus = 'processing';
      console.info('[AI] meeting dialogue queued (long transcript)', {
        messageId: id,
        transcriptChars: transcript.length,
        limit: SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS,
      });
    }

    await saveMessage(
      id,
      {
        id,
        status: 'done',
        ...aiModelResponseFields(model),
        summary: result.summary,
        suggestedTitle: result.suggestedTitle,
        tasks: result.tasks,
        tags: result.tags,
        ...(result.classification && { classification: result.classification }),
        ...(result.keyPhrases &&
          result.keyPhrases.length > 0 && {
            keyPhrases: result.keyPhrases,
          }),
        ...(result.nextSteps && result.nextSteps.length > 0 && { nextSteps: result.nextSteps }),
        ...(result.meetingDialogueMarkdown?.trim() && {
          meetingDialogueMarkdown: result.meetingDialogueMarkdown.trim(),
        }),
        ...(meetingDialogueStatus ? { meetingDialogueStatus } : {}),
        ...(result.reasoning?.trim() && { reasoning: result.reasoning.trim() }),
        ...(result.tokenUsage && { tokenUsage: result.tokenUsage }),
      },
      ttl,
    );

    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: 'AI complete',
    });

    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: 'transcript_summarize',
      jobId: id,
      metadata: {
        ...aiModelResponseFields(model),
        chargedUsageUnits: payload.chargedUsageUnits ?? 1,
      },
    });

    if (useAsyncMeetingDialogue) {
      const meetingPayload: MeetingDialogueJobPayload = {
        operation: 'meeting_dialogue',
        jobId: id,
        deviceId,
        messageTtlSeconds: ttl,
        transcript,
        model,
        meetingDialogueSystemPrompt: payload.meetingDialogueSystemPrompt!.trim(),
        meetingDialogueAux: payload.meetingDialogueAux,
        phase1: {
          suggestedTitle: mainResult.suggestedTitle,
          keyPhrases: mainResult.keyPhrases,
          summary: mainResult.summary,
        },
        clientUserAgent,
      };
      await dispatchMeetingDialogueJob(meetingPayload);
    }
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrementBy(deviceId, payload.chargedUsageUnits ?? 1, {
        operation: 'transcript_summarize',
        jobId: id,
        metadata: { model, chargedUsageUnits: payload.chargedUsageUnits ?? 1 },
      });
      await saveMessage(
        id,
        {
          id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          ...aiModelResponseFields(model),
        },
        ttl,
      );
    }
    throw err;
  }
}
