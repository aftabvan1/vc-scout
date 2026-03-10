export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  created_at: string;
  owner: { login: string; html_url: string };
  topics: string[];
}

interface GithubSearchResponse {
  total_count: number;
  items: GithubRepo[];
}

export async function fetchGithubTrending(): Promise<GithubRepo[]> {
  // Search for repos created in the last 7 days with at least 10 stars
  const daysBack = 7;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  const url = `https://api.github.com/search/repositories?q=created:>${since}+stars:>10&sort=stars&order=desc&per_page=50`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "vc-scout",
    },
  });

  if (!res.ok) {
    console.warn(`GitHub API error: ${res.status}`);
    return [];
  }

  const data: GithubSearchResponse = await res.json();
  return data.items || [];
}

export function normalizeGithubRepo(repo: GithubRepo) {
  return {
    source: "github" as const,
    sourceId: String(repo.id),
    name: repo.name,
    url: repo.html_url,
    description: repo.description || "",
    score: repo.stargazers_count,
    sourceUrl: repo.html_url,
    discoveredAt: repo.created_at,
    founders: repo.owner.login,
    sector: [repo.language, ...(repo.topics || []).slice(0, 3)].filter(Boolean).join(", "),
  };
}
