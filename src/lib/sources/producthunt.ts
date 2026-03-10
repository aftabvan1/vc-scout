import RSSParser from "rss-parser";

export interface PHProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  website: string;
  votesCount: number;
  createdAt: string;
  topics: { name: string }[];
  makers: { name: string }[];
}

const PH_API = "https://api.producthunt.com/v2/api/graphql";

const QUERY = `
query {
  posts(order: NEWEST, first: 50) {
    edges {
      node {
        id
        name
        tagline
        description
        url
        website
        votesCount
        createdAt
        topics { edges { node { name } } }
        makers { id name headline }
      }
    }
  }
}
`;

async function fetchViaGraphQL(token: string): Promise<PHProduct[]> {
  const res = await fetch(PH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: QUERY }),
  });

  if (!res.ok) throw new Error(`PH API error: ${res.status}`);

  const data = await res.json();
  const edges = data?.data?.posts?.edges || [];

  return edges.map((edge: { node: Record<string, unknown> }) => {
    const n = edge.node;
    return {
      id: n.id,
      name: n.name,
      tagline: n.tagline,
      description: n.description,
      url: n.url,
      website: n.website,
      votesCount: n.votesCount,
      createdAt: n.createdAt,
      topics: ((n.topics as { edges: { node: { name: string } }[] })?.edges || []).map(
        (e: { node: { name: string } }) => ({ name: e.node.name })
      ),
      makers: n.makers || [],
    };
  }) as PHProduct[];
}

async function fetchViaRSS(): Promise<PHProduct[]> {
  const parser = new RSSParser();
  const products: PHProduct[] = [];

  try {
    const feed = await parser.parseURL("https://www.producthunt.com/feed");
    for (const item of (feed.items || []).slice(0, 50)) {
      products.push({
        id: item.guid || item.link || String(Date.now()),
        name: item.title || "Untitled",
        tagline: (item.contentSnippet || "").slice(0, 200),
        description: "",
        url: item.link || "",
        website: item.link || "",
        votesCount: 0,
        createdAt: item.isoDate || new Date().toISOString(),
        topics: [],
        makers: item.creator ? [{ name: item.creator }] : [],
      });
    }
  } catch (err) {
    console.warn("PH RSS feed failed, trying featured feed...", err);
    try {
      const feed = await parser.parseURL("https://www.producthunt.com/feed?category=tech");
      for (const item of (feed.items || []).slice(0, 50)) {
        products.push({
          id: item.guid || item.link || String(Date.now()),
          name: item.title || "Untitled",
          tagline: (item.contentSnippet || "").slice(0, 200),
          description: "",
          url: item.link || "",
          website: item.link || "",
          votesCount: 0,
          createdAt: item.isoDate || new Date().toISOString(),
          topics: [],
          makers: item.creator ? [{ name: item.creator }] : [],
        });
      }
    } catch (err2) {
      console.warn("PH RSS fallback also failed:", err2);
    }
  }

  return products;
}

export async function fetchProductHunt(): Promise<PHProduct[]> {
  const token = process.env.PRODUCTHUNT_TOKEN;

  // Try GraphQL API first if token exists
  if (token) {
    try {
      return await fetchViaGraphQL(token);
    } catch (err) {
      console.warn("PH GraphQL API failed, falling back to RSS:", err);
    }
  }

  // Fallback: scrape the public page
  return await fetchViaWebScrape();
}

async function fetchViaWebScrape(): Promise<PHProduct[]> {
  const products: PHProduct[] = [];

  try {
    // Product Hunt's homepage returns HTML with embedded JSON data
    const res = await fetch("https://www.producthunt.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`PH page error: ${res.status}`);

    const html = await res.text();

    // Extract product data from the page's JSON-LD or embedded script data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonStr = match.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "");
          const data = JSON.parse(jsonStr);
          if (data["@type"] === "ItemList" && data.itemListElement) {
            for (const item of data.itemListElement.slice(0, 50)) {
              const thing = item.item || item;
              products.push({
                id: thing.url || String(products.length),
                name: thing.name || "Untitled",
                tagline: thing.description || "",
                description: "",
                url: thing.url || "",
                website: thing.url || "",
                votesCount: 0,
                createdAt: new Date().toISOString(),
                topics: [],
                makers: [],
              });
            }
          }
        } catch {
          // Skip invalid JSON-LD blocks
        }
      }
    }

    // If JSON-LD didn't work, try to extract from __NEXT_DATA__ or similar
    if (products.length === 0) {
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const posts = findPosts(nextData);
          for (const post of posts.slice(0, 50)) {
            products.push({
              id: post.id || post.slug || String(products.length),
              name: post.name || post.title || "Untitled",
              tagline: post.tagline || post.description || "",
              description: post.description || "",
              url: post.url || (post.slug ? `https://www.producthunt.com/posts/${post.slug}` : ""),
              website: post.website || post.url || "",
              votesCount: post.votesCount || post.votes_count || 0,
              createdAt: post.createdAt || post.created_at || new Date().toISOString(),
              topics: (post.topics || []).map((t: string | { name: string }) => typeof t === "string" ? { name: t } : t),
              makers: (post.makers || []).map((m: string | { name: string }) => typeof m === "string" ? { name: m } : m),
            });
          }
        } catch {
          // Skip if parsing fails
        }
      }
    }

    // Last resort: extract product names/links from HTML
    if (products.length === 0) {
      const linkRegex = /href="\/posts\/([^"]+)"[^>]*>([^<]+)</g;
      const seen = new Set<string>();
      let match;
      while ((match = linkRegex.exec(html)) !== null && products.length < 50) {
        const slug = match[1];
        const name = match[2].trim();
        if (!seen.has(slug) && name.length > 2 && name.length < 100) {
          seen.add(slug);
          products.push({
            id: slug,
            name,
            tagline: "",
            description: "",
            url: `https://www.producthunt.com/posts/${slug}`,
            website: "",
            votesCount: 0,
            createdAt: new Date().toISOString(),
            topics: [],
            makers: [],
          });
        }
      }
    }
  } catch (err) {
    console.warn("PH web scrape failed, trying RSS fallback:", err);
    return await fetchViaRSS();
  }

  if (products.length === 0) {
    // If scraping returned nothing, try RSS as final fallback
    return await fetchViaRSS();
  }

  return products;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPosts(obj: unknown, depth = 0): Array<Record<string, any>> {
  if (depth > 8 || !obj || typeof obj !== "object") return [];

  if (Array.isArray(obj)) {
    // Check if this looks like an array of posts
    if (obj.length > 0 && obj[0] && typeof obj[0] === "object" && ("name" in obj[0] || "tagline" in obj[0])) {
      return obj as Array<Record<string, unknown>>;
    }
    for (const item of obj) {
      const result = findPosts(item, depth + 1);
      if (result.length > 0) return result;
    }
    return [];
  }

  for (const value of Object.values(obj as Record<string, unknown>)) {
    const result = findPosts(value, depth + 1);
    if (result.length > 0) return result;
  }
  return [];
}

export function normalizePHProduct(product: PHProduct) {
  return {
    source: "producthunt" as const,
    sourceId: product.id,
    name: product.name,
    url: product.website || product.url,
    description: product.tagline + (product.description ? `\n${product.description}` : ""),
    score: product.votesCount,
    sourceUrl: product.url,
    discoveredAt: product.createdAt,
    founders: product.makers.map((m) => m.name).join(", "),
    sector: product.topics.map((t) => t.name).join(", "),
  };
}
