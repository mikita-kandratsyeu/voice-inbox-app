import { useEffect, useState } from 'react';

import type { RecordingStatus } from '@/entities/record';

export function useAiTabBannerDismiss(
  status: RecordingStatus,
  onDismissError?: () => void,
): { showBanner: boolean; handleDismiss: () => void } {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (status !== 'error') setBannerDismissed(false);
  }, [status]);

  const handleDismiss = () => {
    setBannerDismissed(true);
    onDismissError?.();
  };

  return {
    showBanner: status === 'error' && !bannerDismissed,
    handleDismiss,
  };
}
