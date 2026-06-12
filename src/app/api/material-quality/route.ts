import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackMaterialQualityCheck } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { generateMaterialQualityCheck } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const pdfThemeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  evidence: z.string()
});

const detailsSchema = z.object({
  assignmentPrompt: z.string().default(""),
  userOpinion: z.string().default(""),
  mustInclude: z.string().default(""),
  reportPreferences: z.array(z.string()).default([]),
  materialNotes: z.string().default("")
});

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  outputLanguage: z.enum(["ja", "en", "auto"]).default("ja"),
  details: detailsSchema,
  pdfThemes: z.array(pdfThemeSchema).default([])
});

export async function POST(request: Request) {
  if (!rateLimit(request, 20, 60_000)) {
    return NextResponse.json({ error: "Too many material check requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid material quality request." }, { status: 400 });
  }

  const { topic, outputLanguage, details, pdfThemes } = parsed.data;
  const language = resolveOutputLanguage([topic, details.assignmentPrompt, details.userOpinion, details.mustInclude, details.materialNotes, ...details.reportPreferences].join(" "), outputLanguage);
  const generated = await generateMaterialQualityCheck(topic, details, pdfThemes, language);

  return NextResponse.json({
    check: generated ?? fallbackMaterialQualityCheck(topic, details, language, pdfThemes),
    outputLanguage: language,
    usedFallback: !generated
  });
}
