export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  created_at: string;
  fork: boolean;
  owner: { login: string; html_url: string };
  topics: string[];
}

interface GithubSearchResponse {
  total_count: number;
  items: GithubRepo[];
}

const NOISE_TOPICS = new Set([
  "tutorial", "awesome-list", "awesome", "boilerplate", "template",
  "course", "learning", "education", "cheatsheet", "interview",
  "leetcode", "algorithms", "data-structures", "dotfiles", "config",
  "exploit", "cve", "ctf", "pentest", "vulnerability", "proof-of-concept",
  "hack", "security-tools", "reverse-engineering",
]);

const NOISE_NAME_PATTERNS = /^(awesome-|learn-|tutorial|course|cheatsheet|interview|100-days)/i;

// Description patterns that signal non-startup repos
const NOISE_DESC_PATTERNS = /(proof of concept|exploit|vulnerability|CVE-\d|jailbreak|bypass|pwn|reverse.?engineer|ctf|capture the flag)/i;

export async function fetchGithubTrending(): Promise<GithubRepo[]> {
  const daysBack = 7;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().split("T")[0];
  // Raised threshold from 10 → 50 stars
  const url = `https://api.github.com/search/repositories?q=created:>${since}+stars:>50+fork:false&sort=stars&order=desc&per_page=50`;

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
  const items = data.items || [];

  // Filter out noise
  return items.filter((repo) => {
    // Skip forks
    if (repo.fork) return false;
    // Require description
    if (!repo.description || repo.description.length < 10) return false;
    // Skip repos with noise topics
    if (repo.topics?.some((t) => NOISE_TOPICS.has(t.toLowerCase()))) return false;
    // Skip repos with noise name patterns
    if (NOISE_NAME_PATTERNS.test(repo.name)) return false;
    // Skip repos with exploit/security research descriptions
    if (NOISE_DESC_PATTERNS.test(repo.description || "")) return false;
    return true;
  });
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
