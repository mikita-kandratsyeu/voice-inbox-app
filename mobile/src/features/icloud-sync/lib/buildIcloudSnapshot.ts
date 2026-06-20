import { buildRemoteSnapshot } from '@/features/git-remote-sync/lib/buildRemoteSnapshot';

export { type RemoteSnapshot as IcloudSnapshot } from '@/features/git-remote-sync/lib/buildRemoteSnapshot';

export async function buildIcloudSnapshot(params: {
  records: Parameters<typeof buildRemoteSnapshot>[0]['records'];
  folders: Parameters<typeof buildRemoteSnapshot>[0]['folders'];
  basePath: string;
}) {
  return buildRemoteSnapshot({ ...params, includeAudio: true });
}
