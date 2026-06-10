import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackReportOutline } from "@/lib/fallbacks";
import { generateReportOutline } from "@/lib/openai";
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
  sourceProvider: z.string(),
  citationCount: z.number().optional(),
  relevanceScore: z.number(),
  relevanceReason: z.string(),
  verifiedMetadata: z.literal(true)
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
  paperStrategy: z.string()
});

const requestSchema = z.object({
  plan: planSchema,
  references: z.array(referenceSchema).min(1).max(8),
  pdfThemes: z.array(pdfThemeSchema).max(6).default([]),
  outputLanguage: z.enum(["ja", "en"]).default("en")
});

export async function POST(request: Request) {
  if (!rateLimit(request, 12, 60_000)) {
    return NextResponse.json({ error: "Too many outline requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid outline request." }, { status: 400 });
  }

  const { plan, references, pdfThemes, outputLanguage } = parsed.data;
  const generated = await generateReportOutline(plan, references, pdfThemes, outputLanguage);

  return NextResponse.json({
    outline: generated ?? fallbackReportOutline(plan, references, pdfThemes, outputLanguage),
    usedFallback: !generated
  });
}
