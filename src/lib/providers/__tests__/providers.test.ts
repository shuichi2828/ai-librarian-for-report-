import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCinii } from "@/lib/providers/cinii";
import { searchOpenAlex } from "@/lib/providers/openalex";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provider adapters", () => {
  it("normalizes OpenAlex work metadata", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Generative AI and higher education",
              publication_year: 2025,
              doi: "https://doi.org/10.1/openalex",
              language: "en",
              cited_by_count: 12,
              primary_location: {
                landing_page_url: "https://example.test/openalex",
                source: { display_name: "Higher Education Studies" }
              },
              authorships: [{ author: { display_name: "Ada Sato" } }],
              abstract_inverted_index: { AI: [0], learning: [1] }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await searchOpenAlex("generative AI");

    expect(result[0]).toMatchObject({
      title: "Generative AI and higher education",
      authors: ["Ada Sato"],
      year: 2025,
      doi: "10.1/openalex",
      sourceName: "Higher Education Studies",
      abstract: "AI learning"
    });
  });

  it("normalizes CiNii RSS metadata", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        `<?xml version="1.0"?>
        <rdf:RDF>
          <item>
            <title>地方大学と少子化</title>
            <link>https://cir.nii.ac.jp/work</link>
            <dc:creator>山田 太郎</dc:creator>
            <dc:date>2023</dc:date>
            <prism:publicationName>大学研究</prism:publicationName>
            <description>概要</description>
          </item>
        </rdf:RDF>`,
        { status: 200, headers: { "Content-Type": "application/xml" } }
      )
    );

    const result = await searchCinii("地方大学 少子化");

    expect(result[0]).toMatchObject({
      title: "地方大学と少子化",
      authors: ["山田 太郎"],
      year: 2023,
      url: "https://cir.nii.ac.jp/work",
      provider: "CiNII Research"
    });
  });
});
