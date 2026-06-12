import type {
  AssignmentDetails,
  ContentPoint,
  InterviewAnswer,
  LibrarianQuestion,
  MaterialQualityCheck,
  PersonalizationCheck,
  PersonalizationPoint,
  PdfInsightResult,
  PdfTheme,
  ReportDraft,
  ReportDraftOptions,
  ReferenceItem,
  ReportOutline,
  RevisedReportDraft,
  ThemeCandidate
} from "./types";

const DEFAULT_MODEL = "gpt-5.4-mini";

type JsonSchema = Record<string, unknown>;

function languageInstruction(outputLanguage: "ja" | "en") {
  return outputLanguage === "ja"
    ? "Output language: Japanese. Use natural Japanese for every user-visible field. Do not switch to English except for paper titles, author names, journal names, DOI/URLs, search keywords, and established technical terms."
    : "Output language: English.";
}

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

async function generateStructuredFromContent<T>(
  content: Array<Record<string, unknown>>,
  schema: JsonSchema,
  model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL
): Promise<T | null> {
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
      model,
      input: [
        {
          role: "user",
          content
        }
      ],
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
    console.warn("OpenAI file request failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

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
            options: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 6 },
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
    languageInstruction(outputLanguage),
    `Student topic: ${topic}`
  ].join("\n");

  const result = await generateStructured<{ questions: LibrarianQuestion[] }>(prompt, schema);
  return result?.questions ?? null;
}

export async function generatePdfInsights(
  pdfText: string,
  outputLanguage: "ja" | "en",
  avoidThemes: string[] = []
): Promise<PdfInsightResult | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["documentTitle", "summary", "themes"],
    properties: {
      documentTitle: { type: "string" },
      summary: { type: "string" },
      themes: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "summary", "keywords", "evidence"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            keywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
            evidence: { type: "string" }
          }
        }
      }
    }
  };

  const prompt = [
    "You are an academic librarian reading a PDF for an undergraduate student.",
    "Summarize the document and extract important report-worthy themes.",
    "Themes must be grounded only in the supplied PDF text. Do not invent claims.",
    "If avoid themes are provided, extract different but still important themes where possible.",
    languageInstruction(outputLanguage),
    `Avoid themes: ${JSON.stringify(avoidThemes)}`,
    `PDF text excerpt: ${pdfText.slice(0, 24000)}`
  ].join("\n");

  return generateStructured<PdfInsightResult>(prompt, schema);
}

export async function generatePdfInsightsFromPdfFile(
  fileName: string,
  pdfBytes: Buffer,
  outputLanguage: "ja" | "en",
  avoidThemes: string[] = []
): Promise<PdfInsightResult | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["documentTitle", "summary", "themes"],
    properties: {
      documentTitle: { type: "string" },
      summary: { type: "string" },
      themes: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "summary", "keywords", "evidence"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            keywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 7 },
            evidence: { type: "string" }
          }
        }
      }
    }
  };

  const base64 = pdfBytes.toString("base64");
  return generateStructuredFromContent<PdfInsightResult>(
    [
      {
        type: "input_file",
        filename: fileName || "uploaded.pdf",
        file_data: `data:application/pdf;base64,${base64}`
      },
      {
        type: "input_text",
        text: [
          "You are an academic librarian reading a scanned or image-based PDF for an undergraduate student.",
          "Use OCR/vision over the PDF pages when normal text extraction is not available.",
          "Summarize the document and extract important report-worthy themes grounded only in the PDF.",
          "If avoid themes are provided, extract different but still important themes where possible.",
          "Keep evidence excerpts short.",
          languageInstruction(outputLanguage),
          `Avoid themes: ${JSON.stringify(avoidThemes)}`
        ].join("\n")
      }
    ],
    schema,
    process.env.OPENAI_OCR_MODEL ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL
  );
}

export async function generateContentPoints(
  topic: string,
  details: AssignmentDetails,
  pdfThemes: PdfTheme[],
  outputLanguage: "ja" | "en"
): Promise<ContentPoint[] | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["points"],
    properties: {
      points: {
        type: "array",
        minItems: 8,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "description", "type", "keywordsJa", "keywordsEn", "source"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["background", "argument", "case", "theory", "evidence", "counterargument", "policy", "pdf", "custom"] },
            keywordsJa: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            keywordsEn: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            source: { type: "string", enum: ["ai", "pdf", "user"] }
          }
        }
      }
    }
  };

  const prompt = [
    "You are an academic librarian helping an undergraduate decide what content to include in a report.",
    "Return 8 to 12 selectable content points. They should be concrete enough to become sections, arguments, evidence, counterarguments, cases, or policy points.",
    "Use the assignment prompt, student's tentative opinion, must-include points, report preferences, material notes, and PDF themes when available.",
    "Respect report preferences such as personal experience, paper citations, objective facts, course content, comparison, policy, and critical discussion.",
    "Include points that support the student's view and at least one point that complicates or challenges it.",
    languageInstruction(outputLanguage),
    `Research topic: ${topic}`,
    `Assignment details JSON: ${JSON.stringify(details)}`,
    `PDF themes JSON: ${JSON.stringify(pdfThemes)}`
  ].join("\n");

  const result = await generateStructured<{ points: ContentPoint[] }>(prompt, schema);
  return result?.points ?? null;
}

export async function generateMaterialQualityCheck(
  topic: string,
  details: AssignmentDetails,
  pdfThemes: PdfTheme[],
  outputLanguage: "ja" | "en"
): Promise<MaterialQualityCheck | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["score", "verdict", "weaknesses", "questions", "suggestions", "recommendedPreferences"],
    properties: {
      score: { type: "number" },
      verdict: { type: "string" },
      weaknesses: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      questions: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "type", "label", "helpText", "options"],
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["choice", "text"] },
            label: { type: "string" },
            helpText: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 6 }
          }
        }
      },
      suggestions: {
        type: "array",
        minItems: 4,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "description", "preferenceFit", "keywordsJa", "keywordsEn"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            preferenceFit: { type: "string" },
            keywordsJa: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
            keywordsEn: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 }
          }
        }
      },
      recommendedPreferences: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 }
    }
  };

  const prompt = [
    "You are an academic librarian checking whether a student's initial report material is concrete enough to generate strong report plans.",
    "Give a material strength score from 0 to 100. Higher means the material is specific enough for focused plans and paper search.",
    "Ask short follow-up questions only where the material is vague.",
    "Suggest selectable material additions that would make the plan more specific.",
    "Include report preference guidance. Preferences may include personal experience, paper citation focus, objective facts, course content, comparison, policy/practice, or critical discussion.",
    "Do not ask for private sensitive data.",
    languageInstruction(outputLanguage),
    `Research topic: ${topic}`,
    `Assignment details JSON: ${JSON.stringify(details)}`,
    `PDF themes JSON: ${JSON.stringify(pdfThemes)}`
  ].join("\n");

  return generateStructured<MaterialQualityCheck>(prompt, schema);
}

export async function generateThemeCandidates(
  topic: string,
  outputLanguage: "ja" | "en",
  answers: InterviewAnswer[] = [],
  pdfThemes: PdfTheme[] = [],
  contentPoints: ContentPoint[] = [],
  refinementInstruction = "",
  previousCandidates: ThemeCandidate[] = [],
  combineCandidateIds: string[] = []
): Promise<ThemeCandidate[] | null> {
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
          required: ["id", "title", "researchQuestion", "keywordsJa", "keywordsEn", "reason", "thesisHint", "outline", "paperStrategy", "contentPointIds"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            researchQuestion: { type: "string" },
            keywordsJa: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            keywordsEn: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
            reason: { type: "string" },
            thesisHint: { type: "string" },
            outline: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
            paperStrategy: { type: "string" },
            contentPointIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 }
          }
        }
      }
    }
  };

  const prompt = [
    "You are an academic librarian helping undergraduate students narrow report topics.",
    "Return exactly four realistic report plans based on the student's topic and interview answers.",
    "Each plan must use selected content points, make the vague idea more concrete, and include a research question, thesis hint, outline, and bilingual search keywords.",
    "If previous candidates and refinement instructions are provided, improve the plans instead of simply repeating them.",
    "If combineCandidateIds are provided, create at least one plan that mixes the strongest compatible parts of those plans.",
    "When refining, preserve useful parts the student liked, remove weak parts, and make the plans more flexible and report-ready.",
    "Do not invent bibliography entries.",
    languageInstruction(outputLanguage),
    `Student topic: ${topic}`,
    `Interview answers JSON: ${JSON.stringify(answers)}`,
    `Selected PDF themes JSON: ${JSON.stringify(pdfThemes)}`,
    `Selected content points JSON: ${JSON.stringify(contentPoints)}`,
    `Previous candidates JSON: ${JSON.stringify(previousCandidates)}`,
    `Candidate IDs to combine JSON: ${JSON.stringify(combineCandidateIds)}`,
    `Student refinement instruction: ${refinementInstruction || "None"}`
  ].join("\n");

  const result = await generateStructured<{ candidates: ThemeCandidate[] }>(prompt, schema);
  return result?.candidates ?? null;
}

export async function generateReportOutline(
  plan: ThemeCandidate,
  references: ReferenceItem[],
  pdfThemes: PdfTheme[],
  contentPoints: ContentPoint[],
  outputLanguage: "ja" | "en"
): Promise<ReportOutline | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "thesis", "sections", "selectedPdfThemes", "selectedContentPointIds", "selectedPaperIds", "nextSteps"],
    properties: {
      title: { type: "string" },
      thesis: { type: "string" },
      sections: {
        type: "array",
        minItems: 4,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "purpose", "keyPoints", "paperIds"],
          properties: {
            title: { type: "string" },
            purpose: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
            paperIds: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 8 }
          }
        }
      },
      selectedPdfThemes: { type: "array", items: { type: "string" } },
      selectedContentPointIds: { type: "array", items: { type: "string" } },
      selectedPaperIds: { type: "array", items: { type: "string" } },
      nextSteps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 }
    }
  };

  const safeReferences = references.map((reference) => ({
    id: reference.id,
    title: reference.title,
    authors: reference.authors,
    year: reference.year,
    summary: reference.abstractOrMetadataSummary,
    relevanceScore: reference.relevanceScore,
    citationStyle: reference.citationStyle ?? "apa7",
    citation: reference.formattedCitation ?? reference.apa7,
    inTextCitation: reference.inTextCitation,
    apa7: reference.apa7
  }));

  const prompt = [
    "You are an academic librarian helping a student build a report outline.",
    "Use the chosen report plan, selected content points, selected PDF themes, and selected verified papers.",
    "Every section should say which selected papers support it using paperIds.",
    languageInstruction(outputLanguage),
    `Report plan JSON: ${JSON.stringify(plan)}`,
    `Selected content points JSON: ${JSON.stringify(contentPoints)}`,
    `Selected PDF themes JSON: ${JSON.stringify(pdfThemes)}`,
    `Selected papers JSON: ${JSON.stringify(safeReferences)}`
  ].join("\n");

  return generateStructured<ReportOutline>(prompt, schema);
}

export async function generateReportDraft(
  plan: ThemeCandidate,
  references: ReferenceItem[],
  pdfThemes: PdfTheme[],
  contentPoints: ContentPoint[],
  outline: ReportOutline | null,
  options: ReportDraftOptions,
  outputLanguage: "ja" | "en"
): Promise<ReportDraft | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "draft", "wordCountEstimate", "languageLevel", "humanLike", "notes", "bibliography"],
    properties: {
      title: { type: "string" },
      draft: { type: "string" },
      wordCountEstimate: { type: "number" },
      languageLevel: { type: "string", enum: ["high", "middle", "low"] },
      humanLike: { type: "boolean" },
      notes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      bibliography: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 10 }
    }
  };

  const safeReferences = references.map((reference) => ({
    id: reference.id,
    title: reference.title,
    authors: reference.authors,
    year: reference.year,
    sourceName: reference.sourceName,
    summary: reference.abstractOrMetadataSummary,
    relevanceScore: reference.relevanceScore,
    citationStyle: reference.citationStyle ?? "apa7",
    citation: reference.formattedCitation ?? reference.apa7,
    inTextCitation: reference.inTextCitation,
    apa7: reference.apa7
  }));

  const prompt = [
    "You are an academic librarian helping an undergraduate turn a plan into an editable report draft.",
    "Write a draft that the student can revise, not a final submission. Add a note reminding the student to verify full texts and course rules.",
    "Use only the selected verified papers for citations. Do not invent sources, page numbers, quotes, or findings.",
    "Use the supplied in-text citation examples when a selected paper supports a claim, and include the supplied bibliography entries in the selected citation style.",
    "If a supplied Chicago Author-Date citation contains [page], keep that placeholder unless an exact page is provided by the selected material.",
    "If no selected papers are provided, write a PDF-only draft grounded in the selected PDF themes and content points. Clearly state that no external paper citations are included yet.",
    "If a paper only has metadata summary, avoid detailed claims that would require reading the full paper.",
    "If writingStyle is academic, use formal academic prose, clear topic sentences, cautious claims, and transitions suitable for a university report.",
    "Human-like means natural, readable academic prose; do not optimize for bypassing AI detection.",
    languageInstruction(outputLanguage),
    `Target word count: ${options.targetWordCount}.`,
    `Language level: ${options.languageLevel}. High = advanced academic, middle = clear undergraduate, low = simple and accessible.`,
    `Writing style: ${options.writingStyle}.`,
    `Natural human-like tone: ${options.humanLike}.`,
    `Other conditions: ${options.otherConditions || "None"}`,
    `Report plan JSON: ${JSON.stringify(plan)}`,
    `Report outline JSON: ${JSON.stringify(outline)}`,
    `Selected content points JSON: ${JSON.stringify(contentPoints)}`,
    `Selected PDF themes JSON: ${JSON.stringify(pdfThemes)}`,
    `Selected papers JSON: ${JSON.stringify(safeReferences)}`
  ].join("\n");

  return generateStructured<ReportDraft>(prompt, schema);
}

export async function generatePersonalizationCheck(
  draft: ReportDraft,
  plan: ThemeCandidate,
  references: ReferenceItem[],
  contentPoints: ContentPoint[],
  outputLanguage: "ja" | "en"
): Promise<PersonalizationCheck | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["summary", "points"],
    properties: {
      summary: { type: "string" },
      points: {
        type: "array",
        minItems: 5,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "issue", "suggestion", "category", "priority"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            issue: { type: "string" },
            suggestion: { type: "string" },
            category: { type: "string", enum: ["opinion", "course", "evidence", "example", "counterargument", "structure", "clarity", "other"] },
            priority: { type: "string", enum: ["high", "medium", "low"] }
          }
        }
      }
    }
  };

  const safeReferences = references.map((reference) => ({
    id: reference.id,
    title: reference.title,
    authors: reference.authors,
    year: reference.year,
    summary: reference.abstractOrMetadataSummary,
    citationStyle: reference.citationStyle ?? "apa7",
    citation: reference.formattedCitation ?? reference.apa7,
    inTextCitation: reference.inTextCitation,
    apa7: reference.apa7
  }));

  const prompt = [
    "You are an academic writing tutor and librarian.",
    "Review the report draft to help the student make it more genuinely their own work.",
    "Do not judge whether it is AI-written and do not provide advice for bypassing AI detection.",
    "Focus on adding the student's opinion, course context, concrete examples, careful use of selected papers, counterarguments, and clearer structure.",
    "Return selectable improvement points. Each point should be concrete enough that the student can choose it before revision.",
    languageInstruction(outputLanguage),
    `Report plan JSON: ${JSON.stringify(plan)}`,
    `Selected content points JSON: ${JSON.stringify(contentPoints)}`,
    `Selected papers JSON: ${JSON.stringify(safeReferences)}`,
    `Draft JSON: ${JSON.stringify(draft)}`
  ].join("\n");

  return generateStructured<PersonalizationCheck>(prompt, schema);
}

export async function generateRevisedReportDraft(
  draft: ReportDraft,
  plan: ThemeCandidate,
  references: ReferenceItem[],
  contentPoints: ContentPoint[],
  selectedImprovements: PersonalizationPoint[],
  customImprovements: string[],
  options: ReportDraftOptions,
  outputLanguage: "ja" | "en"
): Promise<RevisedReportDraft | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "draft", "wordCountEstimate", "languageLevel", "humanLike", "notes", "bibliography", "appliedImprovementIds", "customImprovements"],
    properties: {
      title: { type: "string" },
      draft: { type: "string" },
      wordCountEstimate: { type: "number" },
      languageLevel: { type: "string", enum: ["high", "middle", "low"] },
      humanLike: { type: "boolean" },
      notes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      bibliography: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 10 },
      appliedImprovementIds: { type: "array", items: { type: "string" } },
      customImprovements: { type: "array", items: { type: "string" } }
    }
  };

  const safeReferences = references.map((reference) => ({
    id: reference.id,
    title: reference.title,
    authors: reference.authors,
    year: reference.year,
    summary: reference.abstractOrMetadataSummary,
    citationStyle: reference.citationStyle ?? "apa7",
    citation: reference.formattedCitation ?? reference.apa7,
    inTextCitation: reference.inTextCitation,
    apa7: reference.apa7
  }));

  const prompt = [
    "You are an academic writing tutor and librarian.",
    "Revise the draft according to the selected improvements so it better reflects the student's own argument, course context, evidence choices, examples, and limitations.",
    "Do not provide or optimize for AI-detection evasion. Keep the goal as better academic authorship and revision.",
    "Use only the selected verified papers. Do not invent sources, page numbers, direct quotes, or findings.",
    "If a supplied Chicago Author-Date citation contains [page], keep that placeholder unless an exact page is provided by the selected material.",
    "If no selected papers are provided, preserve PDF-only framing and clearly avoid external-paper citations.",
    "If a source only has metadata, avoid detailed claims that require full-text reading.",
    "If writingStyle is academic, revise toward formal academic prose, cautious claims, and clearer paragraph-level argumentation.",
    languageInstruction(outputLanguage),
    `Target word count: ${options.targetWordCount}.`,
    `Language level: ${options.languageLevel}.`,
    `Writing style: ${options.writingStyle}.`,
    `Other conditions: ${options.otherConditions || "None"}`,
    `Report plan JSON: ${JSON.stringify(plan)}`,
    `Selected content points JSON: ${JSON.stringify(contentPoints)}`,
    `Selected papers JSON: ${JSON.stringify(safeReferences)}`,
    `Selected improvements JSON: ${JSON.stringify(selectedImprovements)}`,
    `Other custom improvements JSON: ${JSON.stringify(customImprovements)}`,
    `Original draft JSON: ${JSON.stringify(draft)}`
  ].join("\n");

  return generateStructured<RevisedReportDraft>(prompt, schema);
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
    languageInstruction(outputLanguage),
    `Student research question: ${researchQuestion}`,
    `References JSON: ${JSON.stringify(metadata)}`
  ].join("\n");

  const result = await generateStructured<{ items: Pick<ReferenceItem, "abstractOrMetadataSummary" | "whyUseful">[] }>(prompt, schema);
  return result?.items ?? null;
}
