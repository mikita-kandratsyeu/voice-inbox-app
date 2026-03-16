import { NextResponse } from 'next/server';

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: { name?: string; date?: string };
  };
  author?: { login?: string } | null;
};

type GitHubApiResponse = GitHubCommit[] | { message?: string; documentation_url?: string };

export type GitHubCommitInfo = {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export async function GET(): Promise<NextResponse> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();

  if (!repo) {
    return NextResponse.json({ ok: false, error: 'GITHUB_REPO not set (e.g. owner/repo)' });
  }

  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return NextResponse.json({
      ok: false,
      error: 'GITHUB_REPO must be in form owner/repo',
    });
  }

  const url = new URL(`https://api.github.com/repos/${owner}/${repoName}/commits`);
  url.searchParams.set('per_page', '10');

  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 60 },
    });
    const data = (await res.json()) as GitHubApiResponse;

    if (!res.ok) {
      const msg = Array.isArray(data)
        ? `HTTP ${res.status}`
        : (data as { message?: string }).message;
      return NextResponse.json({ ok: false, error: msg ?? `HTTP ${res.status}` });
    }

    const commits = (Array.isArray(data) ? data : []).map((c: GitHubCommit) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: (c.commit.message ?? '').split('\n')[0],
      author: c.commit.author?.name ?? c.author?.login ?? '—',
      date: c.commit.author?.date ?? '',
      url: c.html_url ?? `https://github.com/${owner}/${repoName}/commit/${c.sha}`,
    }));

    return NextResponse.json({
      ok: true,
      repo: `${owner}/${repoName}`,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      commits,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed';
    return NextResponse.json({ ok: false, error: msg });
  }
}
