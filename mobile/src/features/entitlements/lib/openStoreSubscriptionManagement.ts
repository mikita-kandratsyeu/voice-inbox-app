import { Linking } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { presentIosManageSubscriptionsSheet } from '@/features/app-storefront';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

const IOS_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export async function openStoreSubscriptionManagement(): Promise<boolean> {
  if (!IS_IOS && !IS_ANDROID) {
    return false;
  }

  if (IS_IOS) {
    const sheetOk = await presentIosManageSubscriptionsSheet();
    if (sheetOk) {
      return true;
    }
  }

  let url: string;
  if (IS_IOS) {
    url = IOS_SUBSCRIPTIONS_URL;
  } else {
    const pkg = DeviceInfoModule.bundleId?.trim();
    if (!pkg) {
      return false;
    }
    url = `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(pkg)}`;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
