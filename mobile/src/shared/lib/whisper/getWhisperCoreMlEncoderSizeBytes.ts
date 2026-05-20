import type { WhisperModelId } from '@/entities/settings';
import { NitroFS } from '@/shared/lib/fs';

import { getWhisperCoreMlEncoderPath } from './whisperModelPath';

async function sumDirectoryBytes(dir: string): Promise<number> {
  if (!(await NitroFS.exists(dir))) {
    return 0;
  }

  const items = await NitroFS.readdir(dir);
  let total = 0;

  for (const item of items) {
    const st = await NitroFS.stat(item.path);
    if (st.isDirectory) {
      total += await sumDirectoryBytes(item.path);
    } else {
      total += st.size;
    }
  }

  return total;
}

export async function getWhisperCoreMlEncoderSizeBytes(modelId: WhisperModelId): Promise<number> {
  return sumDirectoryBytes(getWhisperCoreMlEncoderPath(modelId));
}
