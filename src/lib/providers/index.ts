import type { ProviderPaper, ThemeCandidate } from "@/lib/types";
import { searchCinii } from "./cinii";
import { searchCrossref } from "./crossref";
import { searchOpenAlex } from "./openalex";
import { searchSemanticScholar } from "./semanticScholar";

function uniqueQueries(queries: string[]): string[] {
  return [...new Set(queries.map((query) => query.replace(/\s+/g, " ").trim()).filter((query) => query.length > 0))].slice(0, 4);
}

export async function searchAllProviders(candidate: ThemeCandidate): Promise<{ papers: ProviderPaper[]; warnings: string[] }> {
  const jaQueries = uniqueQueries([
    candidate.keywordsJa.slice(0, 5).join(" "),
    candidate.keywordsJa.join(" "),
    [candidate.researchQuestion, ...candidate.keywordsJa.slice(0, 3)].join(" "),
    [candidate.title, ...candidate.keywordsJa.slice(0, 4)].join(" ")
  ]);
  const enQueries = uniqueQueries([
    candidate.keywordsEn.slice(0, 5).join(" "),
    candidate.keywordsEn.join(" "),
    [candidate.researchQuestion, ...candidate.keywordsEn.slice(0, 3)].join(" "),
    [candidate.title, ...candidate.keywordsEn.slice(0, 4)].join(" "),
    [candidate.thesisHint, ...candidate.keywordsEn.slice(0, 3)].join(" ")
  ]);

  const tasks = [
    ...enQueries.flatMap((query) => [
      { provider: "OpenAlex", run: () => searchOpenAlex(query, 15) },
      { provider: "Crossref", run: () => searchCrossref(query, 15) },
      { provider: "Semantic Scholar", run: () => searchSemanticScholar(query, 15) }
    ]),
    ...jaQueries.map((query) => ({ provider: "CiNii Research", run: () => searchCinii(query, 15) }))
  ];

  const searches = await Promise.allSettled(tasks.map((task) => task.run()));

  const papers = searches.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const warnings = searches.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }

    const provider = tasks[index]?.provider ?? "Reference provider";
    return `${provider} could not be reached.`;
  });

  return { papers, warnings };
}
