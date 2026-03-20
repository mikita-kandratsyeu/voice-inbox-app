import { openStoreListing } from '../lib/openStoreListing';
import { requestNativeInAppReview } from '../lib/requestNativeInAppReview';

export async function openAppReviewFromSettings(): Promise<void> {
  const opened = await openStoreListing();

  if (!opened) {
    await requestNativeInAppReview();
  }
}
