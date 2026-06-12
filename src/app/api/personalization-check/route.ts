import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackPersonalizationCheck } from "@/lib/fallbacks";
import { generatePersonalizationCheck } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const referenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().optional(),
  sourceName: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
  language: z.string().optional(),
  abstract: z.string().optional(),
  abstractOrMetadataSummary: z.string(),
  whyUseful: z.string(),
  apa7: z.string(),
  citationStyle: z.enum(["apa7", "chicago"]).optional(),
  formattedCitation: z.string().optional(),
  inTextCitation: z.string().optional(),
  citationUse: z.string().optional(),
  sourceProvider: z.string(),
  citationCount: z.number().optional(),
  relevanceScore: z.number(),
  relevanceReason: z.string(),
  verifiedMetadata: z.literal(true)
});

const contentPointSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(["background", "argument", "case", "theory", "evidence", "counterargument", "policy", "pdf", "custom"]),
  keywordsJa: z.array(z.string()),
  keywordsEn: z.array(z.string()),
  source: z.enum(["ai", "pdf", "user"])
});

const planSchema = z.object({
  id: z.string(),
  title: z.string(),
  researchQuestion: z.string(),
  keywordsJa: z.array(z.string()),
  keywordsEn: z.array(z.string()),
  reason: z.string(),
  thesisHint: z.string(),
  outline: z.array(z.string()),
  paperStrategy: z.string(),
  contentPointIds: z.array(z.string()).default([])
});

const draftSchema = z.object({
  title: z.string(),
  draft: z.string(),
  wordCountEstimate: z.number(),
  languageLevel: z.enum(["high", "middle", "low"]),
  humanLike: z.boolean(),
  notes: z.array(z.string()),
  bibliography: z.array(z.string())
});

const requestSchema = z.object({
  draft: draftSchema,
  plan: planSchema,
  references: z.array(referenceSchema).max(10).default([]),
  contentPoints: z.array(contentPointSchema).max(12).default([]),
  outputLanguage: z.enum(["ja", "en"]).default("ja")
});

export async function POST(request: Request) {
  if (!rateLimit(request, 10, 60_000)) {
    return NextResponse.json({ error: "Too many check requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid personalization check request." }, { status: 400 });
  }

  const { draft, references, contentPoints, outputLanguage } = parsed.data;
  const plan = {
    ...parsed.data.plan,
    contentPointIds: parsed.data.plan.contentPointIds ?? []
  };
  const generated = await generatePersonalizationCheck(draft, plan, references, contentPoints, outputLanguage);

  return NextResponse.json({
    check: generated ?? fallbackPersonalizationCheck(draft, plan, references, contentPoints, outputLanguage),
    usedFallback: !generated
  });
}
