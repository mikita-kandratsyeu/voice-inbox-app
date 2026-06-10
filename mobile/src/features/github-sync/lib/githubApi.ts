import { nitroFetch } from '@/shared/lib/fetch';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import { GITHUB_API_BASE } from './constants';

export type GithubRepoSummary = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
};

export type GithubCommitSummary = {
  sha: string;
  message: string;
  htmlUrl: string;
  committedAt: string;
};

type GithubApiError = Error & { status?: number; code?: string };

function createGithubError(message: string, status?: number, code?: string): GithubApiError {
  const err = new Error(message) as GithubApiError;
  err.status = status;
  err.code = code;
  return err;
}

async function githubFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('X-GitHub-Api-Version', '2022-11-28');

  const response = await nitroFetch(url, { ...init, headers });
  return response;
}

export async function fetchGithubUserLogin(accessToken: string): Promise<string> {
  const response = await githubFetch(accessToken, '/user');
  if (!response.ok) {
    throw createGithubError(`GitHub user failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.login)) {
    throw createGithubError('Invalid GitHub user response');
  }
  return data.login;
}

export async function listGithubRepos(accessToken: string): Promise<GithubRepoSummary[]> {
  const response = await githubFetch(
    accessToken,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,organization_member',
  );
  if (!response.ok) {
    throw createGithubError(`GitHub repos failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGithubError('Invalid GitHub repos response');
  }

  const repos: GithubRepoSummary[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const id = item.id;
    const full_name = item.full_name;
    const name = item.name;
    const owner = item.owner;
    if (typeof id !== 'number' || !isString(full_name) || !isString(name) || !isRecord(owner)) {
      continue;
    }
    const ownerLogin = owner.login;
    if (!isString(ownerLogin)) continue;
    repos.push({
      id,
      fullName: full_name,
      owner: ownerLogin,
      name,
      private: item.private === true,
      defaultBranch: isString(item.default_branch) ? item.default_branch : 'main',
    });
  }
  return repos;
}

export async function createGithubRepo(
  accessToken: string,
  name: string,
  isPrivate = true,
): Promise<GithubRepoSummary> {
  const response = await githubFetch(accessToken, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
      description: 'Voice Inbox AI notes sync',
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw createGithubError(text || `Create repo failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || typeof data.id !== 'number' || !isString(data.full_name)) {
    throw createGithubError('Invalid create repo response');
  }
  const owner = isRecord(data.owner) && isString(data.owner.login) ? data.owner.login : '';
  const repoName = isString(data.name) ? data.name : name;
  return {
    id: data.id,
    fullName: data.full_name,
    owner,
    name: repoName,
    private: data.private === true,
    defaultBranch: isString(data.default_branch) ? data.default_branch : 'main',
  };
}

export async function getBranchRefSha(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  const response = await githubFetch(
    accessToken,
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`,
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw createGithubError(`Get ref failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isRecord(data.object) || !isString(data.object.sha)) {
    throw createGithubError('Invalid ref response');
  }
  return data.object.sha;
}

type TreeEntry = {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string | null;
};

async function createBlob(
  accessToken: string,
  owner: string,
  repo: string,
  content: string,
): Promise<string> {
  const response = await githubFetch(accessToken, `/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      encoding: 'utf-8',
    }),
  });
  if (!response.ok) {
    throw createGithubError(`Create blob failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.sha)) {
    throw createGithubError('Invalid blob response');
  }
  return data.sha;
}

async function createBlobsParallel(
  accessToken: string,
  owner: string,
  repo: string,
  files: Map<string, string>,
  concurrency = 8,
): Promise<Map<string, string>> {
  const entries = [...files.entries()];
  const blobShas = new Map<string, string>();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < entries.length) {
      const current = index;
      index += 1;
      const [path, content] = entries[current];
      const sha = await createBlob(accessToken, owner, repo, content);
      blobShas.set(path, sha);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () => worker());
  await Promise.all(workers);
  return blobShas;
}

export async function listTreePathsAtCommit(
  accessToken: string,
  owner: string,
  repo: string,
  commitSha: string,
  prefix: string,
): Promise<string[]> {
  const response = await githubFetch(
    accessToken,
    `/repos/${owner}/${repo}/git/commits/${commitSha}`,
  );
  if (!response.ok) {
    throw createGithubError(`Get commit failed: ${response.status}`, response.status);
  }
  const commitData: unknown = await response.json();
  if (!isRecord(commitData) || !isRecord(commitData.tree) || !isString(commitData.tree.sha)) {
    throw createGithubError('Invalid commit response');
  }

  const treeSha = commitData.tree.sha;
  const treeResponse = await githubFetch(
    accessToken,
    `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
  );
  if (!treeResponse.ok) {
    throw createGithubError(`Get tree failed: ${treeResponse.status}`, treeResponse.status);
  }
  const treeData: unknown = await treeResponse.json();
  if (!isRecord(treeData) || !isArray(treeData.tree)) {
    throw createGithubError('Invalid tree response');
  }

  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const paths: string[] = [];
  for (const item of treeData.tree) {
    if (!isRecord(item) || item.type !== 'blob' || !isString(item.path)) continue;
    if (normalizedPrefix.length === 0 || item.path.startsWith(`${normalizedPrefix}/`)) {
      paths.push(item.path);
    }
  }
  return paths;
}

export async function getFileContentAtRef(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await githubFetch(
    accessToken,
    `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw createGithubError(`Get file failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isRecord(data) || !isString(data.content)) {
    throw createGithubError('Invalid file response');
  }
  const encoding = data.encoding;
  if (encoding === 'base64') {
    const cleaned = data.content.replace(/\n/g, '');
    const binary = atob(cleaned);
    let escaped = '';
    for (let i = 0; i < binary.length; i += 1) {
      escaped += `%${binary.charCodeAt(i).toString(16).padStart(2, '0')}`;
    }
    return decodeURIComponent(escaped);
  }
  return data.content;
}

export async function listGithubCommits(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  page = 1,
  perPage = 30,
): Promise<GithubCommitSummary[]> {
  const query = new URLSearchParams({
    sha: branch,
    path,
    per_page: String(perPage),
    page: String(page),
  });
  const response = await githubFetch(
    accessToken,
    `/repos/${owner}/${repo}/commits?${query.toString()}`,
  );
  if (!response.ok) {
    throw createGithubError(`List commits failed: ${response.status}`, response.status);
  }
  const data: unknown = await response.json();
  if (!isArray(data)) {
    throw createGithubError('Invalid commits response');
  }

  const commits: GithubCommitSummary[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isString(item.sha)) continue;
    const commit = item.commit;
    const htmlUrl = isString(item.html_url) ? item.html_url : '';
    if (!isRecord(commit)) continue;
    const message = isString(commit.message) ? commit.message : '';
    const author = commit.author;
    const committedAt =
      isRecord(author) && isString(author.date) ? author.date : new Date().toISOString();
    commits.push({
      sha: item.sha,
      message: message.split('\n')[0] ?? message,
      htmlUrl,
      committedAt,
    });
  }
  return commits;
}

export async function createGithubCommitWithFiles(params: {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  files: Map<string, string>;
  deletions: string[];
  message: string;
}): Promise<string> {
  const { accessToken, owner, repo, branch, basePath, files, deletions, message } = params;
  const parentSha = await getBranchRefSha(accessToken, owner, repo, branch);

  const normalizedBase = basePath.replace(/^\/+|\/+$/g, '');
  const relativeFiles = new Map<string, string>();
  for (const [path, content] of files.entries()) {
    const rel = path.startsWith(`${normalizedBase}/`)
      ? path.slice(normalizedBase.length + 1)
      : path;
    relativeFiles.set(rel, content);
  }

  const blobShas = await createBlobsParallel(accessToken, owner, repo, relativeFiles);

  const treeEntries: TreeEntry[] = [];
  for (const [relPath, blobSha] of blobShas.entries()) {
    treeEntries.push({
      path: relPath,
      mode: '100644',
      type: 'blob',
      sha: blobSha,
    });
  }

  for (const deletion of deletions) {
    const rel = deletion.startsWith(`${normalizedBase}/`)
      ? deletion.slice(normalizedBase.length + 1)
      : deletion;
    treeEntries.push({
      path: rel,
      mode: '100644',
      type: 'blob',
      sha: null,
    });
  }

  const treeBody: { base_tree?: string; tree: TreeEntry[] } = { tree: treeEntries };
  if (parentSha) {
    const parentCommitResponse = await githubFetch(
      accessToken,
      `/repos/${owner}/${repo}/git/commits/${parentSha}`,
    );
    if (parentCommitResponse.ok) {
      const parentCommit: unknown = await parentCommitResponse.json();
      if (
        isRecord(parentCommit) &&
        isRecord(parentCommit.tree) &&
        isString(parentCommit.tree.sha)
      ) {
        treeBody.base_tree = parentCommit.tree.sha;
      }
    }
  }

  const treeResponse = await githubFetch(accessToken, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(treeBody),
  });
  if (!treeResponse.ok) {
    const text = await treeResponse.text();
    throw createGithubError(
      text || `Create tree failed: ${treeResponse.status}`,
      treeResponse.status,
    );
  }
  const treeData: unknown = await treeResponse.json();
  if (!isRecord(treeData) || !isString(treeData.sha)) {
    throw createGithubError('Invalid tree create response');
  }

  const commitResponse = await githubFetch(accessToken, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: parentSha ? [parentSha] : [],
    }),
  });
  if (!commitResponse.ok) {
    const text = await commitResponse.text();
    throw createGithubError(
      text || `Create commit failed: ${commitResponse.status}`,
      commitResponse.status,
    );
  }
  const commitData: unknown = await commitResponse.json();
  if (!isRecord(commitData) || !isString(commitData.sha)) {
    throw createGithubError('Invalid commit create response');
  }

  const newSha = commitData.sha;

  if (parentSha) {
    const updateRefResponse = await githubFetch(
      accessToken,
      `/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newSha }),
      },
    );
    if (updateRefResponse.status === 409) {
      const latestSha = await getBranchRefSha(accessToken, owner, repo, branch);
      if (!latestSha || latestSha === parentSha) {
        throw createGithubError('Ref conflict', 409, 'ref_conflict');
      }
      return createGithubCommitWithFiles({ ...params, message: `${message} (retry)` });
    }
    if (!updateRefResponse.ok) {
      throw createGithubError(
        `Update ref failed: ${updateRefResponse.status}`,
        updateRefResponse.status,
      );
    }
  } else {
    const createRefResponse = await githubFetch(accessToken, `/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newSha,
      }),
    });
    if (!createRefResponse.ok) {
      throw createGithubError(
        `Create ref failed: ${createRefResponse.status}`,
        createRefResponse.status,
      );
    }
  }

  return newSha;
}
