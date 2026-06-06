jest.mock('@/shared/lib/fs', () => ({
  NitroFS: {
    exists: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('@/shared/lib/recordings', () => ({
  RECORDINGS_DIR: '/docs/recordings',
  resolveAudioPath: (path: string) => (path.startsWith('file://') ? path.slice(7) : path),
}));

import { NitroFS } from '@/shared/lib/fs';

import { cleanupOrphanTranscriptionTempWavs } from '../transcriptionTempAudioCleanup';

const mockExists = jest.mocked(NitroFS.exists);
const mockReaddir = jest.mocked(NitroFS.readdir);
const mockStat = jest.mocked(NitroFS.stat);
const mockUnlink = jest.mocked(NitroFS.unlink);

describe('cleanupOrphanTranscriptionTempWavs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExists.mockResolvedValue(true);
    mockReaddir.mockResolvedValue([
      { name: 'rec_keep.wav', path: '/docs/recordings/rec_keep.wav', mimeType: 'audio/wav' },
      { name: 'imported.wav', path: '/docs/recordings/imported.wav', mimeType: 'audio/wav' },
      { name: 'old.wav', path: '/docs/recordings/old.wav', mimeType: 'audio/wav' },
      {
        name: 'audio.wav.chunk-30.wav',
        path: '/docs/recordings/audio.wav.chunk-30.wav',
        mimeType: 'audio/wav',
      },
      { name: 'note.txt', path: '/docs/recordings/note.txt', mimeType: 'text/plain' },
    ]);
    mockStat.mockResolvedValue({
      isFile: true,
      isDirectory: false,
      size: 10,
      ctime: 0,
      mtime: Date.now() - 24 * 60 * 60 * 1000,
    });
    mockUnlink.mockResolvedValue(true);
  });

  it('removes transcription chunk WAVs immediately and stale orphan WAVs later', async () => {
    await cleanupOrphanTranscriptionTempWavs([
      { id: 'rec_keep', audioPath: '/docs/recordings/rec_keep.wav' },
      { id: 'rec_imported', audioPath: 'file:///docs/recordings/imported.wav' },
    ]);

    expect(mockUnlink.mock.calls.map((call) => call[0])).toEqual([
      '/docs/recordings/old.wav',
      '/docs/recordings/audio.wav.chunk-30.wav',
    ]);
  });

  it('keeps fresh orphan WAVs for the TTL window', async () => {
    mockStat.mockResolvedValue({
      isFile: true,
      isDirectory: false,
      size: 10,
      ctime: 0,
      mtime: Date.now(),
    });

    await cleanupOrphanTranscriptionTempWavs([]);

    expect(mockUnlink.mock.calls.map((call) => call[0])).toEqual([
      '/docs/recordings/audio.wav.chunk-30.wav',
    ]);
  });
});
