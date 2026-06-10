import { describe, expect, it } from "vitest";
import { formatApa7 } from "@/lib/citation";
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
