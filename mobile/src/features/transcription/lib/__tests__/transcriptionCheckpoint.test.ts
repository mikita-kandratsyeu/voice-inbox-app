jest.mock('@/shared/lib/fs', () => ({
  getDocumentDirectoryPath: () => '/docs',
  NitroFS: {
    exists: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

import { NitroFS } from '@/shared/lib/fs';

import {
  getTranscriptionCheckpoint,
  listTranscriptionCheckpoints,
  removeTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
} from '../transcriptionCheckpoint';

const mockExists = jest.mocked(NitroFS.exists);
const mockMkdir = jest.mocked(NitroFS.mkdir);
const mockWriteFile = jest.mocked(NitroFS.writeFile);
const mockReadFile = jest.mocked(NitroFS.readFile);
const mockUnlink = jest.mocked(NitroFS.unlink);
const mockReaddir = jest.mocked(NitroFS.readdir);
const mockStat = jest.mocked(NitroFS.stat);

const checkpointsDir = '/docs/transcription-checkpoints';
const files = new Map<string, string>();
const dirs = new Set<string>();

function seedCheckpoint(recordId: string, payload: Record<string, unknown>): void {
  files.set(`${checkpointsDir}/${recordId}.json`, JSON.stringify(payload));
}

describe('transcriptionCheckpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    files.clear();
    dirs.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    mockExists.mockImplementation((path: string) =>
      Promise.resolve(dirs.has(path) || files.has(path)),
    );
    mockMkdir.mockImplementation((path: string) => {
      dirs.add(path);
      return Promise.resolve(true);
    });
    mockWriteFile.mockImplementation((path: string, content: string) => {
      files.set(path, content);
      return Promise.resolve();
    });
    mockReadFile.mockImplementation((path: string) => Promise.resolve(files.get(path) ?? ''));
    mockUnlink.mockImplementation((path: string) => {
      files.delete(path);
      return Promise.resolve(true);
    });
    mockReaddir.mockImplementation((path: string) =>
      Promise.resolve(
        [...files.keys()]
          .filter((filePath) => filePath.startsWith(`${path}/`))
          .map((filePath) => ({
            name: filePath.split('/').pop() ?? '',
            path: filePath,
            mimeType: 'application/json',
          })),
      ),
    );
    mockStat.mockResolvedValue({
      isFile: true,
      isDirectory: false,
      size: 10,
      ctime: 0,
      mtime: 0,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves checkpoints with schema metadata and normalized audio path', async () => {
    await saveTranscriptionCheckpoint({
      recordId: 'rec_1',
      audioPath: 'file:///docs/recordings/rec_1.wav',
      modelId: 'whisper-small',
      language: 'ru',
      totalChunks: 4,
      lastCompletedChunkIndex: 2,
      fullText: 'hello',
      segments: [],
    });

    expect(mockMkdir).toHaveBeenCalledWith(checkpointsDir);
    const raw = files.get(`${checkpointsDir}/rec_1.json`);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toMatchObject({
      schemaVersion: 1,
      recordId: 'rec_1',
      audioPath: '/docs/recordings/rec_1.wav',
      modelId: 'whisper-small',
      language: 'ru',
      totalChunks: 4,
      lastCompletedChunkIndex: 2,
      fullText: 'hello',
      updatedAt: 1_000_000,
    });
  });

  it('returns null for invalid checkpoint payloads', async () => {
    seedCheckpoint('rec_bad', {
      schemaVersion: 1,
      recordId: 'rec_bad',
      audioPath: '/docs/audio.wav',
      modelId: 'whisper-base',
      language: 'ru',
      totalChunks: '4',
      lastCompletedChunkIndex: 1,
      fullText: 'hello',
      segments: [],
      updatedAt: 1,
    });

    await expect(getTranscriptionCheckpoint('rec_bad')).resolves.toBeNull();
  });

  it('lists fresh checkpoints newest first and removes expired ones', async () => {
    dirs.add(checkpointsDir);
    seedCheckpoint('rec_old', {
      schemaVersion: 1,
      recordId: 'rec_old',
      audioPath: '/docs/old.wav',
      modelId: 'whisper-base',
      language: 'ru',
      totalChunks: 4,
      lastCompletedChunkIndex: 1,
      fullText: 'old',
      segments: [],
      updatedAt: 1_000_000 - 13 * 60 * 60 * 1000,
    });
    seedCheckpoint('rec_new', {
      schemaVersion: 1,
      recordId: 'rec_new',
      audioPath: '/docs/new.wav',
      modelId: 'whisper-small',
      language: 'en',
      totalChunks: 2,
      lastCompletedChunkIndex: 1,
      fullText: 'new',
      segments: [],
      updatedAt: 1_000_000 - 100,
    });

    const result = await listTranscriptionCheckpoints();

    expect(result.map((item) => item.recordId)).toEqual(['rec_new']);
    expect(mockUnlink).toHaveBeenCalledWith(`${checkpointsDir}/rec_old.json`);
  });

  it('removes checkpoint files when present', async () => {
    seedCheckpoint('rec_1', {
      schemaVersion: 1,
      recordId: 'rec_1',
      audioPath: '/docs/audio.wav',
      modelId: 'whisper-base',
      language: 'ru',
      totalChunks: 1,
      lastCompletedChunkIndex: 0,
      fullText: '',
      segments: [],
      updatedAt: 1,
    });

    await removeTranscriptionCheckpoint('rec_1');

    expect(files.has(`${checkpointsDir}/rec_1.json`)).toBe(false);
  });
});
