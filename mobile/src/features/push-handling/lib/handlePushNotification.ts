import { type PushNotificationData, usePushSheet } from '@/shared/lib/push';
import { isString } from '@/shared/lib/type-guards';

export type HandlePushNotificationDeps = {
  navigateToMain: () => void;
  navigateToRecord: (recordId: string) => void;
};

const HANDLERS: Record<
  string,
  (data: PushNotificationData, deps: HandlePushNotificationDeps) => void
> = {
  ai_complete: (data, { navigateToMain, navigateToRecord }) => {
    const recordId = isString(data.recordId) ? data.recordId.trim() : '';

    if (recordId) {
      navigateToRecord(recordId);
    } else {
      navigateToMain();
    }
  },
  policy_update: (_data, _deps) => {
    const message = isString(_data.message) ? _data.message : '';
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
