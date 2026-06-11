import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackLibrarianQuestions } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { generateLibrarianQuestions } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(300),
  outputLanguage: z.enum(["ja", "en", "auto"]).default("ja")
});

export async function POST(request: Request) {
  if (!rateLimit(request)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid topic or output language." }, { status: 400 });
  }

  const { topic, outputLanguage } = parsed.data;
  const language = resolveOutputLanguage(topic, outputLanguage);
  const generated = await generateLibrarianQuestions(topic, language);
  const otherLabel = language === "ja" ? "その他" : "Other";
  const questions = (generated?.length ? generated : fallbackLibrarianQuestions(topic, language)).map((question) => {
    if (question.type !== "choice") {
      return question;
    }

    const options = question.options ?? [];
    return options.some((option) => option.toLowerCase() === otherLabel.toLowerCase()) ? question : { ...question, options: [...options, otherLabel] };
  });

  return NextResponse.json({
    questions,
    outputLanguage: language,
    usedFallback: !generated
  });
}
