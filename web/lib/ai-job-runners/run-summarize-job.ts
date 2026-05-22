import { decrement } from '@/lib/ai-rate-limit';
import { notifyAiJobComplete } from '@/lib/ai-job-push';
import { buildMeetingDialogueUserContent } from '@/lib/meeting-dialogue-user-prompt';
import { mergeOpenRouterTokenUsage } from '@/lib/openrouter-token-usage';
import { saveMessage } from '@/lib/redis';
import { processMeetingDialogueMarkdown, processTranscript } from '@/services/ai.service';
import type { SummarizeJobPayload } from '@/types/ai-job';

export async function runSummarizeJob(payload: SummarizeJobPayload): Promise<void> {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    model,
    systemPrompt,
    clientUserAgent,
    pseudoDiarizationEligible,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
  } = payload;

  try {
    const mainResult = await processTranscript(transcript, model, systemPrompt, clientUserAgent);

    let result = mainResult;
    if (pseudoDiarizationEligible && meetingDialogueSystemPrompt?.trim()) {
      try {
        const mdUserContent = buildMeetingDialogueUserContent({
          plainTranscript: transcript,
          segments: meetingDialogueAux?.transcriptSegments,
          phase1: {
            suggestedTitle: mainResult.suggestedTitle,
            keyPhrases: mainResult.keyPhrases,
            summary: mainResult.summary,
          },
          taskExtractionHint: meetingDialogueAux?.taskExtractionHint,
        });
        const mdPart = await processMeetingDialogueMarkdown(
          mdUserContent,
          model,
          meetingDialogueSystemPrompt.trim(),
          clientUserAgent,
        );
        result = {
          ...mainResult,
          ...mdPart,
          tokenUsage: mergeOpenRouterTokenUsage(mainResult.tokenUsage, mdPart.tokenUsage),
        };
      } catch (mdErr) {
        console.warn('[AI] meeting dialogue phase failed; returning main extraction only', {
          messageId: id,
          error: mdErr instanceof Error ? mdErr.message : String(mdErr),
        });
      }
    }

    await saveMessage(
      id,
      {
        id,
        status: 'done',
        model,
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
  } catch (err) {
    await decrement(deviceId);
    await saveMessage(
      id,
      {
        id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
        model,
      },
      ttl,
    );
    throw err;
  }
}
