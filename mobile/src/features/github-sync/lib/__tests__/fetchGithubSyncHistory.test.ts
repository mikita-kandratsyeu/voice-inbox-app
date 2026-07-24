import { fetchGithubSyncHistory } from '../fetchGithubSyncHistory';
import { listGithubCommits } from '../githubApi';

jest.mock('../githubApi', () => ({
  listGithubCommits: jest.fn(),
}));

const mockListGithubCommits = jest.mocked(listGithubCommits);

describe('fetchGithubSyncHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests commits for the normalized base path', async () => {
    mockListGithubCommits.mockResolvedValue([]);

    await fetchGithubSyncHistory(
      {
        accessToken: 'token',
        owner: 'octocat',
        repo: 'notes',
        branch: 'voice-inbox-ai',
        basePath: '/voice-inbox-ai/',
      },
      2,
    );

    expect(mockListGithubCommits).toHaveBeenCalledWith(
      'token',
      'octocat',
      'notes',
      'voice-inbox-ai',
      'manifest.json',
      2,
    );
  });
});
