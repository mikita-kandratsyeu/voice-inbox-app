import NitroFS from 'react-native-nitro-fs';

export { NitroFS };

export const getDocumentDirectoryPath = (): string => NitroFS.DOCUMENT_DIR.replace(/\/$/, '');

export const getCachesDirectoryPath = (): string => NitroFS.CACHE_DIR.replace(/\/$/, '');

export const getTemporaryDirectoryPath = (): string =>
  `${getCachesDirectoryPath()}/voice-inbox-tmp`;
