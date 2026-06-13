import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackContentPoints } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { generateContentPoints } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const pdfThemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  evidence: z.string()
});

const materialAnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string()
});

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  outputLanguage: z.enum(["ja", "en", "auto"]).default("ja"),
  details: z.object({
    assignmentPrompt: z.string().default(""),
    userOpinion: z.string().default(""),
    mustInclude: z.string().default(""),
    reportPreferences: z.array(z.string()).default([]),
    materialNotes: z.string().default("")
  }),
  pdfThemes: z.array(pdfThemeSchema).default([]),
  materialAnswers: z.array(materialAnswerSchema).default([])
});

export async function POST(request: Request) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content suggestion request." }, { status: 400 });
  }

  const { topic, outputLanguage, details, pdfThemes, materialAnswers } = parsed.data;
  const language = resolveOutputLanguage(
    [topic, details.assignmentPrompt, details.userOpinion, details.mustInclude, details.materialNotes, ...details.reportPreferences, ...materialAnswers.map((item) => item.answer)].join(" "),
    outputLanguage
  );
  const generated = await generateContentPoints(topic, details, pdfThemes, language, materialAnswers);

  return NextResponse.json({
    points: generated?.length ? generated : fallbackContentPoints(topic, details, pdfThemes, language, materialAnswers),
    outputLanguage: language,
    usedFallback: !generated
  });
}
