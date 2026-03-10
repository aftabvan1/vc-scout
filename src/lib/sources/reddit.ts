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
  is_self: boolean;
}

const SUBREDDITS = ["startups", "SaaS", "Entrepreneur", "indiehackers"];

// Flairs that indicate non-startup content
const NOISE_FLAIRS = new Set([
  "question", "help", "rant", "job", "hiring", "meta",
  "discussion", "advice", "resource", "weekly thread",
]);

// Title patterns that indicate questions/advice-seeking, not startup launches
const NOISE_TITLE_PATTERNS = /^(how do i|how to|how can|how many|how are|how would|need advice|is it worth|looking for|anyone else|what are|what is|what's the|what would|what do|can someone|should i|has anyone|where can|help me|i need|eli5|ama |why do|why did|tips for|best way|does anyone|do you|i had|i was|i am stuck|i have \d|show me|most entrepreneurs|someone literally|went from|stopped spending|first and only)/i;

// Additional patterns anywhere in the title that signal discussion, not launches
const NOISE_TITLE_KEYWORDS = /(how to land|looking for encouragement|what problem|hackathon changed|what i('d| would) do|marketing growth hack|train my mind|your project|share your|free services|done anything offline|show me your startup|sell this if you had|don't know what to do|pre-revenue sites|great potential)/i;

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const results: RedditPost[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=25`, {
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

        // Min score threshold
        if (post.score < 5) continue;

        // Skip noise flairs
        if (post.link_flair_text && NOISE_FLAIRS.has(post.link_flair_text.toLowerCase())) continue;

        // Skip question/advice posts based on title
        if (NOISE_TITLE_PATTERNS.test(post.title)) continue;
        if (NOISE_TITLE_KEYWORDS.test(post.title)) continue;

        // Titles ending with ? are almost always questions, not launches
        if (post.title.trim().endsWith("?")) continue;

        // Skip pure self-posts with no external URL (just text questions)
        const isSelfPost = post.is_self || post.url?.includes(`reddit.com/r/${sub}`);
        if (isSelfPost && (!post.selftext || post.selftext.length < 100)) continue;

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
          is_self: post.is_self || false,
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
