import type { ProviderPaper, ThemeCandidate } from "./types";

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

export function scorePaperRelevance(paper: ProviderPaper, plan: ThemeCandidate): { score: number; reason: string } {
  const queryTokens = [...new Set(tokens([plan.title, plan.researchQuestion, plan.thesisHint, ...plan.keywordsJa, ...plan.keywordsEn].join(" ")))];
  const titleTokens = new Set(tokens(paper.title));
  const abstractTokens = new Set(tokens(paper.abstract ?? ""));
  const sourceTokens = new Set(tokens(paper.sourceName ?? ""));

  let hits = 0;
  let weighted = 0;

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      hits += 1;
      weighted += 4;
    } else if (abstractTokens.has(token)) {
      hits += 1;
      weighted += 2;
    } else if (sourceTokens.has(token)) {
      hits += 1;
      weighted += 1;
    }
  }

  const keywordCoverage = queryTokens.length ? hits / queryTokens.length : 0;
  const metadataBoost = (paper.doi ? 6 : 0) + (paper.abstract ? 8 : 0) + (paper.citationCount ? Math.min(10, Math.log10(paper.citationCount + 1) * 3) : 0);
  const score = Math.max(35, Math.min(98, Math.round(keywordCoverage * 72 + weighted * 1.7 + metadataBoost)));
  const reason =
    score >= 80
      ? "Strong keyword and metadata match"
      : score >= 65
        ? "Good topical match with usable metadata"
        : "Partial match; inspect before using";

  return { score, reason };
}
