import { NextRequest, NextResponse } from "next/server";
import { fetchShowHN, normalizeHNPost } from "@/lib/sources/hackernews";
import { fetchProductHunt, normalizePHProduct } from "@/lib/sources/producthunt";
import { fetchRSSFeeds, normalizeRSSItem } from "@/lib/sources/rss";
import { fetchGithubTrending, normalizeGithubRepo } from "@/lib/sources/github";
import { fetchRedditPosts, normalizeRedditPost } from "@/lib/sources/reddit";
import { db } from "@/lib/db";
import { feedCache } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

interface FeedItem {
  source: string;
  sourceId: string;
  name: string;
  url: string;
  description: string;
  score: number;
  sourceUrl: string;
  discoveredAt: string;
  founders: string;
  sector?: string;
  cached?: boolean;
  aiScore?: number;
  aiVerdict?: string;
  aiTags?: string[];
}

// Normalize name for dedup matching
function normalizeNameForDedup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(app|io|ai|hq|labs|inc|co)$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "score";
    const quality = searchParams.get("quality") || "all"; // all | high

    // Fetch from all sources in parallel
    const [hnPosts, phProducts, rssItems, ghRepos, redditPosts] = await Promise.allSettled([
      fetchShowHN(7),
      fetchProductHunt(),
      fetchRSSFeeds(),
      fetchGithubTrending(),
      fetchRedditPosts(),
    ]);

    const items: FeedItem[] = [];

    // Process HN
    if (hnPosts.status === "fulfilled") {
      for (const post of hnPosts.value) {
        const normalized = normalizeHNPost(post);
        items.push(normalized);

        const existing = db
          .select()
          .from(feedCache)
          .where(and(eq(feedCache.source, "hackernews"), eq(feedCache.sourceId, post.objectID)))
          .get();

        if (!existing) {
          db.insert(feedCache)
            .values({
              id: nanoid(),
              source: "hackernews",
              sourceId: post.objectID,
              rawData: JSON.stringify(post),
            })
            .run();
        }
      }
    }

    // Process Product Hunt
    if (phProducts.status === "fulfilled") {
      for (const product of phProducts.value) {
        // Skip products with no name or very short names
        if (!product.name || product.name.length < 2) continue;
        // Skip products with no tagline AND no description (garbage scrape results)
        if (!product.tagline && !product.description) continue;

        const normalized = normalizePHProduct(product);
        items.push(normalized);

        const existing = db
          .select()
          .from(feedCache)
          .where(and(eq(feedCache.source, "producthunt"), eq(feedCache.sourceId, product.id)))
          .get();

        if (!existing) {
          db.insert(feedCache)
            .values({
              id: nanoid(),
              source: "producthunt",
              sourceId: product.id,
              rawData: JSON.stringify(product),
            })
            .run();
        }
      }
    }

    // Process RSS
    if (rssItems.status === "fulfilled") {
      for (const item of rssItems.value) {
        const normalized = normalizeRSSItem(item);
        items.push(normalized);
      }
    }

    // Process GitHub
    if (ghRepos.status === "fulfilled") {
      for (const repo of ghRepos.value) {
        const normalized = normalizeGithubRepo(repo);
        items.push(normalized);
      }
    }

    // Process Reddit
    if (redditPosts.status === "fulfilled") {
      for (const post of redditPosts.value) {
        const normalized = normalizeRedditPost(post);
        items.push(normalized);
      }
    }

    // --- Cross-source deduplication ---
    const seen = new Map<string, number>(); // normalizedName -> index in deduped
    const deduped: FeedItem[] = [];

    for (const item of items) {
      const key = normalizeNameForDedup(item.name);
      if (key.length < 3) {
        // Too short to dedup reliably, keep it
        deduped.push(item);
        continue;
      }

      const existingIdx = seen.get(key);
      if (existingIdx !== undefined) {
        // Keep the one with higher engagement score
        if (item.score > deduped[existingIdx].score) {
          deduped[existingIdx] = item;
        }
      } else {
        seen.set(key, deduped.length);
        deduped.push(item);
      }
    }

    // --- Minimum quality gate ---
    // Drop items with no score, no description, and no meaningful URL
    let filtered = deduped.filter((item) => {
      // Keep anything with engagement
      if (item.score > 0) return true;
      // Keep anything with a real description
      if (item.description && item.description.length > 20) return true;
      // Keep anything with a non-platform URL
      if (item.url && !item.url.includes("reddit.com") && !item.url.includes("news.ycombinator.com")) return true;
      // Drop the rest
      return false;
    });

    // Look up existing AI analyses
    try {
      const betterDb = (db as unknown as { _: { session: { client: { all: (sql: string) => Array<Record<string, unknown>> } } } })._.session.client;
      const analyses = betterDb.all("SELECT feed_item_key, ai_score, verdict, tags FROM ai_analysis");
      const aiMap = new Map<string, { aiScore: number; aiVerdict: string; aiTags: string[] }>();
      for (const row of analyses) {
        aiMap.set(row.feed_item_key as string, {
          aiScore: row.ai_score as number,
          aiVerdict: row.verdict as string,
          aiTags: row.tags ? JSON.parse(row.tags as string) : [],
        });
      }

      for (const item of filtered) {
        const key = `${item.source}:${item.sourceId || item.name}`;
        const ai = aiMap.get(key);
        if (ai) {
          item.aiScore = ai.aiScore;
          item.aiVerdict = ai.aiVerdict;
          item.aiTags = ai.aiTags;
        }
      }
    } catch {
      // AI analysis table might not exist yet
    }

    // --- Quality filter ---
    if (quality === "high") {
      filtered = filtered.filter((item) => {
        // Keep if high engagement
        if (item.score >= 10) return true;
        // Keep if good AI score
        if (item.aiScore !== undefined && item.aiScore >= 40) return true;
        // Keep Product Hunt and RSS (already curated sources)
        if (item.source === "producthunt" || item.source === "rss") return true;
        return false;
      });
    }

    // Sort
    if (sort === "ai") {
      filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
    } else if (sort === "date") {
      filtered.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
    } else {
      filtered.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
      });
    }

    return NextResponse.json({
      items: filtered,
      sources: {
        hackernews: hnPosts.status === "fulfilled" ? hnPosts.value.length : 0,
        producthunt: phProducts.status === "fulfilled" ? phProducts.value.length : 0,
        rss: rssItems.status === "fulfilled" ? rssItems.value.length : 0,
        github: ghRepos.status === "fulfilled" ? ghRepos.value.length : 0,
        reddit: redditPosts.status === "fulfilled" ? redditPosts.value.length : 0,
      },
      total: filtered.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Feed fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}
