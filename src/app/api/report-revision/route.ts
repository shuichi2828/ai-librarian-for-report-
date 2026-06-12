import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackRevisedReportDraft } from "@/lib/fallbacks";
import { generateRevisedReportDraft } from "@/lib/openai";
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

const improvementSchema = z.object({
  id: z.string(),
  title: z.string(),
  issue: z.string(),
  suggestion: z.string(),
  category: z.enum(["opinion", "course", "evidence", "example", "counterargument", "structure", "clarity", "other"]),
  priority: z.enum(["high", "medium", "low"])
});

const draftOptionsSchema = z.object({
  targetWordCount: z.number().int().min(300).max(5000).default(1200),
  languageLevel: z.enum(["high", "middle", "low"]).default("middle"),
  writingStyle: z.enum(["standard", "academic"]).default("standard"),
  humanLike: z.boolean().default(true),
  otherConditions: z.string().max(1200).default("")
});

const requestSchema = z.object({
  draft: draftSchema,
  plan: planSchema,
  references: z.array(referenceSchema).max(10).default([]),
  contentPoints: z.array(contentPointSchema).max(12).default([]),
  selectedImprovements: z.array(improvementSchema).min(1).max(10),
  customImprovements: z.array(z.string().min(1).max(500)).max(5).default([]),
  options: draftOptionsSchema,
  outputLanguage: z.enum(["ja", "en"]).default("ja")
});

export async function POST(request: Request) {
  if (!rateLimit(request, 8, 60_000)) {
    return NextResponse.json({ error: "Too many revision requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid revision request." }, { status: 400 });
  }

  const { draft, references, contentPoints, selectedImprovements, customImprovements, options, outputLanguage } = parsed.data;
  const plan = {
    ...parsed.data.plan,
    contentPointIds: parsed.data.plan.contentPointIds ?? []
  };
  const generated = await generateRevisedReportDraft(draft, plan, references, contentPoints, selectedImprovements, customImprovements, options, outputLanguage);

  return NextResponse.json({
    draft: generated ?? fallbackRevisedReportDraft(draft, references, selectedImprovements, customImprovements, options, outputLanguage),
    usedFallback: !generated
  });
}
