import React, { createContext, useContext } from 'react';

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
