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
  const prompt = `You are a VC scout evaluating startups for investment potential. Score this startup from 0-100 based on:
- Innovation/novelty (is this solving a real problem in a new way?)
- Market size potential
- Traction signals (engagement, community interest)
- Team quality indicators
- Technical differentiation

Startup:
- Name: ${item.name}
- Source: ${item.source}
- Description: ${item.description || "N/A"}
- Engagement Score: ${item.score} (from source platform)
- URL: ${item.url}
- Founders: ${item.founders || "Unknown"}
- Sector: ${item.sector || "Unknown"}

Respond ONLY with valid JSON (no markdown, no code blocks):
{"score": <0-100>, "verdict": "<one sentence assessment>", "tags": ["<tag1>", "<tag2>", "<tag3>"]}`;

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
  const prompt = `You are a VC scout doing deep research on a startup. Provide a comprehensive analysis.

Startup:
- Name: ${startup.name}
- Description: ${startup.description || "N/A"}
- Website: ${startup.url || "N/A"}
- Founders: ${startup.founders || "Unknown"}
- Sector: ${startup.sector || "Unknown"}
- Source: ${startup.source}
- Platform Score: ${startup.score}

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "score": <0-100 investment potential>,
  "verdict": "<2-3 sentence investment thesis>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "sector": "<primary sector classification>",
  "stage": "<pre-seed|seed|series-a|growth>",
  "competitiveLandscape": "<brief competitive analysis, key competitors>",
  "founderInsights": "<any insights about founders/team>",
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
