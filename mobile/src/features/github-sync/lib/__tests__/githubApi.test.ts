import {
  GITHUB_FETCH_MAX_RETRIES,
  GITHUB_FETCH_RETRY_BASE_MS,
  GITHUB_FETCH_TIMEOUT_MS,
  GITHUB_REF_CONFLICT_MAX_RETRIES,
} from '../constants';
import {
  createGithubCommitWithFiles,
  createGithubError,
  createGithubRepo,
  fetchGithubUserLogin,
  getBranchRefSha,
  getFileContentAtRef,
  isGithubApiError,
  listGithubCommits,
  listGithubRepos,
  listTreePathsAtCommit,
} from '../githubApi';

const mockNitroFetch = jest.fn();

jest.mock('@/shared/lib/fetch', () => ({
  nitroFetch: (...args: unknown[]) => mockNitroFetch(...args),
}));

function jsonResponse(
  body: unknown,
  ok = true,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return {
    ok,
    status,
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
}

function expectGithubHeaders(callIndex = 0): void {
  expect(mockNitroFetch.mock.calls[callIndex]?.[1]).toEqual(
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer token',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }),
      timeoutMs: GITHUB_FETCH_TIMEOUT_MS,
    }),
  );
}

describe('githubApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('fetchGithubUserLogin', () => {
    it('fetches the authenticated user login', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse({ login: 'octocat' }));

      await expect(fetchGithubUserLogin('token')).resolves.toBe('octocat');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({ timeoutMs: GITHUB_FETCH_TIMEOUT_MS }),
      );
      expectGithubHeaders();
    });

    it('throws with status when GitHub rejects the token', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse('Bad credentials', false, 401));

      await expect(fetchGithubUserLogin('token')).rejects.toMatchObject({
        message: 'Bad credentials',
        status: 401,
      });
    });

    it('throws when the response shape is invalid', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse({ id: 1 }));

      await expect(fetchGithubUserLogin('token')).rejects.toThrow('Invalid GitHub user response');
    });
  });

  describe('retry behavior', () => {
    it('retries transient 429 responses using retry-after', async () => {
      jest.useFakeTimers();
      mockNitroFetch
        .mockResolvedValueOnce(
          jsonResponse({ message: 'rate limited' }, false, 429, { 'retry-after': '2' }),
        )
        .mockResolvedValueOnce(jsonResponse({ login: 'octocat' }));

      const resultPromise = fetchGithubUserLogin('token');
      await jest.advanceTimersByTimeAsync(2_000);
      await expect(resultPromise).resolves.toBe('octocat');
      expect(mockNitroFetch).toHaveBeenCalledTimes(2);
    });

    it('retries network failures with exponential backoff', async () => {
      jest.useFakeTimers();
      mockNitroFetch
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(jsonResponse({ login: 'octocat' }));

      const resultPromise = fetchGithubUserLogin('token');
      await jest.advanceTimersByTimeAsync(GITHUB_FETCH_RETRY_BASE_MS);
      await expect(resultPromise).resolves.toBe('octocat');
      expect(mockNitroFetch).toHaveBeenCalledTimes(2);
    });

    it('stops retrying after the configured maximum', async () => {
      jest.useFakeTimers();
      mockNitroFetch.mockResolvedValue(jsonResponse('rate limited', false, 429));

      const resultPromise = fetchGithubUserLogin('token');
      const expectation = expect(resultPromise).rejects.toMatchObject({
        message: 'rate limited',
        status: 429,
      });

      for (let attempt = 0; attempt < GITHUB_FETCH_MAX_RETRIES; attempt += 1) {
        await jest.advanceTimersByTimeAsync(GITHUB_FETCH_RETRY_BASE_MS * (attempt + 1));
      }

      await expectation;
      expect(mockNitroFetch).toHaveBeenCalledTimes(GITHUB_FETCH_MAX_RETRIES + 1);
    });
  });

  describe('listGithubRepos', () => {
    it('parses repository summaries and skips malformed entries', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse([
          {
            id: 1,
            full_name: 'octocat/hello',
            name: 'hello',
            owner: { login: 'octocat' },
            private: true,
            default_branch: 'main',
          },
          { id: 'bad' },
          {
            id: 2,
            full_name: 'octocat/world',
            name: 'world',
            owner: { login: 'octocat' },
            private: false,
          },
        ]),
      );

      await expect(listGithubRepos('token')).resolves.toEqual([
        {
          id: 1,
          fullName: 'octocat/hello',
          owner: 'octocat',
          name: 'hello',
          private: true,
          defaultBranch: 'main',
        },
        {
          id: 2,
          fullName: 'octocat/world',
          owner: 'octocat',
          name: 'world',
          private: false,
          defaultBranch: 'main',
        },
      ]);
    });
  });

  describe('createGithubRepo', () => {
    it('creates a repository summary', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse({
          id: 42,
          full_name: 'octocat/voice-inbox-ai',
          name: 'voice-inbox-ai',
          owner: { login: 'octocat' },
          private: true,
          default_branch: 'main',
        }),
      );

      await expect(createGithubRepo('token', 'voice-inbox-ai')).resolves.toEqual({
        id: 42,
        fullName: 'octocat/voice-inbox-ai',
        owner: 'octocat',
        name: 'voice-inbox-ai',
        private: true,
        defaultBranch: 'main',
      });
    });
  });

  describe('getBranchRefSha', () => {
    it('returns null when the branch does not exist', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse({}, false, 404));

      await expect(getBranchRefSha('token', 'octocat', 'hello', 'missing')).resolves.toBeNull();
    });

    it('returns the branch tip sha', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse({
          object: { sha: 'parent-sha' },
        }),
      );

      await expect(
        getBranchRefSha('token', 'octocat', 'hello', 'voice-inbox-ai-sync'),
      ).resolves.toBe('parent-sha');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/octocat/hello/git/ref/heads/voice-inbox-ai-sync',
        expect.any(Object),
      );
    });

    it('encodes owner, repo, and branch segments', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse({
          object: { sha: 'parent-sha' },
        }),
      );

      await getBranchRefSha('token', 'org/name', 'repo/name', 'feature/sync');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/org%2Fname/repo%2Fname/git/ref/heads/feature%2Fsync',
        expect.any(Object),
      );
    });
  });

  describe('listTreePathsAtCommit', () => {
    it('returns blob paths under the requested prefix', async () => {
      mockNitroFetch
        .mockResolvedValueOnce(
          jsonResponse({
            tree: { sha: 'tree-sha' },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            tree: [
              { type: 'blob', path: 'voice-inbox-ai/notes/a.md' },
              { type: 'blob', path: 'voice-inbox-ai/manifest.json' },
              { type: 'blob', path: 'README.md' },
              { type: 'tree', path: 'voice-inbox-ai/notes' },
            ],
          }),
        );

      await expect(
        listTreePathsAtCommit('token', 'octocat', 'hello', 'commit-sha', 'voice-inbox-ai'),
      ).resolves.toEqual(['voice-inbox-ai/notes/a.md', 'voice-inbox-ai/manifest.json']);
    });
  });

  describe('getFileContentAtRef', () => {
    it('decodes base64 file contents', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse({
          content: Buffer.from('{"version":4}', 'utf8').toString('base64'),
          encoding: 'base64',
        }),
      );

      await expect(
        getFileContentAtRef('token', 'octocat', 'hello', 'voice-inbox-ai/manifest.json', 'abc123'),
      ).resolves.toBe('{"version":4}');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/octocat/hello/contents/voice-inbox-ai/manifest.json?ref=abc123',
        expect.any(Object),
      );
    });

    it('returns plain text contents without base64 decoding', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse({
          content: 'plain-text',
          encoding: 'utf-8',
        }),
      );

      await expect(
        getFileContentAtRef('token', 'octocat', 'hello', 'README.md', 'abc123'),
      ).resolves.toBe('plain-text');
    });

    it('returns null when file is missing', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse({}, false, 404));

      await expect(
        getFileContentAtRef('token', 'octocat', 'hello', 'missing.json', 'abc123'),
      ).resolves.toBeNull();
    });
  });

  describe('listGithubCommits', () => {
    it('maps commit history entries', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse([
          {
            sha: 'abc123',
            html_url: 'https://github.com/octocat/hello/commit/abc123',
            commit: {
              message: 'Voice Inbox AI sync — 2026-06-10 12:00\n\nNotes: 3',
              author: { date: '2026-06-10T12:00:00.000Z' },
            },
          },
        ]),
      );

      await expect(
        listGithubCommits('token', 'octocat', 'hello', 'main', 'voice-inbox-ai/manifest.json'),
      ).resolves.toEqual([
        {
          sha: 'abc123',
          message: 'Voice Inbox AI sync — 2026-06-10 12:00',
          htmlUrl: 'https://github.com/octocat/hello/commit/abc123',
          committedAt: '2026-06-10T12:00:00.000Z',
        },
      ]);
    });
  });

  describe('createGithubCommitWithFiles', () => {
    const baseParams = {
      accessToken: 'token',
      owner: 'octocat',
      repo: 'hello',
      branch: 'voice-inbox-ai-sync',
      basePath: 'voice-inbox-ai',
      message: 'Voice Inbox AI sync',
    };

    it('creates the first commit on a new branch', async () => {
      mockNitroFetch
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha' }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha' }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'commit-sha' }))
        .mockResolvedValueOnce(jsonResponse({}));

      const commitSha = await createGithubCommitWithFiles({
        ...baseParams,
        files: new Map([['voice-inbox-ai/manifest.json', '{"version":4}']]),
        deletions: [],
      });

      expect(commitSha).toBe('commit-sha');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/octocat/hello/git/refs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ref: 'refs/heads/voice-inbox-ai-sync',
            sha: 'commit-sha',
          }),
        }),
      );
    });

    it('updates an existing branch and strips the base path from tree entries', async () => {
      mockNitroFetch
        .mockResolvedValueOnce(jsonResponse({ object: { sha: 'parent-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha' }))
        .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'parent-tree-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha' }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'commit-sha' }))
        .mockResolvedValueOnce(jsonResponse({}));

      const commitSha = await createGithubCommitWithFiles({
        ...baseParams,
        files: new Map([['voice-inbox-ai/notes/a.md', '# Note']]),
        deletions: ['voice-inbox-ai/notes/old.md'],
      });

      expect(commitSha).toBe('commit-sha');

      const createTreeCall = mockNitroFetch.mock.calls.find(
        ([url, init]) =>
          url === 'https://api.github.com/repos/octocat/hello/git/trees' &&
          init?.method === 'POST',
      );
      expect(JSON.parse(String(createTreeCall?.[1]?.body))).toEqual({
        base_tree: 'parent-tree-sha',
        tree: [
          { path: 'notes/a.md', mode: '100644', type: 'blob', sha: 'blob-sha' },
          { path: 'notes/old.md', mode: '100644', type: 'blob', sha: null },
        ],
      });
    });

    it('retries once after a ref conflict and then succeeds', async () => {
      mockNitroFetch
        .mockResolvedValueOnce(jsonResponse({ object: { sha: 'parent-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha' }))
        .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'parent-tree-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha' }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'commit-sha' }))
        .mockResolvedValueOnce(jsonResponse({}, false, 409))
        .mockResolvedValueOnce(jsonResponse({ object: { sha: 'new-parent-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ object: { sha: 'new-parent-sha' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'blob-sha-2' }))
        .mockResolvedValueOnce(jsonResponse({ tree: { sha: 'parent-tree-sha-2' } }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'tree-sha-2' }))
        .mockResolvedValueOnce(jsonResponse({ sha: 'commit-sha-2' }))
        .mockResolvedValueOnce(jsonResponse({}));

      const commitSha = await createGithubCommitWithFiles({
        ...baseParams,
        files: new Map([['voice-inbox-ai/manifest.json', '{"version":5}']]),
        deletions: [],
      });

      expect(commitSha).toBe('commit-sha-2');
    });

    it('throws ref_conflict after exceeding the retry budget', async () => {
      const conflictFlow = [
        jsonResponse({ object: { sha: 'parent-sha' } }),
        jsonResponse({ sha: 'blob-sha' }),
        jsonResponse({ tree: { sha: 'parent-tree-sha' } }),
        jsonResponse({ sha: 'tree-sha' }),
        jsonResponse({ sha: 'commit-sha' }),
        jsonResponse({}, false, 409),
      ];

      for (let attempt = 0; attempt <= GITHUB_REF_CONFLICT_MAX_RETRIES; attempt += 1) {
        mockNitroFetch
          .mockResolvedValueOnce(conflictFlow[0])
          .mockResolvedValueOnce(conflictFlow[1])
          .mockResolvedValueOnce(conflictFlow[2])
          .mockResolvedValueOnce(conflictFlow[3])
          .mockResolvedValueOnce(conflictFlow[4])
          .mockResolvedValueOnce(conflictFlow[5])
          .mockResolvedValueOnce(jsonResponse({ object: { sha: `parent-sha-${attempt + 1}` } }));
      }

      await expect(
        createGithubCommitWithFiles({
          ...baseParams,
          files: new Map([['voice-inbox-ai/manifest.json', '{"version":5}']]),
          deletions: [],
        }),
      ).rejects.toMatchObject({
        code: 'ref_conflict',
        status: 409,
      });
    });
  });

  describe('error helpers', () => {
    it('identifies github api errors', () => {
      expect(isGithubApiError(createGithubError('failed', 500, 'sync_failed'))).toBe(true);
      expect(isGithubApiError(new Error('generic'))).toBe(false);
    });
  });
});
