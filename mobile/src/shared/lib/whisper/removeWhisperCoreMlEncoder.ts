import type { WhisperModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';

import { getWhisperCoreMlEncoderPath } from './whisperModelPath';

async function removeDirectoryRecursive(dir: string): Promise<void> {
  if (!(await NitroFS.exists(dir))) {
    return;
  }

  const items = await NitroFS.readdir(dir);

  for (const item of items) {
    const st = await NitroFS.stat(item.path);
    if (st.isDirectory) {
      await removeDirectoryRecursive(item.path);
    } else {
      await NitroFS.unlink(item.path);
    }
  }
  await NitroFS.unlink(dir);
}

export async function removeWhisperCoreMlEncoder(modelId: WhisperModelId): Promise<void> {
  const path = getWhisperCoreMlEncoderPath(modelId);
  await removeDirectoryRecursive(path);
}
