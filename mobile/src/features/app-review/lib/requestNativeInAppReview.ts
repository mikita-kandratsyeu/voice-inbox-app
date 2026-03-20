import InAppReview from 'react-native-in-app-review';

export async function requestNativeInAppReview(): Promise<boolean> {
  try {
    if (!InAppReview.isAvailable()) {
      return false;
    }

    const result = await InAppReview.RequestInAppReview();

    return Boolean(result);
  } catch {
    return false;
  }
}
