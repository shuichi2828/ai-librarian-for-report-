import type { ProviderPaper } from "@/lib/types";
import { compactArray, fetchJson, normalizeDoi } from "./utils";

type SemanticScholarPaper = {
  title?: string;
  authors?: Array<{ name?: string }>;
  year?: number;
  venue?: string;
  publicationVenue?: { name?: string };
  externalIds?: { DOI?: string };
  url?: string;
  abstract?: string;
  citationCount?: number;
};

type SemanticScholarResponse = {
  data?: SemanticScholarPaper[];
};

export async function searchSemanticScholar(query: string, limit = 8): Promise<ProviderPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "title,authors,year,venue,publicationVenue,externalIds,url,abstract,citationCount");

  const headers: HeadersInit = {};

  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const payload = await fetchJson<SemanticScholarResponse>(url.toString(), { headers });

  return compactArray(
    (payload.data ?? []).map((paper) => {
      if (!paper.title) {
        return null;
      }

      return {
        title: paper.title,
        authors: compactArray(paper.authors?.map((author) => author.name) ?? []),
        year: paper.year,
        sourceName: paper.publicationVenue?.name ?? paper.venue,
        doi: normalizeDoi(paper.externalIds?.DOI),
        url: paper.url,
        abstract: paper.abstract,
        citationCount: paper.citationCount,
        provider: "Semantic Scholar"
      };
    })
  );
}
