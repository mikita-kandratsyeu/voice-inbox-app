import React, { createContext, useContext } from 'react';

import { ImportSubtitleConfirmSheet } from '../ui/ImportSubtitleConfirmSheet';
import { ImportAudioProgressOverlay } from '../ui/ImportAudioProgressOverlay';
import { useImportAudioFile } from './useImportAudioFile';

type ImportAudioFileContextValue = ReturnType<typeof useImportAudioFile>;

const ImportAudioFileContext = createContext<ImportAudioFileContextValue | null>(null);

type ImportAudioFileProviderProps = {
  children: React.ReactNode;
};

export function ImportAudioFileProvider({ children }: ImportAudioFileProviderProps) {
  const value = useImportAudioFile();

  return (
    <ImportAudioFileContext.Provider value={value}>
      {children}
      <ImportAudioProgressOverlay visible={value.isImporting} phase={value.importPhase} />
      <ImportSubtitleConfirmSheet
        visible={value.subtitleConfirmVisible}
        defaultTitle={value.pendingSubtitleImport?.defaultTitle ?? ''}
        durationMs={value.pendingSubtitleImport?.durationMs ?? 0}
        onConfirm={value.confirmSubtitleImport}
        onCancel={value.cancelSubtitleImport}
      />
    </ImportAudioFileContext.Provider>
  );
}

export function useImportAudioFileContext(): ImportAudioFileContextValue {
  const ctx = useContext(ImportAudioFileContext);
  if (!ctx) {
    throw new Error('useImportAudioFileContext must be used within ImportAudioFileProvider');
  }
  return ctx;
}
