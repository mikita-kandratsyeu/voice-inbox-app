import {
  type AiMessageResult,
  fetchAiMessageOnce,
  type ServerMeetingDialogueStatus,
} from './aiApi';
import { AI_POLL_TIMEOUT_ERROR } from './pollGetLoop';

export type FinalizePollTimeoutOptions = {
  expectAsyncMeetingDialogue?: boolean;
};

/**
 * After the poll loop times out, read server state once. Avoids leaving the UI on
 * `processing` when Redis still says processing but the worker has failed or stalled.
 */
export async function finalizeAiMessageAfterPollTimeout(
  jobId: string,
  syncToken: string | undefined,
  options?: FinalizePollTimeoutOptions,
): Promise<AiMessageResult> {
  const once = await fetchAiMessageOnce(jobId, syncToken);
  if (!once.ok) {
    if ('notFound' in once) {
      return { ok: false, error: 'AI result expired' };
    }
    return { ok: false, error: once.error };
  }

  const { state } = once;
  if (state.kind === 'error') {
    return { ok: false, error: state.error };
  }

  if (state.kind === 'done') {
    const meetingDialogueStatus: ServerMeetingDialogueStatus | undefined =
      state.meetingDialogueStatus;
    if (meetingDialogueStatus === 'processing' && options?.expectAsyncMeetingDialogue) {
      return { ok: false, error: AI_POLL_TIMEOUT_ERROR };
    }
    return {
      ok: true,
      result: state.result,
      meetingDialogueStatus,
    };
  }

  return { ok: false, error: AI_POLL_TIMEOUT_ERROR };
}
