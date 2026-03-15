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
  policy_update: (_data, _deps) => {
    const message = typeof _data.message === 'string' ? _data.message : '';
    usePushSheet.getState().show(message);
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
