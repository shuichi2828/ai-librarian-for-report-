import type { ProviderPaper } from "@/lib/types";
import { compactArray, fetchJson, normalizeDoi } from "./utils";

type CrossrefWork = {
  title?: string[];
  author?: Array<{ given?: string; family?: string; name?: string }>;
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  DOI?: string;
  URL?: string;
  abstract?: string;
  "is-referenced-by-count"?: number;
  language?: string;
};

type CrossrefResponse = {
  message?: {
    items?: CrossrefWork[];
  };
};

function authorName(author: { given?: string; family?: string; name?: string }): string | undefined {
  if (author.name) {
    return author.name;
  }

  return [author.given, author.family].filter(Boolean).join(" ") || undefined;
}

function stripMarkup(value?: string): string | undefined {
  return value?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function searchCrossref(query: string, limit = 8): Promise<ProviderPaper[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", query);
  url.searchParams.set("rows", String(limit));
  url.searchParams.set("sort", "relevance");

  if (process.env.CROSSREF_MAILTO) {
    url.searchParams.set("mailto", process.env.CROSSREF_MAILTO);
  }

  const payload = await fetchJson<CrossrefResponse>(url.toString());

  return compactArray(
    (payload.message?.items ?? []).map((work) => {
      const title = work.title?.[0];

      if (!title) {
        return null;
      }

      return {
        title,
        authors: compactArray(work.author?.map(authorName) ?? []),
        year: work.issued?.["date-parts"]?.[0]?.[0],
        sourceName: work["container-title"]?.[0],
        doi: normalizeDoi(work.DOI),
        url: work.URL,
        language: work.language,
        abstract: stripMarkup(work.abstract),
        citationCount: work["is-referenced-by-count"],
        provider: "Crossref"
      };
    })
  );
}
