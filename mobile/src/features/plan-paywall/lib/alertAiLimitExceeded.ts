import { Alert } from 'react-native';

import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { i18n } from '@/shared/lib/i18n';

import { openPlanPaywall } from './openPlanPaywall';

/** Error alert for weekly AI / auto-organize limits with optional Pro upgrade CTA. */
export function alertAiLimitExceeded(message: string): void {
  if (isProActiveFromStorageSync()) {
    Alert.alert(i18n.t('common.error'), message);
    return;
  }

  Alert.alert(i18n.t('common.error'), message, [
    { text: i18n.t('common.cancel'), style: 'cancel' },
    { text: i18n.t('common.tryPro'), onPress: openPlanPaywall },
  ]);
}
