import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackThemeCandidates } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { generateThemeCandidates } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  outputLanguage: z.enum(["ja", "en", "auto"]).default("auto"),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        question: z.string(),
        answer: z.string()
      })
    )
    .default([]),
  pdfThemes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        keywords: z.array(z.string()),
        evidence: z.string()
      })
    )
    .default([]),
  contentPoints: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        type: z.enum(["background", "argument", "case", "theory", "evidence", "counterargument", "policy", "pdf", "custom"]),
        keywordsJa: z.array(z.string()),
        keywordsEn: z.array(z.string()),
        source: z.enum(["ai", "pdf", "user"])
      })
    )
    .default([]),
  previousCandidates: z
    .array(
      z.object({
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
      })
    )
    .max(8)
    .default([]),
  combineCandidateIds: z.array(z.string()).max(4).default([]),
  refinementInstruction: z.string().trim().max(1200).default("")
});

export async function POST(request: Request) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid topic or output language." }, { status: 400 });
  }

  const { topic, outputLanguage, answers, pdfThemes, contentPoints, previousCandidates, combineCandidateIds, refinementInstruction } = parsed.data;
  const language = resolveOutputLanguage(topic, outputLanguage);
  const generated = await generateThemeCandidates(topic, language, answers, pdfThemes, contentPoints, refinementInstruction, previousCandidates, combineCandidateIds);
  const candidates = generated?.length === 4 ? generated : fallbackThemeCandidates(topic, language, answers, pdfThemes, contentPoints);
  const enrichedCandidates = candidates.map((candidate) => ({
    ...candidate,
    keywordsJa: [...new Set([...candidate.keywordsJa, ...contentPoints.flatMap((point) => point.keywordsJa)])].slice(0, 10),
    keywordsEn: [...new Set([...candidate.keywordsEn, ...contentPoints.flatMap((point) => point.keywordsEn)])].slice(0, 10),
    contentPointIds: candidate.contentPointIds?.length ? candidate.contentPointIds : contentPoints.slice(0, 6).map((point) => point.id)
  }));

  return NextResponse.json({
    candidates: enrichedCandidates,
    outputLanguage: language,
    usedFallback: !generated
  });
}
