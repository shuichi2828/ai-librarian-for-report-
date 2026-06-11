import pdf from "pdf-parse";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fallbackPdfInsights } from "@/lib/fallbacks";
import { resolveOutputLanguage } from "@/lib/language";
import { generatePdfInsights, generatePdfInsightsFromPdfFile } from "@/lib/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const fieldsSchema = z.object({
  outputLanguage: z.enum(["ja", "en", "auto"]).default("ja"),
  avoidThemes: z.array(z.string()).default([]),
  forceOcr: z.boolean().default(false)
});

export async function POST(request: Request) {
  if (!rateLimit(request, 8, 60_000)) {
    return NextResponse.json({ error: "Too many PDF reads. Please wait a moment." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF is too large. Please upload a file under 8 MB." }, { status: 400 });
  }

  const fields = fieldsSchema.safeParse({
    outputLanguage: formData.get("outputLanguage") || "ja",
    avoidThemes: JSON.parse(String(formData.get("avoidThemes") || "[]")) as string[],
    forceOcr: String(formData.get("forceOcr") || "false") === "true"
  });

  if (!fields.success) {
    return NextResponse.json({ error: "Invalid PDF request." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";

  if (!fields.data.forceOcr) {
    try {
      const parsed = await pdf(bytes);
      text = parsed.text.replace(/\s+/g, " ").trim();
    } catch {
      text = "";
    }
  }

  const language = resolveOutputLanguage(text || file.name, fields.data.outputLanguage);
  const shouldUseOcr = fields.data.forceOcr || text.length < 500;
  const generated = shouldUseOcr
    ? await generatePdfInsightsFromPdfFile(file.name, bytes, language, fields.data.avoidThemes)
    : await generatePdfInsights(text, language, fields.data.avoidThemes);

  if (!generated && text.length < 500) {
    return NextResponse.json(
      {
        error:
          "Could not read enough text from this PDF. If it is a scanned PDF, set OPENAI_API_KEY and try OCR mode."
      },
      { status: 400 }
    );
  }

  const result = generated ?? fallbackPdfInsights(text, language);

  return NextResponse.json({
    ...result,
    textLength: text.length,
    extractionMode: shouldUseOcr ? "openai-ocr" : "text",
    usedFallback: !generated
  });
}
