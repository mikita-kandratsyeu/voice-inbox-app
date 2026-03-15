import { i18n } from '@/shared/lib/i18n';
import { type PushNotificationData, usePushSheet } from '@/shared/lib/push';

export type HandlePushNotificationDeps = {
  navigateToMain: () => void;
};

const HANDLERS: Record<
  string,
  (data: PushNotificationData, deps: HandlePushNotificationDeps) => void
> = {
  ai_complete: (_data, { navigateToMain }) => {
    navigateToMain();
  },
  policy_update: (data, _deps) => {
    const message = typeof data.message === 'string' ? data.message : '';
    usePushSheet.getState().show(message);
  },
  limit_exceeded: (_data, _deps) => {
    usePushSheet.getState().show(i18n.t('push.limitExceededMessage'), {
      type: 'limit_exceeded',
    });
  },
};

export function createHandlePushNotification(deps: HandlePushNotificationDeps) {
  return (data: PushNotificationData): void => {
    if (!data?.type) return;

    const handler = HANDLERS[data.type];
    if (handler) {
      handler(data, deps);
    }
  };
}
