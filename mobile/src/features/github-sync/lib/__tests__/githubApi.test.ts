import {
  fetchGithubUserLogin,
  getFileContentAtRef,
  listGithubCommits,
  listGithubRepos,
} from '../githubApi';

const mockNitroFetch = jest.fn();

jest.mock('@/shared/lib/fetch', () => ({
  nitroFetch: (...args: unknown[]) => mockNitroFetch(...args),
}));

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('githubApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the authenticated user login', async () => {
    mockNitroFetch.mockResolvedValue(jsonResponse({ login: 'octocat' }));

    await expect(fetchGithubUserLogin('token')).resolves.toBe('octocat');
    expect(mockNitroFetch).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('parses repository summaries', async () => {
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
    ]);
  });

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
      listGithubCommits('token', 'octocat', 'hello', 'main', 'voice-inbox-ai'),
    ).resolves.toEqual([
      {
        sha: 'abc123',
        message: 'Voice Inbox AI sync — 2026-06-10 12:00',
        htmlUrl: 'https://github.com/octocat/hello/commit/abc123',
        committedAt: '2026-06-10T12:00:00.000Z',
      },
    ]);
  });

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
  });

  it('returns null when file is missing', async () => {
    mockNitroFetch.mockResolvedValue(jsonResponse({}, false, 404));

    await expect(
      getFileContentAtRef('token', 'octocat', 'hello', 'missing.json', 'abc123'),
    ).resolves.toBeNull();
  });
});
