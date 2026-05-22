import { PUSH_DEBOUNCE_MS } from '@/config/constants';
import { sendPushNotification } from '@/lib/push';
import {
  collectPendingAndUnlock,
  getPushTokenWithLocale,
  isAppInForeground,
  registerAiCompletion,
} from '@/lib/push-tokens';

export async function notifyAiJobComplete(params: {
  deviceId: string;
  recordId: string;
  logLabel: string;
}): Promise<void> {
  const { deviceId, recordId, logLabel } = params;

  const isLeader = await registerAiCompletion(deviceId);
  if (!isLeader) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Push] ${logLabel}: queued (leader will send)`, { deviceId });
    }
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, PUSH_DEBOUNCE_MS));

  const inForeground = await isAppInForeground(deviceId);
  const count = await collectPendingAndUnlock(deviceId);
  if (count === 0) return;
  if (inForeground) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Push] ${logLabel}: skip (app in foreground after debounce)`, { deviceId });
    }
    return;
  }

  const data = await getPushTokenWithLocale(deviceId);
  if (data) {
    const sent = await sendPushNotification(
      data.token,
      { type: 'ai_complete', recordId },
      data.locale,
      count,
    );
    console.log(`[Push] ${logLabel}:`, sent ? 'sent' : 'failed', { deviceId, count });
  } else {
    console.warn(`[Push] ${logLabel}: no token for deviceId`, deviceId);
  }
}
