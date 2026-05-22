import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';

/**
 * Tells the server to stop a cloud AI job (no LLM, no push). Best-effort; safe if job already finished.
 */
export async function cancelCloudAiJob(jobId: string): Promise<void> {
  const url = `${getWebApiUrl()}/api/ai-jobs/${encodeURIComponent(jobId)}/cancel`;

  try {
    const response = await fetchWithAuth(url, { method: 'POST' });
    if (__DEV__ && !response.ok) {
      const text = await response.text();
      console.warn('[AI] cancelCloudAiJob: HTTP error', {
        jobId,
        status: response.status,
        body: text,
      });
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[AI] cancelCloudAiJob: failed', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
