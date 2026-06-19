type AskAiShakeBridgeState = {
  isFocused: boolean;
  isLoading: boolean;
  onCancel: (() => void) | null;
};

let bridgeState: AskAiShakeBridgeState = {
  isFocused: false,
  isLoading: false,
  onCancel: null,
};

export function setAskAiShakeBridge(patch: Partial<AskAiShakeBridgeState>): void {
  bridgeState = { ...bridgeState, ...patch };
}

export function getAskAiShakeBridge(): AskAiShakeBridgeState {
  return bridgeState;
}

export function resetAskAiShakeBridge(): void {
  bridgeState = {
    isFocused: false,
    isLoading: false,
    onCancel: null,
  };
}

/** Test-only reset. */
export function resetAskAiShakeBridgeForTests(): void {
  resetAskAiShakeBridge();
}
