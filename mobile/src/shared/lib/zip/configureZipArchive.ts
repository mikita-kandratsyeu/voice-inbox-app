import 'react-native-nitro-zlib';

import { configure } from '@zip.js/zip.js';

let configured = false;

/** React Native-safe zip.js setup (no web workers / CompressionStream). */
export function ensureZipArchiveConfigured(): void {
  if (configured) {
    return;
  }

  configure({
    useWebWorkers: false,
    useCompressionStream: false,
    maxWorkers: 0,
  });

  configured = true;
}
