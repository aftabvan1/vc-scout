export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  author: string;
  created_utc: number;
  subreddit: string;
  link_flair_text: string | null;
  num_comments: number;
}

const SUBREDDITS = ["startups", "SaaS", "Entrepreneur", "indiehackers"];

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const results: RedditPost[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=20`, {
        headers: { "User-Agent": "vc-scout:v1.0 (by /u/vc-scout-bot)" },
      });

      if (!res.ok) {
        console.warn(`Reddit r/${sub} error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const posts = data?.data?.children || [];

      for (const child of posts) {
        const post = child.data;
        if (!post || post.stickied) continue;
        results.push({
          id: post.id,
          title: post.title,
          selftext: (post.selftext || "").slice(0, 500),
          url: post.url,
          permalink: `https://reddit.com${post.permalink}`,
          score: post.score,
          author: post.author,
          created_utc: post.created_utc,
          subreddit: post.subreddit,
          link_flair_text: post.link_flair_text,
          num_comments: post.num_comments,
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch r/${sub}:`, err);
    }
  }

  return results;
}

export function normalizeRedditPost(post: RedditPost) {
  return {
    source: "reddit" as const,
    sourceId: post.id,
    name: post.title.length > 80 ? post.title.slice(0, 80) + "..." : post.title,
    url: post.url.startsWith("https://www.reddit.com") ? post.permalink : post.url,
    description: post.selftext.slice(0, 300),
    score: post.score,
    sourceUrl: post.permalink,
    discoveredAt: new Date(post.created_utc * 1000).toISOString(),
    founders: `u/${post.author}`,
    sector: `r/${post.subreddit}${post.link_flair_text ? ` · ${post.link_flair_text}` : ""}`,
  };
}
