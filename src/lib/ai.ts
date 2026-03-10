import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface AIScoreResult {
  score: number;
  verdict: string;
  tags: string[];
}

export interface AIEnrichResult {
  score: number;
  verdict: string;
  tags: string[];
  sector: string;
  stage: string;
  competitiveLandscape: string;
  founderInsights: string;
  recommendation: string;
}

interface FeedItemInput {
  name: string;
  description: string;
  source: string;
  score: number;
  url: string;
  founders?: string;
  sector?: string;
}

export async function scoreStartup(item: FeedItemInput): Promise<AIScoreResult> {
  const prompt = `You are a ruthlessly selective seed-stage VC scout. Your job is to filter signal from noise.

CRITICAL RULES:
- Score 0 for anything that is NOT a startup/company building a product (open-source libraries, developer tools with no business model, tutorials, educational repos, blog posts, news articles, Reddit questions, personal projects with no commercial intent)
- Score 1-20 for ideas/projects with no real traction or unclear value proposition
- Score 21-50 for legitimate startups but weak signals (small market, unclear differentiation, no moat)
- Score 51-70 for interesting startups with some promising signals
- Score 71-85 for strong startups with clear product-market fit indicators
- Score 86-100 ONLY for exceptional deals (clear traction, large market, strong team, technical moat)

BE HARSH. Most items from aggregated feeds are noise. A typical batch should average 20-35. Anything above 60 should be genuinely exciting.

Evaluate on:
1. Product clarity (30%) — Is there a clear product solving a real problem? Or is this just a repo/post/article?
2. Market opportunity (25%) — Is this a venture-scale market ($100M+)? Or a niche hobby?
3. Traction signals (20%) — Platform engagement relative to source (HN: 50+ pts is good, GitHub: 200+ stars is notable, Reddit: 20+ upvotes shows interest)
4. Team indicators (15%) — Any founder signals? Multiple makers? Known background?
5. Technical moat (10%) — Defensible technology or easily replicated?

Item to evaluate:
- Name: ${item.name}
- Source: ${item.source}
- Description: ${item.description || "N/A"}
- Platform Score: ${item.score}
- URL: ${item.url}
- Founders: ${item.founders || "Unknown"}
- Sector: ${item.sector || "Unknown"}

Respond ONLY with valid JSON (no markdown, no code blocks):
{"score": <0-100>, "verdict": "<one sentence — be specific and opinionated>", "tags": ["<tag1>", "<tag2>", "<tag3>"]}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(100, parsed.score || 0)),
      verdict: parsed.verdict || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    };
  } catch (err) {
    console.error("AI scoring error:", err);
    return { score: 0, verdict: "Analysis failed", tags: [] };
  }
}

export async function enrichStartup(startup: {
  name: string;
  description: string | null;
  url: string | null;
  founders: string | null;
  sector: string | null;
  source: string;
  score: number;
}): Promise<AIEnrichResult> {
  const prompt = `You are a VC scout preparing a deal memo for your investment committee. Be specific, opinionated, and actionable. Don't hedge — take a clear position.

Startup:
- Name: ${startup.name}
- Description: ${startup.description || "N/A"}
- Website: ${startup.url || "N/A"}
- Founders: ${startup.founders || "Unknown"}
- Sector: ${startup.sector || "Unknown"}
- Source: ${startup.source}
- Platform Score: ${startup.score}

Answer these questions in your analysis:
1. What exactly does this company do and who pays for it?
2. How big is the addressable market realistically?
3. Who are the top 3 competitors and what's the differentiation?
4. What do we know (or can infer) about the founding team?
5. What's the recommendation and why?

For recommendation:
- "pass" = Not venture-backable (too small, no moat, not a real company)
- "watch" = Interesting but too early or unclear — check back in 3 months
- "research" = Worth deeper diligence — schedule a call
- "strong-interest" = Compelling deal — flag for immediate partner review

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "score": <0-100>,
  "verdict": "<2-3 sentence investment thesis — be specific about WHY>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "sector": "<specific sector, e.g. 'Developer Tools' not just 'Tech'>",
  "stage": "<pre-seed|seed|series-a|growth>",
  "competitiveLandscape": "<name specific competitors and differentiation>",
  "founderInsights": "<what can we infer about the team?>",
  "recommendation": "<pass|watch|research|strong-interest>"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);
    return {
      score: Math.max(0, Math.min(100, parsed.score || 0)),
      verdict: parsed.verdict || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      sector: parsed.sector || "",
      stage: parsed.stage || "",
      competitiveLandscape: parsed.competitiveLandscape || "",
      founderInsights: parsed.founderInsights || "",
      recommendation: parsed.recommendation || "watch",
    };
  } catch (err) {
    console.error("AI enrichment error:", err);
    return {
      score: 0,
      verdict: "Enrichment failed",
      tags: [],
      sector: "",
      stage: "",
      competitiveLandscape: "",
      founderInsights: "",
      recommendation: "watch",
    };
  }
}

export async function batchScore(
  items: FeedItemInput[]
): Promise<Map<string, AIScoreResult>> {
  const results = new Map<string, AIScoreResult>();
  const CHUNK_SIZE = 5;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(async (item) => {
      const result = await scoreStartup(item);
      return { key: `${item.source}:${item.name}`, result };
    });

    const settled = await Promise.allSettled(promises);
    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.set(s.value.key, s.value.result);
      }
    }

    // Small delay between chunks to avoid rate limits
    if (i + CHUNK_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}
