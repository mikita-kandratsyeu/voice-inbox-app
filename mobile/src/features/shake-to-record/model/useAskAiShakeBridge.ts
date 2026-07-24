import { useEffect } from 'react';

import { resetAskAiShakeBridge, setAskAiShakeBridge } from '../lib/askAiShakeBridge';

type UseAskAiShakeBridgeOptions = {
  isFocused: boolean;
  isLoading: boolean;
  onCancel: () => void;
};

export function useAskAiShakeBridge({
  isFocused,
  isLoading,
  onCancel,
}: UseAskAiShakeBridgeOptions): void {
  useEffect(() => {
    setAskAiShakeBridge({
      isFocused,
      isLoading,
      onCancel: isFocused && isLoading ? onCancel : null,
    });
  }, [isFocused, isLoading, onCancel]);

  useEffect(() => {
    return () => {
      resetAskAiShakeBridge();
    };
  }, []);
}
