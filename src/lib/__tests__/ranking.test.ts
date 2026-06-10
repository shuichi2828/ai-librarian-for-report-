import { describe, expect, it } from "vitest";
import { dedupeAndRank } from "@/lib/ranking";
import type { ProviderPaper } from "@/lib/types";

describe("dedupeAndRank", () => {
  it("deduplicates by DOI and keeps richer metadata", () => {
    const papers: ProviderPaper[] = [
      {
        title: "AI in universities",
        authors: ["A"],
        year: 2020,
        doi: "10.1000/ai",
        provider: "Crossref"
      },
      {
        title: "AI in universities",
        authors: ["A"],
        year: 2024,
        doi: "10.1000/ai",
        url: "https://doi.org/10.1000/ai",
        abstract: "A useful abstract",
        sourceName: "Learning Review",
        citationCount: 50,
        provider: "OpenAlex"
      }
    ];

    const result = dedupeAndRank(papers);

    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("OpenAlex");
  });

  it("requires enough real locator metadata", () => {
    const result = dedupeAndRank([
      {
        title: "No locator",
        authors: ["A"],
        year: 2024,
        provider: "Crossref"
      }
    ]);

    expect(result).toHaveLength(0);
  });
});
