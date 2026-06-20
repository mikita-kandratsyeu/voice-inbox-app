import type { VoiceRecord } from '@/entities/record';
import { joinRepoPath } from '@/features/git-remote-sync/lib/repoPaths';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib';

import { downloadIcloudRelativeFileToLocal } from './icloudNative';

function isRelativeAudioPath(path: string): boolean {
  const p = path.trim();
  return p.length > 0 && !p.startsWith('/') && !p.startsWith('file://');
}

export async function restoreIcloudAudioForRecords(params: {
  basePath: string;
  records: VoiceRecord[];
}): Promise<VoiceRecord[]> {
  await ensureRecordingsDir();
  const restored: VoiceRecord[] = [];

  for (const record of params.records) {
    const relativePath = (record as VoiceRecord & { audioPath?: string }).audioPath?.trim();
    if (!relativePath || !isRelativeAudioPath(relativePath)) {
      delete (record as { audioPath?: string }).audioPath;
      restored.push(record);
      continue;
    }

    const ext = relativePath.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
    const destPath = `${RECORDINGS_DIR}/${record.id}${ext}`;
    const ok = await downloadIcloudRelativeFileToLocal({
      relativePath: joinRepoPath(params.basePath, relativePath),
      localPath: destPath,
    });

    if (ok) {
      restored.push({ ...record, audioPath: destPath });
    } else {
      const withoutAudio = { ...record };
      delete (withoutAudio as { audioPath?: string }).audioPath;
      restored.push(withoutAudio);
    }
  }

  return restored;
}
