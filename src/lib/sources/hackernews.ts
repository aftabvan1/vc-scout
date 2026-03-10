export interface HNPost {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  author: string;
  created_at: string;
  story_text: string | null;
}

interface HNResponse {
  hits: HNPost[];
  nbHits: number;
}

export async function fetchShowHN(daysBack: number = 7): Promise<HNPost[]> {
  const unixTime = Math.floor(Date.now() / 1000) - daysBack * 86400;
  const url = `https://hn.algolia.com/api/v1/search?tags=show_hn&hitsPerPage=50&numericFilters=created_at_i>${unixTime}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);

  const data: HNResponse = await res.json();
  return data.hits;
}

export async function searchHN(query: string): Promise<HNPost[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=show_hn&hitsPerPage=30`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);

  const data: HNResponse = await res.json();
  return data.hits;
}

export function normalizeHNPost(post: HNPost) {
  // Extract a clean name from "Show HN: Name - Description" format
  let name = post.title;
  let description = post.story_text || "";

  if (name.startsWith("Show HN:")) {
    name = name.replace("Show HN:", "").trim();
  }

  // If name has " - " or " – ", split into name and description
  const dashMatch = name.match(/^(.+?)\s[–\-]\s(.+)$/);
  if (dashMatch) {
    name = dashMatch[1].trim();
    if (!description) description = dashMatch[2].trim();
  }

  return {
    source: "hackernews" as const,
    sourceId: post.objectID,
    name,
    url: post.url || `https://news.ycombinator.com/item?id=${post.objectID}`,
    description,
    score: post.points,
    sourceUrl: `https://news.ycombinator.com/item?id=${post.objectID}`,
    discoveredAt: post.created_at,
    founders: post.author,
  };
}
