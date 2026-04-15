import { create } from 'zustand';

type CloudAiConsentUiState = {
  sheetVisible: boolean;
  resolver: ((accepted: boolean) => void) | null;
  open: (resolve: (accepted: boolean) => void) => void;
  submit: (accepted: boolean) => void;
};

export const useCloudAiConsentUiStore = create<CloudAiConsentUiState>((set, get) => ({
  sheetVisible: false,
  resolver: null,

  open: (resolve) => {
    set({ sheetVisible: true, resolver: resolve });
  },

  submit: (accepted) => {
    const { resolver } = get();
    set({ sheetVisible: false, resolver: null });
    resolver?.(accepted);
  },
}));
