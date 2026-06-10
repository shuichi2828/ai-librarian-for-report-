import type { ProviderPaper } from "@/lib/types";
import { compactArray, fetchJson, normalizeDoi } from "./utils";

type OpenAlexWork = {
  title?: string;
  display_name?: string;
  publication_year?: number;
  doi?: string;
  language?: string;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    landing_page_url?: string;
    source?: { display_name?: string };
  };
  authorships?: Array<{
    author?: { display_name?: string };
  }>;
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

function restoreAbstract(index?: Record<string, number[]>): string | undefined {
  if (!index) {
    return undefined;
  }

  const words: string[] = [];

  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words[position] = word;
    }
  }

  return words.filter(Boolean).join(" ");
}

export async function searchOpenAlex(query: string, limit = 8): Promise<ProviderPaper[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", String(limit));
  url.searchParams.set("sort", "relevance_score:desc");

  if (process.env.CROSSREF_MAILTO) {
    url.searchParams.set("mailto", process.env.CROSSREF_MAILTO);
  }

  if (process.env.OPENALEX_API_KEY) {
    url.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
  }

  const payload = await fetchJson<OpenAlexResponse>(url.toString());

  return compactArray(
    (payload.results ?? []).map((work) => {
      const title = work.title ?? work.display_name;

      if (!title) {
        return null;
      }

      return {
        title,
        authors: compactArray(work.authorships?.map((authorship) => authorship.author?.display_name) ?? []),
        year: work.publication_year,
        sourceName: work.primary_location?.source?.display_name,
        doi: normalizeDoi(work.doi),
        url: work.primary_location?.landing_page_url ?? work.doi,
        language: work.language,
        abstract: restoreAbstract(work.abstract_inverted_index),
        citationCount: work.cited_by_count,
        provider: "OpenAlex"
      };
    })
  );
}
