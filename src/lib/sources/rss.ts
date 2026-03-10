import RSSParser from "rss-parser";

const parser = new RSSParser();

const RSS_FEEDS = [
  { name: "TechCrunch Startups", url: "https://techcrunch.com/category/startups/feed/" },
  { name: "Crunchbase News", url: "https://news.crunchbase.com/feed/" },
  { name: "Y Combinator Blog", url: "https://www.ycombinator.com/blog/rss/" },
];

export interface RSSItem {
  feedName: string;
  title: string;
  link: string;
  contentSnippet: string;
  isoDate: string;
  creator: string;
}

export async function fetchRSSFeeds(): Promise<RSSItem[]> {
  const results: RSSItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items.slice(0, 20)) {
        results.push({
          feedName: feed.name,
          title: item.title || "Untitled",
          link: item.link || "",
          contentSnippet: (item.contentSnippet || "").slice(0, 300),
          isoDate: item.isoDate || new Date().toISOString(),
          creator: item.creator || "",
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch RSS feed ${feed.name}:`, err);
    }
  }

  return results;
}

export function normalizeRSSItem(item: RSSItem) {
  return {
    source: "rss" as const,
    sourceId: item.link,
    name: item.title,
    url: item.link,
    description: item.contentSnippet,
    score: 0,
    sourceUrl: item.link,
    discoveredAt: item.isoDate,
    founders: item.creator,
    sector: item.feedName,
  };
}
