import { AlertRule } from "./db/schema";

interface FeedItem {
  name: string;
  description: string;
  score: number;
  sector?: string;
}

export function matchesAlert(item: FeedItem, rule: AlertRule): boolean {
  // Check minimum score
  if (rule.minScore && item.score < rule.minScore) return false;

  const text = `${item.name} ${item.description} ${item.sector || ""}`.toLowerCase();

  // Check keywords (any match)
  if (rule.keywords) {
    const keywords: string[] = JSON.parse(rule.keywords);
    if (keywords.length > 0) {
      const hasKeyword = keywords.some((kw) => text.includes(kw.toLowerCase()));
      if (!hasKeyword) return false;
    }
  }

  // Check sectors (any match)
  if (rule.sectors) {
    const sectors: string[] = JSON.parse(rule.sectors);
    if (sectors.length > 0) {
      const hasSector = sectors.some((s) => text.includes(s.toLowerCase()));
      if (!hasSector) return false;
    }
  }

  return true;
}
