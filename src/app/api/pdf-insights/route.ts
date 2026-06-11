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

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const PDF_TYPES = new Set(["application/pdf", "application/x-pdf", "application/octet-stream", ""]);

function parseAvoidThemes(value: FormDataEntryValue | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  if (!rateLimit(request, 8, 60_000)) {
    return NextResponse.json({ error: "Too many PDF reads. Please wait a moment." }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const isPdfFile = file instanceof File && (PDF_TYPES.has(file.type) || file.name.toLowerCase().endsWith(".pdf"));

  if (!(file instanceof File) || !isPdfFile) {
    return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "PDF is too large. Please upload a file under 15 MB." }, { status: 400 });
  }

  const fields = fieldsSchema.safeParse({
    outputLanguage: formData.get("outputLanguage") || "ja",
    avoidThemes: parseAvoidThemes(formData.get("avoidThemes")),
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

  const result = generated ?? fallbackPdfInsights(text || file.name, language);

  return NextResponse.json({
    ...result,
    textLength: text.length,
    extractionMode: shouldUseOcr ? "openai-ocr" : "text",
    usedFallback: !generated
  });
}
