import React, { createContext, useContext } from 'react';

type ImportFileAction = () => Promise<void>;

const ImportFileActionContext = createContext<ImportFileAction | null>(null);

type ImportFileActionProviderProps = {
  children: React.ReactNode;
  importFile: ImportFileAction;
};

export function ImportFileActionProvider({ children, importFile }: ImportFileActionProviderProps) {
  return (
    <ImportFileActionContext.Provider value={importFile}>
      {children}
    </ImportFileActionContext.Provider>
  );
}

export function useImportFileAction(): ImportFileAction {
  const importFile = useContext(ImportFileActionContext);
  if (!importFile) {
    throw new Error('useImportFileAction must be used within ImportFileActionProvider');
  }
  return importFile;
}
