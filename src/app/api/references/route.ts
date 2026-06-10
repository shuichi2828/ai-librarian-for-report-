import { NextResponse } from "next/server";
import { z } from "zod";
import { formatApa7 } from "@/lib/citation";
import { fallbackSummary } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { enrichReferences } from "@/lib/openai";
import { searchAllProviders } from "@/lib/providers";
import { rateLimit } from "@/lib/rateLimit";
import { dedupeAndRank } from "@/lib/ranking";
import type { ReferenceItem, ThemeCandidate } from "@/lib/types";

export const runtime = "nodejs";

const candidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  researchQuestion: z.string(),
  keywordsJa: z.array(z.string()).min(1),
  keywordsEn: z.array(z.string()).min(1),
  reason: z.string(),
  thesisHint: z.string(),
  outline: z.array(z.string()).min(1),
  paperStrategy: z.string()
}) satisfies z.ZodType<ThemeCandidate>;

const requestSchema = z.object({
  candidate: candidateSchema,
  outputLanguage: z.enum(["ja", "en", "auto"]).default("auto"),
  citationStyle: z.literal("apa7").default("apa7")
});

function candidateText(candidate: ThemeCandidate): string {
  return [
    candidate.title,
    candidate.researchQuestion,
    candidate.thesisHint,
    candidate.paperStrategy,
    ...candidate.keywordsJa,
    ...candidate.keywordsEn
  ].join(" ");
}

function buildReferenceId(reference: Pick<ReferenceItem, "doi" | "title">): string {
  return (reference.doi ?? reference.title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export async function POST(request: Request) {
  if (!rateLimit(request, 12, 60_000)) {
    return NextResponse.json({ error: "Too many reference searches. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reference request." }, { status: 400 });
  }

  const { candidate, outputLanguage } = parsed.data;
  const language = resolveOutputLanguage(candidateText(candidate), outputLanguage);
  const { papers, warnings } = await searchAllProviders(candidate);
  const ranked = dedupeAndRank(papers, 15);
  const alternativeKeywords = [...candidate.keywordsJa.slice(0, 6), ...candidate.keywordsEn.slice(0, 6)];
  const refinementSuggestions =
    language === "ja"
      ? [
          "地域、時期、対象者を1つ加えて検索してください",
          "関連トピックを1語だけ足すと文献の質が上がります",
          "レビュー論文と実証研究を分けて読むと構成しやすくなります"
        ]
      : [
          "Add one region, time period, or target group",
          "Add only one related topic keyword to improve precision",
          "Read review papers and empirical studies as separate groups"
        ];

  if (ranked.length < 4) {
    return NextResponse.json({
      references: [],
      warnings: [
        ...warnings,
        language === "ja"
          ? "実在メタデータが十分に見つからなかったため、文献リストは生成しませんでした。質問回答か検索語をもう少し具体化してください。"
          : "Not enough verified metadata was found, so no bibliography was generated. Please make the answers or keywords more specific."
      ],
      alternativeKeywords,
      refinementSuggestions,
      totalCandidatesReviewed: papers.length
    });
  }

  const references: ReferenceItem[] = ranked.map((paper) => {
    const reference: ReferenceItem = {
      id: buildReferenceId({ doi: paper.doi, title: paper.title }),
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      sourceName: paper.sourceName,
      doi: paper.doi,
      url: paper.url,
      language: paper.language,
      abstract: paper.abstract,
      abstractOrMetadataSummary: "",
      whyUseful: "",
      apa7: formatApa7(paper),
      sourceProvider: paper.provider,
      citationCount: paper.citationCount,
      verifiedMetadata: true
    };
    return { ...reference, ...fallbackSummary(reference, language) };
  });

  const enriched = await enrichReferences(references, language, candidate.researchQuestion);

  if (enriched) {
    enriched.forEach((item, index) => {
      references[index] = { ...references[index], ...item };
    });
  }

  return NextResponse.json({
    references,
    warnings: [...new Set(warnings)],
    alternativeKeywords,
    refinementSuggestions,
    totalCandidatesReviewed: papers.length
  });
}
