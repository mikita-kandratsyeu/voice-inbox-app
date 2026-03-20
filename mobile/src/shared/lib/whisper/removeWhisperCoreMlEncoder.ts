import RNFS from 'react-native-fs';

import type { WhisperModelId } from '@/entities/settings';

import { getWhisperCoreMlEncoderPath } from './whisperModelPath';

async function removeDirectoryRecursive(dir: string): Promise<void> {
  if (!(await RNFS.exists(dir))) {
    return;
  }

  const items = await RNFS.readDir(dir);

  for (const item of items) {
    if (item.isDirectory()) {
      await removeDirectoryRecursive(item.path);
    } else {
      await RNFS.unlink(item.path);
    }
  }
  await RNFS.unlink(dir);
}

export async function removeWhisperCoreMlEncoder(modelId: WhisperModelId): Promise<void> {
  const path = getWhisperCoreMlEncoderPath(modelId);
  await removeDirectoryRecursive(path);
}
