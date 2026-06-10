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
    .default([])
});

export async function POST(request: Request) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid topic or output language." }, { status: 400 });
  }

  const { topic, outputLanguage, answers, pdfThemes } = parsed.data;
  const language = resolveOutputLanguage(topic, outputLanguage);
  const generated = await generateThemeCandidates(topic, language, answers, pdfThemes);
  const candidates = generated?.length === 4 ? generated : fallbackThemeCandidates(topic, language, answers, pdfThemes);

  return NextResponse.json({
    candidates,
    outputLanguage: language,
    usedFallback: !generated
  });
}
