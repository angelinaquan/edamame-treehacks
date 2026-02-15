import { Octokit } from "@octokit/rest";
import { chunkText } from "@/lib/core/chunker";
import { createServerSupabaseClient } from "@/lib/core/supabase/server";
import { attachEmbeddingsToMemoryRows } from "@/lib/memory/embeddings";
import { getGitHubToken } from "./credentials";

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  html_url: string;
}

export interface GitHubCommitSummary {
  sha: string;
  message: string;
  authored_at: string | null;
  author_login: string | null;
  html_url: string;
}

export interface GitHubPullRequestSummary {
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  user_login: string | null;
  html_url: string;
}

export interface GitHubRepositoryContext {
  repo: GitHubRepoSummary;
  languages: string[];
  readme: string | null;
  recent_commits: GitHubCommitSummary[];
  recent_pull_requests: GitHubPullRequestSummary[];
}

export interface GitHubUserContext {
  username: string;
  generated_at: string;
  repositories_scanned: number;
  total_recent_commits: number;
  total_recent_pull_requests: number;
  repositories: GitHubRepositoryContext[];
}

export interface GitHubSyncResult {
  snapshot_id: string;
  repositories_scanned: number;
  documents_created: number;
  chunks_created: number;
}

async function createOctokit(): Promise<Octokit> {
  const token = await getGitHubToken();
  return new Octokit({ auth: token });
}

function toRepoSummary(repo: {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch?: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  updated_at?: string | null;
  html_url: string;
}): GitHubRepoSummary {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    description: repo.description,
    default_branch: repo.default_branch ?? "main",
    stargazers_count: repo.stargazers_count ?? 0,
    forks_count: repo.forks_count ?? 0,
    open_issues_count: repo.open_issues_count ?? 0,
    updated_at: repo.updated_at ?? new Date(0).toISOString(),
    html_url: repo.html_url,
  };
}

export async function getAllRepos(owner: string): Promise<string[]> {
  const octokit = await createOctokit();
  const repos = await octokit.repos.listForOrg({
    org: owner,
    per_page: 100,
  });
  return repos.data.map((repo) => repo.name);
}

export async function getUserRepos(
  username: string,
  limit = 20
): Promise<GitHubRepoSummary[]> {
  const octokit = await createOctokit();
  const repos = await octokit.repos.listForUser({
    username,
    sort: "updated",
    per_page: Math.min(Math.max(limit, 1), 100),
  });
  return repos.data.map((repo) => toRepoSummary(repo));
}

export async function getRepositoryInfo(
  owner: string,
  repo: string
): Promise<GitHubRepoSummary> {
  const octokit = await createOctokit();
  const res = await octokit.repos.get({ owner, repo });
  return toRepoSummary(res.data);
}

export async function getRepositoryLanguages(
  owner: string,
  repo: string
): Promise<string[]> {
  const octokit = await createOctokit();
  const res = await octokit.repos.listLanguages({ owner, repo });
  return Object.keys(res.data);
}

export async function getRepositoryReadme(
  owner: string,
  repo: string
): Promise<string | null> {
  const octokit = await createOctokit();
  try {
    const res = await octokit.repos.getReadme({
      owner,
      repo,
      mediaType: { format: "raw" },
    });
    return typeof res.data === "string" ? res.data : null;
  } catch {
    // README doesn't exist or is inaccessible
    return null;
  }
}

export async function getMostRecentCommits(
  owner: string,
  repo: string,
  opts?: { limit?: number; author?: string }
): Promise<GitHubCommitSummary[]> {
  const octokit = await createOctokit();
  const commits = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: Math.min(Math.max(opts?.limit ?? 10, 1), 100),
    author: opts?.author,
  });
  return commits.data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    authored_at: commit.commit.author?.date ?? null,
    author_login: commit.author?.login ?? null,
    html_url: commit.html_url,
  }));
}

export async function getMostRecentPullRequests(
  owner: string,
  repo: string,
  opts?: { limit?: number; state?: "open" | "closed" | "all" }
): Promise<GitHubPullRequestSummary[]> {
  const octokit = await createOctokit();
  const prs = await octokit.pulls.list({
    owner,
    repo,
    state: opts?.state ?? "all",
    sort: "updated",
    direction: "desc",
    per_page: Math.min(Math.max(opts?.limit ?? 10, 1), 100),
  });
  return prs.data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state === "open" ? "open" : "closed",
    merged_at: pr.merged_at,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    user_login: pr.user?.login ?? null,
    html_url: pr.html_url,
  }));
}

export async function buildUserGitHubContext(opts: {
  username: string;
  repoLimit?: number;
  itemsPerRepo?: number;
}): Promise<GitHubUserContext> {
  const repoLimit = Math.min(Math.max(opts.repoLimit ?? 10, 1), 100);
  const itemsPerRepo = Math.min(Math.max(opts.itemsPerRepo ?? 10, 1), 100);

  const repos = await getUserRepos(opts.username, repoLimit);

  const repositories: GitHubRepositoryContext[] = await Promise.all(
    repos.map(async (repo) => {
      const [languages, readme, recentCommits, recentPullRequests] =
        await Promise.all([
          getRepositoryLanguages(opts.username, repo.name),
          getRepositoryReadme(opts.username, repo.name),
          getMostRecentCommits(opts.username, repo.name, {
            limit: itemsPerRepo,
            author: opts.username,
          }),
          getMostRecentPullRequests(opts.username, repo.name, {
            limit: itemsPerRepo,
            state: "all",
          }),
        ]);

      return {
        repo,
        languages,
        readme,
        recent_commits: recentCommits,
        recent_pull_requests: recentPullRequests.filter(
          (pr) => pr.user_login?.toLowerCase() === opts.username.toLowerCase()
        ),
      };
    })
  );

  const totalRecentCommits = repositories.reduce(
    (sum, r) => sum + r.recent_commits.length,
    0
  );
  const totalRecentPullRequests = repositories.reduce(
    (sum, r) => sum + r.recent_pull_requests.length,
    0
  );

  return {
    username: opts.username,
    generated_at: new Date().toISOString(),
    repositories_scanned: repositories.length,
    total_recent_commits: totalRecentCommits,
    total_recent_pull_requests: totalRecentPullRequests,
    repositories,
  };
}

function buildRepositorySnapshotDocument(
  username: string,
  repository: GitHubRepositoryContext
): { title: string; content: string } {
  const commitLines =
    repository.recent_commits.length > 0
      ? repository.recent_commits
          .map(
            (commit) =>
              `- [${commit.sha.slice(0, 7)}] ${commit.message} (${commit.authored_at ?? "unknown date"}) by ${commit.author_login ?? "unknown"}`
          )
          .join("\n")
      : "- No recent commits found.";

  const prLines =
    repository.recent_pull_requests.length > 0
      ? repository.recent_pull_requests
          .map(
            (pr) =>
              `- #${pr.number} ${pr.title} [${pr.state}] (updated ${pr.updated_at})`
          )
          .join("\n")
      : "- No recent pull requests found.";

  const languageLine =
    repository.languages.length > 0
      ? repository.languages.join(", ")
      : "Unknown";

  const readmeSection = repository.readme
    ? `\nREADME:\n${repository.readme}\n`
    : "\nREADME: Not available.\n";

  const content = `GitHub repository snapshot for ${repository.repo.full_name}.
GitHub username: ${username}
Repository URL: ${repository.repo.html_url}
Description: ${repository.repo.description ?? "No description"}
Default branch: ${repository.repo.default_branch}
Languages: ${languageLine}
Stars: ${repository.repo.stargazers_count}
Forks: ${repository.repo.forks_count}
Open issues: ${repository.repo.open_issues_count}
Last updated: ${repository.repo.updated_at}
${readmeSection}
Recent commits by ${username}:
${commitLines}

Recent pull requests by ${username}:
${prLines}
`;

  return {
    title: `GitHub Snapshot: ${repository.repo.full_name}`,
    content,
  };
}

export async function syncGitHubContextToSupabase(opts: {
  cloneId: string;
  username: string;
  repoLimit?: number;
  itemsPerRepo?: number;
}): Promise<GitHubSyncResult> {
  const context = await buildUserGitHubContext({
    username: opts.username,
    repoLimit: opts.repoLimit,
    itemsPerRepo: opts.itemsPerRepo,
  });

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const snapshotInsert = await supabase
    .from("memories")
    .insert({
      clone_id: opts.cloneId,
      type: "snapshot",
      source: "github",
      content: JSON.stringify(context),
      confidence: 1.0,
      metadata: { github_username: opts.username, repositories_scanned: context.repositories_scanned },
      occurred_at: now,
    })
    .select("id")
    .single();

  if (snapshotInsert.error || !snapshotInsert.data) {
    throw new Error(
      `Failed to save GitHub snapshot: ${snapshotInsert.error?.message ?? "unknown error"}`
    );
  }

  const snapshotId = snapshotInsert.data.id as string;
  const repositoryDocs = context.repositories.map((repository) =>
    buildRepositorySnapshotDocument(opts.username, repository)
  );

  if (repositoryDocs.length === 0) {
    return {
      snapshot_id: snapshotId,
      repositories_scanned: 0,
      documents_created: 0,
      chunks_created: 0,
    };
  }

  const memoryRows: Array<{
    clone_id: string;
    type: string;
    source: string;
    content: string;
    embedding?: number[] | null;
    confidence: number;
    metadata: Record<string, unknown>;
    occurred_at: string;
  }> = [];

  let chunksCreated = 0;
  for (const doc of repositoryDocs) {
    memoryRows.push({
      clone_id: opts.cloneId,
      type: "document",
      source: "github",
      content: doc.content,
      confidence: 0.9,
      metadata: { title: doc.title, doc_type: "document", snapshot_id: snapshotId, github_username: opts.username },
      occurred_at: now,
    });

    if (doc.content.trim()) {
      const textChunks = chunkText(doc.content, { chunkSize: 700, overlap: 100 });
      for (const chunk of textChunks) {
        memoryRows.push({
          clone_id: opts.cloneId,
          type: "chunk",
          source: "github",
          content: chunk.content,
          confidence: 0.8,
          metadata: {
            ...chunk.metadata,
            source_type: "repository_snapshot",
            github_username: opts.username,
            snapshot_id: snapshotId,
            document_title: doc.title,
          },
          occurred_at: now,
        });
        chunksCreated++;
      }
    }
  }

  if (memoryRows.length > 0) {
    const rowsWithEmbeddings = await attachEmbeddingsToMemoryRows(memoryRows);
    const { error } = await supabase.from("memories").insert(rowsWithEmbeddings);
    if (error) {
      throw new Error(`Failed to save GitHub memories: ${error.message}`);
    }
  }

  return {
    snapshot_id: snapshotId,
    repositories_scanned: context.repositories_scanned,
    documents_created: repositoryDocs.length,
    chunks_created: chunksCreated,
  };
}

