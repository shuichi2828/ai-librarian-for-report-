import type { InterviewAnswer, LibrarianQuestion, ReferenceItem, ThemeCandidate } from "./types";

const DEFAULT_MODEL = "gpt-5.4-mini";

type JsonSchema = Record<string, unknown>;

async function generateStructured<T>(prompt: string, schema: JsonSchema): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "ai_librarian_result",
          schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    console.warn("OpenAI request failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((content) => content.text)?.text;

  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export async function generateLibrarianQuestions(topic: string, outputLanguage: "ja" | "en"): Promise<LibrarianQuestion[] | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "type", "label", "helpText", "options", "required"],
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["choice", "text"] },
            label: { type: "string" },
            helpText: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 5 },
            required: { type: "boolean" }
          }
        }
      }
    }
  };

  const prompt = [
    "You are a friendly academic librarian interviewing an undergraduate student.",
    "The goal is to turn a vague idea into a concrete report framework before searching papers.",
    "Return 5 or 6 short questions. Include both choice and free-text questions.",
    "At least one question must ask whether the student wants to connect another topic, and a later text question must capture that related topic.",
    `Output language: ${outputLanguage}.`,
    `Student topic: ${topic}`
  ].join("\n");

  const result = await generateStructured<{ questions: LibrarianQuestion[] }>(prompt, schema);
  return result?.questions ?? null;
}

export async function generateThemeCandidates(topic: string, outputLanguage: "ja" | "en", answers: InterviewAnswer[] = []): Promise<ThemeCandidate[] | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["candidates"],
    properties: {
      candidates: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "researchQuestion", "keywordsJa", "keywordsEn", "reason", "thesisHint", "outline", "paperStrategy"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            researchQuestion: { type: "string" },
            keywordsJa: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            keywordsEn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            reason: { type: "string" },
            thesisHint: { type: "string" },
            outline: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
            paperStrategy: { type: "string" }
          }
        }
      }
    }
  };

  const prompt = [
    "You are an academic librarian helping undergraduate students narrow report topics.",
    "Return exactly four realistic report plans based on the student's topic and interview answers.",
    "Each plan must make the vague idea more concrete and include a research question, thesis hint, outline, and bilingual search keywords.",
    "Do not invent bibliography entries.",
    `Output language for title, question, and reason: ${outputLanguage}.`,
    `Student topic: ${topic}`,
    `Interview answers JSON: ${JSON.stringify(answers)}`
  ].join("\n");

  const result = await generateStructured<{ candidates: ThemeCandidate[] }>(prompt, schema);
  return result?.candidates ?? null;
}

export async function enrichReferences(
  references: ReferenceItem[],
  outputLanguage: "ja" | "en",
  researchQuestion: string
): Promise<Pick<ReferenceItem, "abstractOrMetadataSummary" | "whyUseful">[] | null> {
  if (references.length === 0) {
    return [];
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: references.length,
        maxItems: references.length,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["abstractOrMetadataSummary", "whyUseful"],
          properties: {
            abstractOrMetadataSummary: { type: "string" },
            whyUseful: { type: "string" }
          }
        }
      }
    }
  };

  const metadata = references.map((reference) => ({
    title: reference.title,
    authors: reference.authors,
    year: reference.year,
    sourceName: reference.sourceName,
    abstract: reference.abstract ?? null,
    doi: reference.doi,
    url: reference.url
  }));

  const prompt = [
    "You summarize only verified bibliographic metadata supplied by the system.",
    "If no abstract is present, explicitly say the summary is based on metadata, and do not imply you read the full paper.",
    `Output language: ${outputLanguage}.`,
    `Student research question: ${researchQuestion}`,
    `References JSON: ${JSON.stringify(metadata)}`
  ].join("\n");

  const result = await generateStructured<{ items: Pick<ReferenceItem, "abstractOrMetadataSummary" | "whyUseful">[] }>(prompt, schema);
  return result?.items ?? null;
}
