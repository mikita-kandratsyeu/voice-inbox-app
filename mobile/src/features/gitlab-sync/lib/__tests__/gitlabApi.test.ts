import { GITLAB_API_BASE, GITLAB_FETCH_TIMEOUT_MS } from '../constants';
import {
  createGitlabCommitWithFiles,
  fetchGitlabUserLogin,
  listGitlabRepos,
  listTreePathsAtCommit,
} from '../gitlabApi';

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

function expectGitlabHeaders(callIndex = 0): void {
  expect(mockNitroFetch.mock.calls[callIndex]?.[1]).toEqual(
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer token',
        Accept: 'application/json',
      }),
      timeoutMs: GITLAB_FETCH_TIMEOUT_MS,
    }),
  );
}

describe('gitlabApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('fetchGitlabUserLogin', () => {
    it('fetches the authenticated user login', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse({ username: 'gitlab-user' }));

      await expect(fetchGitlabUserLogin('token')).resolves.toBe('gitlab-user');
      expect(mockNitroFetch).toHaveBeenCalledWith(
        `${GITLAB_API_BASE}/user`,
        expect.objectContaining({ timeoutMs: GITLAB_FETCH_TIMEOUT_MS }),
      );
      expectGitlabHeaders();
    });

    it('throws with status when GitLab rejects the token', async () => {
      mockNitroFetch.mockResolvedValue(jsonResponse('Unauthorized', false, 401));

      await expect(fetchGitlabUserLogin('token')).rejects.toMatchObject({
        message: expect.stringContaining('401'),
        status: 401,
      });
    });
  });

  describe('listGitlabRepos', () => {
    it('maps GitLab projects to repo summaries', async () => {
      mockNitroFetch.mockResolvedValue(
        jsonResponse([
          {
            id: 42,
            path_with_namespace: 'acme/voice-inbox-ai',
            name: 'voice-inbox-ai',
            namespace: { path: 'acme' },
            visibility: 'private',
            default_branch: 'main',
          },
        ]),
      );

      await expect(listGitlabRepos('token')).resolves.toEqual([
        {
          id: 42,
          fullName: 'acme/voice-inbox-ai',
          owner: 'acme',
          name: 'voice-inbox-ai',
          private: true,
          defaultBranch: 'main',
        },
      ]);
    });
  });

  describe('listTreePathsAtCommit', () => {
    it('falls back to listing the full tree when the base path filter returns 404', async () => {
      mockNitroFetch
        .mockResolvedValueOnce(
          jsonResponse({ message: '404 invalid revision or path Not Found' }, false, 404),
        )
        .mockResolvedValueOnce(
          jsonResponse([
            { type: 'blob', path: 'notes/2026/06/note.md' },
            { type: 'blob', path: '.voice-inbox-ai/manifest.json' },
          ]),
        );

      await expect(
        listTreePathsAtCommit('token', 42, 'commit-sha', 'voice-inbox-ai'),
      ).resolves.toEqual(['notes/2026/06/note.md', '.voice-inbox-ai/manifest.json']);

      expect(mockNitroFetch).toHaveBeenCalledTimes(2);
      expect(String(mockNitroFetch.mock.calls[0]?.[0])).toContain('path=voice-inbox-ai');
      expect(String(mockNitroFetch.mock.calls[1]?.[0])).not.toContain('path=');
    });

    it('does not double-prefix paths already rooted at the base path', async () => {
      mockNitroFetch.mockResolvedValueOnce(
        jsonResponse([{ type: 'blob', path: 'voice-inbox-ai/notes/a.md' }]),
      );

      await expect(
        listTreePathsAtCommit('token', 42, 'commit-sha', 'voice-inbox-ai'),
      ).resolves.toEqual(['voice-inbox-ai/notes/a.md']);
    });
  });

  describe('createGitlabCommitWithFiles', () => {
    it('posts commit actions to the GitLab commits API', async () => {
      mockNitroFetch.mockResolvedValueOnce(jsonResponse({ id: 'new-commit-sha' }));

      const files = new Map([['voice-inbox-ai/manifest.json', '{"version":4}']]);

      await expect(
        createGitlabCommitWithFiles({
          accessToken: 'token',
          projectId: 42,
          branch: 'voice-inbox-ai-sync',
          basePath: 'voice-inbox-ai',
          files,
          deletions: [],
          existingRelativePaths: new Set(),
          message: 'Sync notes',
        }),
      ).resolves.toBe('new-commit-sha');

      const commitCall = mockNitroFetch.mock.calls.find(([url]) =>
        String(url).includes('/projects/42/repository/commits'),
      );
      expect(commitCall?.[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"create"'),
        }),
      );
    });
  });
});
