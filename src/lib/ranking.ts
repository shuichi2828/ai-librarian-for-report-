import type { ProviderPaper } from "./types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function metadataScore(paper: ProviderPaper): number {
  let score = 0;

  if (paper.doi) score += 35;
  if (paper.url) score += 10;
  if (paper.abstract && paper.abstract.length > 200) score += 25;
  if (paper.abstract && paper.abstract.length <= 200) score += 10;
  if (paper.sourceName) score += 10;
  if (paper.year) score += Math.max(0, Math.min(18, paper.year - 2007));
  if (paper.citationCount) score += Math.min(35, Math.log10(paper.citationCount + 1) * 12);
  if (/review|systematic|meta-analysis/i.test(`${paper.title} ${paper.sourceName ?? ""}`)) score += 8;

  return score;
}

export function dedupeAndRank(papers: ProviderPaper[], limit = 15): ProviderPaper[] {
  const seen = new Map<string, ProviderPaper>();

  for (const paper of papers) {
    const key = paper.doi?.toLowerCase() ?? normalizeTitle(paper.title);
    const existing = seen.get(key);

    if (!existing || metadataScore(paper) > metadataScore(existing)) {
      seen.set(key, paper);
    }
  }

  return [...seen.values()]
    .filter((paper) => paper.title && paper.authors.length > 0 && (paper.doi || paper.url) && paper.title.length > 12)
    .sort((a, b) => metadataScore(b) - metadataScore(a))
    .slice(0, limit);
}
