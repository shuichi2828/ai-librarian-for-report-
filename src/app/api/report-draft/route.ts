import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackReportDraft } from "@/lib/fallbacks";
import { generateReportDraft } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const pdfThemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  evidence: z.string()
});

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

const outlineSchema = z
  .object({
    title: z.string(),
    thesis: z.string(),
    sections: z.array(
      z.object({
        title: z.string(),
        purpose: z.string(),
        keyPoints: z.array(z.string()),
        paperIds: z.array(z.string())
      })
    ),
    selectedPdfThemes: z.array(z.string()),
    selectedContentPointIds: z.array(z.string()),
    selectedPaperIds: z.array(z.string()),
    nextSteps: z.array(z.string())
  })
  .nullable()
  .default(null);

const draftOptionsSchema = z.object({
  targetWordCount: z.number().int().min(300).max(5000).default(1200),
  languageLevel: z.enum(["high", "middle", "low"]).default("middle"),
  writingStyle: z.enum(["standard", "academic"]).default("standard"),
  humanLike: z.boolean().default(true),
  otherConditions: z.string().max(1200).default("")
});

const requestSchema = z.object({
  plan: planSchema,
  references: z.array(referenceSchema).max(10).default([]),
  pdfThemes: z.array(pdfThemeSchema).max(6).default([]),
  contentPoints: z.array(contentPointSchema).max(12).default([]),
  outline: outlineSchema,
  options: draftOptionsSchema,
  outputLanguage: z.enum(["ja", "en"]).default("ja")
});

export async function POST(request: Request) {
  if (!rateLimit(request, 8, 60_000)) {
    return NextResponse.json({ error: "Too many draft requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft request." }, { status: 400 });
  }

  const { references, pdfThemes, contentPoints, outline, options, outputLanguage } = parsed.data;
  if (references.length === 0 && pdfThemes.length === 0 && contentPoints.length === 0) {
    return NextResponse.json({ error: "Select at least one paper, PDF theme, or content point before drafting." }, { status: 400 });
  }

  const plan = {
    ...parsed.data.plan,
    contentPointIds: parsed.data.plan.contentPointIds ?? []
  };
  const generated = await generateReportDraft(plan, references, pdfThemes, contentPoints, outline, options, outputLanguage);

  return NextResponse.json({
    draft: generated ?? fallbackReportDraft(plan, references, pdfThemes, contentPoints, outline, options, outputLanguage),
    usedFallback: !generated
  });
}
