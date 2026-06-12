import { describe, expect, it } from "vitest";
import { formatApa7, formatChicago, formatInTextCitation } from "@/lib/citation";
import type { ProviderPaper } from "@/lib/types";

describe("formatApa7", () => {
  it("formats DOI-backed references", () => {
    const paper: ProviderPaper = {
      title: "Learning with generative AI in higher education",
      authors: ["Sato, A.", "Nguyen, B."],
      year: 2025,
      sourceName: "Journal of University Learning",
      doi: "10.1234/example",
      provider: "Crossref"
    };

    expect(formatApa7(paper)).toBe(
      "Sato, A., & Nguyen, B. (2025). Learning with generative AI in higher education. Journal of University Learning. https://doi.org/10.1234/example"
    );
  });

  it("uses n.d. and URL when year and DOI are missing", () => {
    const paper: ProviderPaper = {
      title: "Regional universities and demographic change",
      authors: [],
      url: "https://example.test/work",
      provider: "OpenAlex"
    };

    expect(formatApa7(paper)).toBe("Unknown author (n.d.). Regional universities and demographic change. https://example.test/work");
  });
});

describe("Chicago author-date citations", () => {
  it("formats reference entries with year after the author", () => {
    const paper: ProviderPaper = {
      title: "Temporal Variation in Selection Influences Local Adaptation",
      authors: ["Emily Dittmar", "Douglas Schemske"],
      year: 2023,
      sourceName: "American Naturalist 202 (4): 471-85",
      doi: "10.1086/725865",
      provider: "Crossref"
    };

    expect(formatChicago(paper)).toBe(
      'Dittmar, Emily, and Douglas Schemske. 2023. "Temporal Variation in Selection Influences Local Adaptation." American Naturalist 202 (4): 471-85. https://doi.org/10.1086/725865'
    );
  });

  it("includes a page placeholder in Chicago in-text citations", () => {
    const paper: ProviderPaper = {
      title: "Inclusion Work",
      authors: ["Hyeyoung Kwon"],
      year: 2022,
      provider: "OpenAlex"
    };

    expect(formatInTextCitation(paper, "chicago")).toBe("(Kwon 2022, [page])");
  });
});
