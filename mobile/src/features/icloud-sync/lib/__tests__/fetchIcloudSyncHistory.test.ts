import { joinRepoPath } from '@/features/git-remote-sync/lib/repoPaths';

import { ICLOUD_SYNC_VERSION_META_FILE, ICLOUD_SYNC_VERSIONS_DIR } from '../constants';

describe('fetchIcloudSyncHistory path helpers', () => {
  it('builds version meta path', () => {
    const basePath = 'voice-inbox-ai';
    const versionId = '2026-06-20T12-00-00-000Z';
    const metaPath = joinRepoPath(
      basePath,
      `${ICLOUD_SYNC_VERSIONS_DIR}/${versionId}/${ICLOUD_SYNC_VERSION_META_FILE}`,
    );
    expect(metaPath).toBe(
      'voice-inbox-ai/.voice-inbox-ai/versions/2026-06-20T12-00-00-000Z/version-meta.json',
    );
  });
});
