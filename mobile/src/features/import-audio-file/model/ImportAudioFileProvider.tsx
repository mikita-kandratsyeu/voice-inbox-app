import React, { createContext, useContext } from 'react';

import { ImportAudioProgressOverlay } from '../ui/ImportAudioProgressOverlay';
import { ImportFileConfirmSheet } from '../ui/ImportFileConfirmSheet';
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
      <ImportFileConfirmSheet
        visible={value.subtitleConfirmVisible}
        defaultTitle={value.pendingSubtitleImport?.defaultTitle ?? ''}
        durationMs={value.pendingSubtitleImport?.durationMs ?? 0}
        sheetTitleKey="importAudio.subtitleImportTitle"
        confirmLabelKey="importAudio.subtitleImportConfirm"
        onConfirm={value.confirmSubtitleImport}
        onCancel={value.cancelSubtitleImport}
      />
      <ImportFileConfirmSheet
        visible={value.audioConfirmVisible}
        defaultTitle={value.pendingAudioImport?.defaultTitle ?? ''}
        durationMs={value.pendingAudioImport?.durationMs ?? 0}
        sheetTitleKey="importAudio.audioImportTitle"
        confirmLabelKey="importAudio.audioImportConfirm"
        onConfirm={value.confirmAudioImport}
        onCancel={value.cancelAudioImport}
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
