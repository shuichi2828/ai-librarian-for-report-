"use client";

import {
  BookOpen,
  CheckCircle2,
  Clipboard,
  FileText,
  History,
  Languages,
  Library,
  ListChecks,
  Loader2,
  LogOut,
  MessageSquareText,
  PenLine,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { track } from "@vercel/analytics";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AssignmentDetails,
  ContentPoint,
  InterviewAnswer,
  MaterialQualityCheck,
  OutputLanguage,
  PersonalizationCheck,
  PersonalizationPoint,
  PdfInsightResult,
  ReferenceItem,
  ReferenceSearchResult,
  ReportDraft,
  ReportDraftOptions,
  ReportOutline,
  RevisedReportDraft,
  ThemeCandidate
} from "@/lib/types";

type ContentPointsResponse = {
  points: ContentPoint[];
  outputLanguage: "ja" | "en";
  usedFallback: boolean;
};

type PlansResponse = {
  candidates: ThemeCandidate[];
  outputLanguage: "ja" | "en";
  usedFallback: boolean;
};

type PdfResponse = PdfInsightResult & {
  textLength: number;
  extractionMode: "text" | "openai-ocr";
  usedFallback: boolean;
};

type MaterialQualityResponse = {
  check: MaterialQualityCheck;
  outputLanguage: "ja" | "en";
  usedFallback: boolean;
};

type OutlineResponse = {
  outline: ReportOutline;
  usedFallback: boolean;
};

type DraftResponse = {
  draft: ReportDraft;
  usedFallback: boolean;
};

type PersonalizationResponse = {
  check: PersonalizationCheck;
  usedFallback: boolean;
};

type RevisionResponse = {
  draft: RevisedReportDraft;
  usedFallback: boolean;
};

type HistoryEntry = {
  id: string;
  topic: string;
  plan: ThemeCandidate;
  answers: InterviewAnswer[];
  references: ReferenceItem[];
  outputLanguage: OutputLanguage;
  createdAt: string;
};

type GuestUser = {
  id: string;
  name: string;
};

const HISTORY_KEY = "ai-librarian-history-v3";
const USER_KEY = "ai-librarian-user-v1";
const REPORT_PREFERENCES = [
  { id: "personal", label: "自分の経験を入れたい", value: "個人の経験や意見を中心にする" },
  { id: "paper", label: "論文をしっかり引用したい", value: "論文引用を重視する" },
  { id: "facts", label: "客観的な事実を重視したい", value: "客観的事実を重視する" },
  { id: "course", label: "授業内容に寄せたい", value: "授業内容とのつながりを重視する" },
  { id: "comparison", label: "比較しながら書きたい", value: "比較を重視する" },
  { id: "policy", label: "改善策まで書きたい", value: "制度や実践への提案を重視する" },
  { id: "critical", label: "批判的に考察したい", value: "批判的考察を重視する" }
];

function languageLabel(language: OutputLanguage) {
  if (language === "ja") return "日本語";
  if (language === "en") return "英語";
  return "自動";
}

function copyText(reference: ReferenceItem) {
  const url = reference.doi ? `https://doi.org/${reference.doi}` : reference.url;
  return [`【引用】${reference.apa7}`, `【要約】${reference.abstractOrMetadataSummary}`, `【使いどころ】${reference.whyUseful}`, url ? `【リンク】${url}` : ""].filter(Boolean).join("\n");
}

function copyReferenceSummary(reference: ReferenceItem) {
  return [`${reference.title}`, `要約: ${reference.abstractOrMetadataSummary}`, `レポートでの使い方: ${reference.whyUseful}`, `引用: ${reference.apa7}`].join("\n");
}

function renderMathText(text: string) {
  const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
  return parts.map((part, index) => {
    const isMath = /^(\$\$[^$]+\$\$|\$[^$]+\$|\\\[|\\\()/.test(part);
    if (!isMath) return part;

    return (
      <code className="mathText" key={`${part}-${index}`}>
        {part.replace(/^\$\$|\$\$$|^\$|\$$|^\\\[|\\\]$|^\\\(|\\\)$/g, "")}
      </code>
    );
  });
}

function contentTypeLabel(type: ContentPoint["type"]) {
  return (
    {
      background: "背景",
      argument: "主張",
      case: "事例",
      theory: "理論",
      evidence: "根拠",
      counterargument: "反論",
      policy: "提案",
      pdf: "PDF",
      custom: "追加"
    } satisfies Record<ContentPoint["type"], string>
  )[type];
}

function sourceLabel(source: ContentPoint["source"]) {
  return (
    {
      ai: "AI提案",
      pdf: "PDF由来",
      user: "自分で追加"
    } satisfies Record<ContentPoint["source"], string>
  )[source];
}

type AnalyticsValue = string | number | boolean | null | undefined;

function sanitizeAnalyticsValue(value: AnalyticsValue) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value.slice(0, 255);
  return value;
}

function trackUsage(eventName: string, properties: Record<string, string | number | boolean | null | undefined> = {}) {
  const safeProperties = Object.fromEntries(
    Object.entries(properties)
      .map(([key, value]) => [key.slice(0, 255), sanitizeAnalyticsValue(value)] as const)
      .filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined)
  );

  try {
    track(eventName.slice(0, 255), safeProperties);
  } catch {
    // Analytics must never block the report workflow.
  }
}

export default function Home() {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loginName, setLoginName] = useState("");
  const [topic, setTopic] = useState("Generative AI and university education");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("ja");
  const [details, setDetails] = useState<AssignmentDetails>({
    assignmentPrompt: "",
    userOpinion: "",
    mustInclude: "",
    reportPreferences: [],
    materialNotes: ""
  });
  const [customPreference, setCustomPreference] = useState("");
  const [materialCheck, setMaterialCheck] = useState<MaterialQualityCheck | null>(null);
  const [materialQuestionAnswers, setMaterialQuestionAnswers] = useState<Record<string, string>>({});
  const [selectedMaterialSuggestionIds, setSelectedMaterialSuggestionIds] = useState<string[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [forcePdfOcr, setForcePdfOcr] = useState(false);
  const [pdfMode, setPdfMode] = useState<"text" | "openai-ocr" | "mixed">();
  const [pdfInsight, setPdfInsight] = useState<PdfInsightResult | null>(null);
  const [selectedPdfThemeIds, setSelectedPdfThemeIds] = useState<string[]>([]);
  const [contentPoints, setContentPoints] = useState<ContentPoint[]>([]);
  const [selectedContentPointIds, setSelectedContentPointIds] = useState<string[]>([]);
  const [customPoint, setCustomPoint] = useState("");
  const [plans, setPlans] = useState<ThemeCandidate[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [refinementInstruction, setRefinementInstruction] = useState("");
  const [combinePlanIds, setCombinePlanIds] = useState<string[]>([]);
  const [planRevisionCount, setPlanRevisionCount] = useState(0);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [reportOutline, setReportOutline] = useState<ReportOutline | null>(null);
  const [draftOptions, setDraftOptions] = useState<ReportDraftOptions>({
    targetWordCount: 1200,
    languageLevel: "middle",
    writingStyle: "standard",
    humanLike: true,
    otherConditions: ""
  });
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [personalizationCheck, setPersonalizationCheck] = useState<PersonalizationCheck | null>(null);
  const [selectedImprovementIds, setSelectedImprovementIds] = useState<string[]>([]);
  const [otherImprovement, setOtherImprovement] = useState("");
  const [revisedDraft, setRevisedDraft] = useState<RevisedReportDraft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [refinements, setRefinements] = useState<string[]>([]);
  const [totalReviewed, setTotalReviewed] = useState<number>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "material" | "points" | "pdf" | "plans" | "references" | "outline" | "draft" | "personalization" | "revision">("idle");
  const [error, setError] = useState<string>();
  const [copyNotice, setCopyNotice] = useState("");

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId), [plans, selectedPlanId]);
  const busy = status !== "idle";
  const userHistoryKey = user ? `${HISTORY_KEY}-${user.id}` : HISTORY_KEY;
  const selectedOutputLanguage: "ja" | "en" = outputLanguage === "en" ? "en" : "ja";
  const stepItems = [
    { label: "1. 材料", done: details.assignmentPrompt.trim().length > 0 || details.userOpinion.trim().length > 0 || selectedPdfThemes().length > 0 },
    { label: "2. 内容候補", done: selectedContentPointIds.length > 0 },
    { label: "3. プラン", done: Boolean(selectedPlan) },
    { label: "4. 参考文献", done: selectedReferenceIds.length > 0 },
    { label: "5. 下書き", done: Boolean(reportOutline || reportDraft) }
  ];

  useEffect(() => {
    const savedUser = window.localStorage.getItem(USER_KEY);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as GuestUser;
      setUser(parsedUser);
      setLoginName(parsedUser.name);
    }

  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const saved = window.localStorage.getItem(`${HISTORY_KEY}-${user.id}`);
    setHistory(saved ? (JSON.parse(saved) as HistoryEntry[]) : []);
  }, [user]);

  function persistHistory(nextHistory: HistoryEntry[]) {
    setHistory(nextHistory);
    window.localStorage.setItem(userHistoryKey, JSON.stringify(nextHistory));
  }

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = loginName.trim();
    if (!name) return;

    const nextUser = {
      id: name.toLowerCase().replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 80),
      name
    };
    setUser(nextUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    trackUsage("guest_login", { hasAtSign: name.includes("@") });
  }

  function logout() {
    setUser(null);
    setHistory([]);
    setContentPoints([]);
    setPlans([]);
    setCombinePlanIds([]);
    setRefinementInstruction("");
    setPlanRevisionCount(0);
    setReferences([]);
    setReportOutline(null);
    setReportDraft(null);
    setPersonalizationCheck(null);
    setSelectedImprovementIds([]);
    setOtherImprovement("");
    setRevisedDraft(null);
    setError(undefined);
    window.localStorage.removeItem(USER_KEY);
  }

  function clearRevisionFlow() {
    setPersonalizationCheck(null);
    setSelectedImprovementIds([]);
    setOtherImprovement("");
    setRevisedDraft(null);
  }

  function clearMaterialCheck() {
    setMaterialCheck(null);
    setMaterialQuestionAnswers({});
    setSelectedMaterialSuggestionIds([]);
  }

  function copyToClipboard(text: string, message: string) {
    navigator.clipboard.writeText(text);
    setCopyNotice(message);
    window.setTimeout(() => setCopyNotice(""), 1800);
  }

  function selectedPdfThemes() {
    return pdfInsight?.themes.filter((theme) => selectedPdfThemeIds.includes(theme.id)) ?? [];
  }

  function selectedContentPoints() {
    return contentPoints.filter((point) => selectedContentPointIds.includes(point.id));
  }

  function hasSelectedDraftMaterial(selectedReferences: ReferenceItem[]) {
    return selectedReferences.length > 0 || selectedPdfThemes().length > 0 || selectedContentPoints().length > 0;
  }

  function currentAnswers(): InterviewAnswer[] {
    const answers: InterviewAnswer[] = [
      { questionId: "assignment-prompt", question: "課題文", answer: details.assignmentPrompt },
      { questionId: "user-opinion", question: "自分の意見", answer: details.userOpinion },
      { questionId: "must-include", question: "必ず入れたい内容", answer: details.mustInclude },
      { questionId: "report-preferences", question: "レポートの好み", answer: details.reportPreferences.join(", ") },
      { questionId: "material-notes", question: "材料チェックで追加した内容", answer: details.materialNotes }
    ].filter((item) => item.answer.trim().length > 0);

    if (selectedPdfThemes().length > 0) {
      answers.push({
        questionId: "selected-pdf-themes",
        question: "選択したPDFテーマ",
        answer: selectedPdfThemes().map((theme) => `${theme.title}: ${theme.summary}`).join(" / ")
      });
    }

    if (selectedContentPoints().length > 0) {
      answers.push({
        questionId: "selected-content-points",
        question: "選択した内容候補",
        answer: selectedContentPoints().map((point) => `${point.title}: ${point.description}`).join(" / ")
      });
    }

    return answers;
  }

  async function suggestContentPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!topic.trim()) return;

    setStatus("points");
    setError(undefined);
    setContentPoints([]);
    setSelectedContentPointIds([]);
    setPlans([]);
    setReferences([]);
    setSelectedReferenceIds([]);
    setReportOutline(null);
    setReportDraft(null);
    clearRevisionFlow();
    setWarnings([]);

    try {
      const response = await fetch("/api/content-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, outputLanguage: selectedOutputLanguage, details, pdfThemes: selectedPdfThemes() })
      });

      if (!response.ok) throw new Error("points");

      const result = (await response.json()) as ContentPointsResponse;
      setContentPoints(result.points);
      setSelectedContentPointIds(result.points.slice(0, 5).map((point) => point.id));
      setCombinePlanIds([]);
      setRefinementInstruction("");
      setPlanRevisionCount(0);
      trackUsage("content_points_created", {
        outputLanguage,
        topicLength: topic.length,
        hasAssignmentPrompt: details.assignmentPrompt.trim().length > 0,
        hasUserOpinion: details.userOpinion.trim().length > 0,
        hasMustInclude: details.mustInclude.trim().length > 0,
        preferenceCount: details.reportPreferences.length,
        hasMaterialNotes: details.materialNotes.trim().length > 0,
        selectedPdfThemes: selectedPdfThemes().length,
        pointCount: result.points.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("内容候補を作成できませんでした。少し時間を置いてもう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function checkMaterialQuality() {
    if (!topic.trim()) {
      setError("先にレポートのテーマを入力してください。");
      return;
    }

    setStatus("material");
    setError(undefined);

    try {
      const response = await fetch("/api/material-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          outputLanguage: selectedOutputLanguage,
          details,
          pdfThemes: selectedPdfThemes()
        })
      });

      if (!response.ok) throw new Error("material");

      const result = (await response.json()) as MaterialQualityResponse;
      setMaterialCheck(result.check);
      setSelectedMaterialSuggestionIds(result.check.suggestions.slice(0, 3).map((suggestion) => suggestion.id));
      trackUsage("material_quality_checked", {
        outputLanguage,
        score: result.check.score,
        weaknessCount: result.check.weaknesses.length,
        questionCount: result.check.questions.length,
        suggestionCount: result.check.suggestions.length,
        preferenceCount: details.reportPreferences.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("材料チェックを実行できませんでした。入力内容を少し足してからもう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function getPlans(mode: "initial" | "refine" | "mix" = "initial", forcedInstruction?: string) {
    if (selectedContentPoints().length === 0) {
      setError("先に内容候補を1つ以上選んでください。");
      return;
    }

    if (mode === "mix" && combinePlanIds.length < 2) {
      setError("組み合わせるプランを2つ以上選んでください。");
      return;
    }

    const previousPlans = plans;
    const instruction =
      mode === "initial"
        ? ""
        : forcedInstruction?.trim() ||
          refinementInstruction.trim() ||
          (mode === "mix" ? "選んだプランの良い部分を組み合わせて、より使いやすいプランにしてください。" : "違う切り口で、より柔軟に選べるレポートプランを作ってください。");

    setStatus("plans");
    setError(undefined);
    setPlans([]);
    setSelectedPlanId(undefined);
    setReferences([]);
    setSelectedReferenceIds([]);
    setReportOutline(null);
    setReportDraft(null);
    clearRevisionFlow();
    setWarnings([]);

    try {
      const response = await fetch("/api/theme-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          outputLanguage: selectedOutputLanguage,
          answers: currentAnswers(),
          pdfThemes: selectedPdfThemes(),
          contentPoints: selectedContentPoints(),
          previousCandidates: mode === "initial" ? [] : previousPlans,
          combineCandidateIds: mode === "mix" ? combinePlanIds : [],
          refinementInstruction: instruction
        })
      });

      if (!response.ok) throw new Error("plans");

      const result = (await response.json()) as PlansResponse;
      setPlans(result.candidates);
      setSelectedPlanId(result.candidates[0]?.id);
      setCombinePlanIds([]);
      if (mode !== "initial") {
        setPlanRevisionCount((current) => current + 1);
      }
      trackUsage("report_plans_created", {
        outputLanguage,
        contentPointCount: selectedContentPoints().length,
        pdfThemeCount: selectedPdfThemes().length,
        planCount: result.candidates.length,
        mode,
        previousPlanCount: previousPlans.length,
        combinePlanCount: mode === "mix" ? combinePlanIds.length : 0,
        hasRefinementInstruction: instruction.length > 0,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("レポートプランを作成できませんでした。内容候補を減らすか、もう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function getReferences(plan: ThemeCandidate) {
    setStatus("references");
    setError(undefined);
    setSelectedPlanId(plan.id);
    setReferences([]);
    setSelectedReferenceIds([]);
    setReportOutline(null);
    setReportDraft(null);
    clearRevisionFlow();
    setWarnings([]);
    setAlternatives([]);
    setRefinements([]);
    setTotalReviewed(undefined);

    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate: plan, outputLanguage: selectedOutputLanguage, citationStyle: "apa7" })
      });

      if (!response.ok) throw new Error("references");

      const result = (await response.json()) as ReferenceSearchResult;
      setReferences(result.references);
      setSelectedReferenceIds(result.references.slice(0, 4).map((reference) => reference.id));
      setReportDraft(null);
      clearRevisionFlow();
      setWarnings(result.warnings);
      setAlternatives(result.alternativeKeywords);
      setRefinements(result.refinementSuggestions);
      setTotalReviewed(result.totalCandidatesReviewed);
      trackUsage("papers_found", {
        outputLanguage,
        referenceCount: result.references.length,
        selectedReferenceCount: Math.min(4, result.references.length),
        warningCount: result.warnings.length,
        totalReviewed: result.totalCandidatesReviewed
      });

      if (result.references.length > 0) {
        const entry: HistoryEntry = {
          id: `${Date.now()}-${plan.id}`,
          topic,
          plan,
          answers: currentAnswers(),
          references: result.references,
          outputLanguage,
          createdAt: new Date().toISOString()
        };
        persistHistory([entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 12));
      }
    } catch {
      setError("参考文献を取得できませんでした。プランを少し変えてもう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function readPdf(avoidThemes: string[] = []) {
    if (pdfFiles.length === 0) {
      setError("先にPDFを選んでください。PDFは3つまで読み込めます。");
      return;
    }

    setStatus("pdf");
    setError(undefined);

    try {
      const results: PdfResponse[] = [];

      for (const [index, file] of pdfFiles.entries()) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("outputLanguage", selectedOutputLanguage);
        formData.append("avoidThemes", JSON.stringify(avoidThemes));
        formData.append("forceOcr", String(forcePdfOcr));

        const response = await fetch("/api/pdf-insights", {
          method: "POST",
          body: formData
        });

        if (!response.ok) throw new Error("pdf");

        const result = (await response.json()) as PdfResponse;
        results.push({
          ...result,
          documentTitle: result.documentTitle || file.name,
          themes: result.themes.map((theme) => ({
            ...theme,
            id: `pdf-${index + 1}-${theme.id}`,
            title: pdfFiles.length > 1 ? `PDF${index + 1}: ${theme.title}` : theme.title,
            evidence: `${file.name}: ${theme.evidence}`
          }))
        });
      }

      const combined: PdfInsightResult = {
        documentTitle: pdfFiles.length === 1 ? results[0].documentTitle : selectedOutputLanguage === "ja" ? `${pdfFiles.length}件のPDFから抽出した材料` : `Material extracted from ${pdfFiles.length} PDFs`,
        summary: results.map((result, index) => (selectedOutputLanguage === "ja" ? `PDF${index + 1}（${pdfFiles[index].name}）: ${result.summary}` : `PDF ${index + 1} (${pdfFiles[index].name}): ${result.summary}`)).join("\n"),
        themes: results.flatMap((result) => result.themes).slice(0, 12)
      };

      const modes = new Set(results.map((result) => result.extractionMode));
      setPdfInsight(combined);
      setPdfMode(modes.size === 1 ? results[0].extractionMode : "mixed");
      setSelectedPdfThemeIds(combined.themes.slice(0, Math.min(4, combined.themes.length)).map((theme) => theme.id));
      trackUsage("pdf_read", {
        outputLanguage: selectedOutputLanguage,
        fileCount: pdfFiles.length,
        forceOcr: forcePdfOcr,
        extractionMode: modes.size === 1 ? results[0].extractionMode : "mixed",
        textLength: results.reduce((total, result) => total + result.textLength, 0),
        themeCount: combined.themes.length,
        usedFallback: results.some((result) => result.usedFallback)
      });
    } catch {
      setError("PDFを読み込めませんでした。PDFを3件以内にする、容量を小さくする、またはOCRモードを試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function createOutline() {
    if (!selectedPlan) {
      setError("先にレポートプランを選んでください。");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (!hasSelectedDraftMaterial(selectedReferences)) {
      setError("論文・PDFテーマ・内容候補のいずれかを1つ以上選んでください。");
      return;
    }

    setStatus("outline");
    setError(undefined);

    try {
      const response = await fetch("/api/report-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          references: selectedReferences,
          pdfThemes: selectedPdfThemes(),
          contentPoints: selectedContentPoints(),
          outputLanguage: selectedOutputLanguage
        })
      });

      if (!response.ok) throw new Error("outline");

      const result = (await response.json()) as OutlineResponse;
      setReportOutline(result.outline);
      setReportDraft(null);
      clearRevisionFlow();
      trackUsage("outline_created", {
        outputLanguage,
        selectedReferenceCount: selectedReferences.length,
        pdfOnly: selectedReferences.length === 0 && selectedPdfThemes().length > 0,
        contentPointCount: selectedContentPoints().length,
        pdfThemeCount: selectedPdfThemes().length,
        sectionCount: result.outline.sections.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("構成案を作成できませんでした。材料を少し減らしてもう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function createDraft() {
    if (!selectedPlan) {
      setError("先にレポートプランを選んでください。");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (!hasSelectedDraftMaterial(selectedReferences)) {
      setError("論文・PDFテーマ・内容候補のいずれかを1つ以上選んでください。");
      return;
    }

    setStatus("draft");
    setError(undefined);

    try {
      const response = await fetch("/api/report-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          references: selectedReferences,
          pdfThemes: selectedPdfThemes(),
          contentPoints: selectedContentPoints(),
          outline: reportOutline,
          options: draftOptions,
          outputLanguage: selectedOutputLanguage
        })
      });

      if (!response.ok) throw new Error("draft");

      const result = (await response.json()) as DraftResponse;
      setReportDraft(result.draft);
      clearRevisionFlow();
      trackUsage("draft_created", {
        outputLanguage,
        selectedReferenceCount: selectedReferences.length,
        pdfOnly: selectedReferences.length === 0 && selectedPdfThemes().length > 0,
        targetWordCount: draftOptions.targetWordCount,
        languageLevel: draftOptions.languageLevel,
        writingStyle: draftOptions.writingStyle,
        humanLike: draftOptions.humanLike,
        hasOtherConditions: draftOptions.otherConditions.trim().length > 0,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("下書きを作成できませんでした。材料を少し減らしてもう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function checkPersonalization() {
    if (!selectedPlan || !reportDraft) {
      setError("先に下書きを作成してください。");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (!hasSelectedDraftMaterial(selectedReferences)) {
      setError("論文・PDFテーマ・内容候補のいずれかを1つ以上選んでください。");
      return;
    }

    setStatus("personalization");
    setError(undefined);
    setRevisedDraft(null);

    try {
      const response = await fetch("/api/personalization-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: reportDraft,
          plan: selectedPlan,
          references: selectedReferences,
          contentPoints: selectedContentPoints(),
          outputLanguage: selectedOutputLanguage
        })
      });

      if (!response.ok) throw new Error("personalization");

      const result = (await response.json()) as PersonalizationResponse;
      setPersonalizationCheck(result.check);
      setSelectedImprovementIds(result.check.points.filter((point) => point.priority === "high").map((point) => point.id));
      trackUsage("personalization_checked", {
        outputLanguage,
        improvementCount: result.check.points.length,
        highPriorityCount: result.check.points.filter((point) => point.priority === "high").length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("改善ポイントを確認できませんでした。もう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  async function createRevision() {
    if (!selectedPlan || !reportDraft || !personalizationCheck) {
      setError("先に改善ポイントを確認してください。");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    const selectedImprovements = personalizationCheck.points.filter((point) => selectedImprovementIds.includes(point.id));
    const customImprovements = otherImprovement
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const improvementsForRequest: PersonalizationPoint[] =
      selectedImprovements.length > 0
        ? selectedImprovements
        : customImprovements.length > 0
          ? [
              {
                id: "other-improvement",
                title: "Other",
                issue: "The student provided a custom revision request.",
                suggestion: customImprovements.join(" / "),
                category: "other",
                priority: "medium"
              }
            ]
          : [];

    if (improvementsForRequest.length === 0) {
      setError("改善ポイントを1つ以上選ぶか、その他の直したい点を書いてください。");
      return;
    }

    setStatus("revision");
    setError(undefined);

    try {
      const response = await fetch("/api/report-revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: reportDraft,
          plan: selectedPlan,
          references: selectedReferences,
          contentPoints: selectedContentPoints(),
          selectedImprovements: improvementsForRequest,
          customImprovements,
          options: draftOptions,
          outputLanguage: selectedOutputLanguage
        })
      });

      if (!response.ok) throw new Error("revision");

      const result = (await response.json()) as RevisionResponse;
      setRevisedDraft(result.draft);
      trackUsage("revision_created", {
        outputLanguage,
        selectedImprovementCount: improvementsForRequest.length,
        hasOtherImprovement: customImprovements.length > 0,
        selectedReferenceCount: selectedReferences.length,
        writingStyle: draftOptions.writingStyle,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("改訂版を作成できませんでした。もう一度試してください。");
    } finally {
      setStatus("idle");
    }
  }

  function loadHistory(entry: HistoryEntry) {
    setTopic(entry.topic);
    setOutputLanguage(entry.outputLanguage === "auto" ? "ja" : entry.outputLanguage);
    setPlans([entry.plan]);
    setSelectedPlanId(entry.plan.id);
    setCombinePlanIds([]);
    setRefinementInstruction("");
    setReferences(entry.references);
    setWarnings([]);
    setAlternatives([]);
    setRefinements([]);
    setReportDraft(null);
    clearRevisionFlow();
    setError(undefined);
  }

  function togglePdfTheme(themeId: string) {
    setSelectedPdfThemeIds((current) => (current.includes(themeId) ? current.filter((id) => id !== themeId) : [...current, themeId]));
  }

  function toggleContentPoint(pointId: string) {
    setSelectedContentPointIds((current) => (current.includes(pointId) ? current.filter((id) => id !== pointId) : [...current, pointId]));
  }

  function toggleReportPreference(preference: string) {
    setDetails((current) => ({
      ...current,
      reportPreferences: current.reportPreferences.includes(preference) ? current.reportPreferences.filter((item) => item !== preference) : [...current.reportPreferences, preference]
    }));
    clearMaterialCheck();
  }

  function toggleMaterialSuggestion(suggestionId: string) {
    setSelectedMaterialSuggestionIds((current) => (current.includes(suggestionId) ? current.filter((id) => id !== suggestionId) : [...current, suggestionId]));
  }

  function updateMaterialAnswer(questionId: string, answer: string) {
    setMaterialQuestionAnswers((current) => ({
      ...current,
      [questionId]: answer
    }));
  }

  function addCustomPreference() {
    const preference = customPreference.trim();
    if (!preference) return;

    setDetails((current) => ({
      ...current,
      reportPreferences: current.reportPreferences.includes(preference) ? current.reportPreferences : [...current.reportPreferences, preference]
    }));
    setCustomPreference("");
    clearMaterialCheck();
  }

  function applyMaterialEnhancements() {
    if (!materialCheck) return;

    const selectedSuggestions = materialCheck.suggestions.filter((suggestion) => selectedMaterialSuggestionIds.includes(suggestion.id));
    const answerLines = materialCheck.questions
      .map((question) => {
        const answer = materialQuestionAnswers[question.id]?.trim();
        return answer ? `${question.label}: ${answer}` : "";
      })
      .filter(Boolean);

    const suggestionPoints = selectedSuggestions.map<ContentPoint>((suggestion) => ({
      id: `material-${suggestion.id}-${Date.now()}`,
      title: suggestion.title,
      description: suggestion.description,
      type: "custom",
      keywordsJa: suggestion.keywordsJa,
      keywordsEn: suggestion.keywordsEn,
      source: "ai"
    }));

    const answerPoints = answerLines.map<ContentPoint>((line, index) => ({
      id: `material-answer-${Date.now()}-${index}`,
      title: `追加した材料 ${index + 1}`,
      description: line,
      type: "custom",
      keywordsJa: [topic, line],
      keywordsEn: [topic, line],
      source: "user"
    }));

    const newPoints = [...suggestionPoints, ...answerPoints];
    if (newPoints.length > 0) {
      setContentPoints((current) => [...current, ...newPoints]);
      setSelectedContentPointIds((current) => [...current, ...newPoints.map((point) => point.id)]);
    }

    if (answerLines.length > 0 || selectedSuggestions.length > 0) {
      const notes = [...answerLines, ...selectedSuggestions.map((suggestion) => `${suggestion.title}: ${suggestion.description}`)].join("\n");
      setDetails((current) => ({
        ...current,
        materialNotes: [current.materialNotes, notes].filter(Boolean).join("\n")
      }));
    }

    trackUsage("material_enhancements_added", {
      selectedSuggestionCount: selectedSuggestions.length,
      answeredQuestionCount: answerLines.length,
      preferenceCount: details.reportPreferences.length
    });
  }

  function toggleReference(referenceId: string) {
    setSelectedReferenceIds((current) => (current.includes(referenceId) ? current.filter((id) => id !== referenceId) : [...current, referenceId]));
    setReportDraft(null);
    clearRevisionFlow();
  }

  function toggleCombinePlan(planId: string) {
    setCombinePlanIds((current) => (current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId]));
  }

  function toggleImprovement(improvementId: string) {
    setSelectedImprovementIds((current) => (current.includes(improvementId) ? current.filter((id) => id !== improvementId) : [...current, improvementId]));
    setRevisedDraft(null);
  }

  function addCustomContentPoint() {
    const title = customPoint.trim();
    if (!title) return;

    const point: ContentPoint = {
      id: `custom-${Date.now()}`,
      title,
      description: "自分で追加した、レポートに入れたい内容です。",
      type: "custom",
      keywordsJa: [topic, title],
      keywordsEn: [topic, title],
      source: "user"
    };

    setContentPoints((current) => [...current, point]);
    setSelectedContentPointIds((current) => [...current, point.id]);
    setCustomPoint("");
  }

  if (!user) {
    return (
      <main className="loginShell">
        <section className="loginPanel">
          <div className="brandMark">
            <Library size={22} />
          </div>
          <p className="eyebrow">AI Librarian</p>
          <h1>レポート作成AI</h1>
          <p className="loginText">名前またはメールアドレスを入力して始めます。このログインは、この端末の保存履歴を分けるためだけに使います。</p>
          <form className="loginForm" onSubmit={login}>
            <label htmlFor="loginName">名前またはメールアドレス</label>
            <input id="loginName" value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="student@example.com" autoComplete="email" />
            <button className="primaryButton" type="submit">
              <UserRound size={18} />
              始める
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="historyPane" aria-label="履歴">
        <div className="paneHeader">
          <div className="brandMark">
            <Library size={20} />
          </div>
          <div>
            <p className="eyebrow">AI Librarian</p>
            <h1>レポート作成AI</h1>
          </div>
        </div>

        <div className="userBox">
          <UserRound size={17} />
          <span>{user.name}</span>
          <button className="iconButton subtle" type="button" onClick={logout} aria-label="ログアウト" title="ログアウト">
            <LogOut size={16} />
          </button>
        </div>

        <div className="historyTitle">
          <History size={17} />
          <span>履歴</span>
          {history.length > 0 && (
            <button className="iconButton subtle" type="button" onClick={() => persistHistory([])} aria-label="履歴を削除" title="履歴を削除">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="historyList">
          {history.length === 0 ? (
            <p className="emptyText">保存したレポートプランがここに表示されます。</p>
          ) : (
            history.map((entry) => (
              <button className="historyItem" type="button" key={entry.id} onClick={() => loadHistory(entry)}>
                <span>{entry.topic}</span>
                <small>
                  {new Date(entry.createdAt).toLocaleDateString()} / {languageLabel(entry.outputLanguage)}
                </small>
                <X
                  size={15}
                  aria-label="履歴を削除"
                  onClick={(event) => {
                    event.stopPropagation();
                    persistHistory(history.filter((item) => item.id !== entry.id));
                  }}
                />
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="workspace">
        <form className="searchBand" onSubmit={suggestContentPoints}>
          <div className="topicField">
            <label htmlFor="topic">レポートのテーマ</label>
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例: 生成AIと大学教育" />
          </div>
          <div className="languageControl" aria-label="出力言語">
            <Languages size={18} />
            {(["ja", "en"] as const).map((language) => (
              <button className={selectedOutputLanguage === language ? "segmented active" : "segmented"} key={language} onClick={() => setOutputLanguage(language)} type="button">
                {languageLabel(language)}
              </button>
            ))}
          </div>
          <button className="primaryButton" type="submit" disabled={busy}>
            {status === "points" ? <Loader2 size={18} className="spin" /> : <MessageSquareText size={18} />}
            内容候補を作る
          </button>
        </form>

        <nav className="stepRail" aria-label="作成ステップ">
          {stepItems.map((step) => (
            <span className={step.done ? "stepPill done" : "stepPill"} key={step.label}>
              {step.done && <CheckCircle2 size={15} />}
              {step.label}
            </span>
          ))}
        </nav>

        {error && <div className="notice error">{error}</div>}

        <section className="detailsPane" aria-label="Assignment details">
          <div className="sectionHeader">
            <MessageSquareText size={18} />
            <h2>1. 材料を入れる</h2>
          </div>
          <div className="detailsGrid">
            <label className="questionCard">
              <span>課題文</span>
              <small>先生の指示やレポート課題をそのまま貼り付けます。</small>
              <textarea value={details.assignmentPrompt} onChange={(event) => setDetails({ ...details, assignmentPrompt: event.target.value })} placeholder="課題文を貼り付け" rows={4} />
            </label>
            <label className="questionCard">
              <span>自分の意見・仮の主張</span>
              <small>まだ曖昧でも大丈夫です。考えたい方向を書きます。</small>
              <textarea
                value={details.userOpinion}
                onChange={(event) => setDetails({ ...details, userOpinion: event.target.value })}
                placeholder="例: 大学はAIを禁止するより、責任ある使い方を教えるべき"
                rows={4}
              />
            </label>
            <label className="questionCard">
              <span>必ず入れたい内容</span>
              <small>授業キーワード、事例、使いたい概念などを書きます。</small>
              <textarea value={details.mustInclude} onChange={(event) => setDetails({ ...details, mustInclude: event.target.value })} placeholder="AIリテラシー、剽窃、大学のガイドライン" rows={4} />
            </label>
          </div>
          <div className="preferenceBox">
            <span>レポートの好み</span>
            <div className="preferenceGrid">
              {REPORT_PREFERENCES.map((preference) => (
                <label className={details.reportPreferences.includes(preference.value) ? "preferenceChip selected" : "preferenceChip"} key={preference.id}>
                  <input type="checkbox" checked={details.reportPreferences.includes(preference.value)} onChange={() => toggleReportPreference(preference.value)} />
                  {preference.label}
                </label>
              ))}
            </div>
            <div className="customPreferenceRow">
              <input value={customPreference} onChange={(event) => setCustomPreference(event.target.value)} placeholder="自分の好みを追加（例: 地元の事例を入れたい）" />
              <button className="secondaryButton compact" type="button" onClick={addCustomPreference}>
                追加
              </button>
            </div>
          </div>
          <div className="materialCheckBox">
            <div>
              <strong>材料チェック</strong>
              <p>プランを作る前に、テーマ・意見・材料が十分に具体的か確認します。</p>
            </div>
            <button className="secondaryButton compact" type="button" onClick={checkMaterialQuality} disabled={busy}>
              {status === "material" ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
              チェックする
            </button>
          </div>
          {materialCheck && (
            <div className="materialResult">
              <div className="materialScore">
                <b>{materialCheck.score}%</b>
                <span>{materialCheck.verdict}</span>
              </div>
              <div className="materialColumns">
                <section>
                  <h3>もう少し具体化したい点</h3>
                  {materialCheck.weaknesses.map((weakness) => (
                    <p key={weakness}>{weakness}</p>
                  ))}
                  {materialCheck.recommendedPreferences.length > 0 && <small>おすすめの方向性: {materialCheck.recommendedPreferences.join(", ")}</small>}
                </section>
                <section>
                  <h3>すぐ答えられる質問</h3>
                  <div className="materialQuestionList">
                    {materialCheck.questions.map((question) => (
                      <label className="materialQuestion" key={question.id}>
                        <span>{question.label}</span>
                        <small>{question.helpText}</small>
                        {question.type === "choice" ? (
                          <select value={materialQuestionAnswers[question.id] ?? ""} onChange={(event) => updateMaterialAnswer(question.id, event.target.value)}>
                            <option value="">選択してください</option>
                            {question.options.map((option) => (
                              <option value={option} key={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <textarea value={materialQuestionAnswers[question.id] ?? ""} onChange={(event) => updateMaterialAnswer(question.id, event.target.value)} rows={2} />
                        )}
                      </label>
                    ))}
                  </div>
                </section>
              </div>
              <div className="materialSuggestionArea">
                <h3>追加できる材料</h3>
                <div className="themeGrid">
                  {materialCheck.suggestions.map((suggestion) => (
                    <label className={selectedMaterialSuggestionIds.includes(suggestion.id) ? "selectCard selected" : "selectCard"} key={suggestion.id}>
                      <input type="checkbox" checked={selectedMaterialSuggestionIds.includes(suggestion.id)} onChange={() => toggleMaterialSuggestion(suggestion.id)} />
                      <span>{suggestion.title}</span>
                      <small>{suggestion.description}</small>
                      <em>{suggestion.preferenceFit}</em>
                    </label>
                  ))}
                </div>
                <button className="secondaryButton" type="button" onClick={applyMaterialEnhancements}>
                  選んだ材料を追加
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="pdfPane" aria-label="PDF読み込み">
          <div className="sectionHeader">
            <FileText size={18} />
            <h2>PDFを読み込む（任意・3件まで）</h2>
          </div>
          <div className="pdfControls">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? []);
                if (selectedFiles.length > 3) {
                  setError("PDFは3件まで選択できます。");
                  setPdfFiles(selectedFiles.slice(0, 3));
                } else {
                  setError(undefined);
                  setPdfFiles(selectedFiles);
                }
                setPdfInsight(null);
                setPdfMode(undefined);
                setSelectedPdfThemeIds([]);
              }}
            />
            <label className="inlineToggle">
              <input type="checkbox" checked={forcePdfOcr} onChange={(event) => setForcePdfOcr(event.target.checked)} />
              スキャンPDFはOCRで読む
            </label>
            <button className="secondaryButton compact" type="button" onClick={() => readPdf()} disabled={busy || pdfFiles.length === 0}>
              {status === "pdf" ? <Loader2 size={17} className="spin" /> : <FileText size={17} />}
              PDFを読む
            </button>
            {pdfInsight && (
              <button className="secondaryButton compact" type="button" onClick={() => readPdf(pdfInsight.themes.map((theme) => theme.title))} disabled={busy}>
                <RefreshCcw size={17} />
                別の観点で再抽出
              </button>
            )}
          </div>
          {pdfFiles.length > 0 && (
            <div className="fileList">
              {pdfFiles.map((file) => (
                <span key={`${file.name}-${file.size}`}>{file.name}</span>
              ))}
            </div>
          )}
          {pdfInsight && (
            <div className="pdfResult">
              <h3>{pdfInsight.documentTitle}</h3>
              {pdfMode && <small className="modeBadge">読み取り: {pdfMode === "mixed" ? "複数方式" : pdfMode === "openai-ocr" ? "OpenAI OCR" : "PDF内テキスト"}</small>}
              <p>{renderMathText(pdfInsight.summary)}</p>
              <div className="themeGrid">
                {pdfInsight.themes.map((theme) => (
                  <label className={selectedPdfThemeIds.includes(theme.id) ? "selectCard selected" : "selectCard"} key={theme.id}>
                    <input type="checkbox" checked={selectedPdfThemeIds.includes(theme.id)} onChange={() => togglePdfTheme(theme.id)} />
                    <span>{theme.title}</span>
                    <small>{renderMathText(theme.summary)}</small>
                    <em>{theme.keywords.join(", ")}</em>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="workflowGrid">
          <section aria-label="内容候補">
            <div className="sectionHeader">
              <MessageSquareText size={18} />
              <h2>2. 内容候補を選ぶ</h2>
            </div>
            <div className="questionList">
              {contentPoints.length === 0 ? (
                <div className="placeholderBlock">テーマと材料を入れて「内容候補を作る」を押すと、レポートに入れる候補が表示されます。</div>
              ) : (
                contentPoints.map((point) => (
                  <label className={selectedContentPointIds.includes(point.id) ? "selectCard selected" : "selectCard"} key={point.id}>
                    <input type="checkbox" checked={selectedContentPointIds.includes(point.id)} onChange={() => toggleContentPoint(point.id)} />
                    <span>{point.title}</span>
                    <small>{renderMathText(point.description)}</small>
                    <em>
                      {contentTypeLabel(point.type)} / {sourceLabel(point.source)}
                    </em>
                  </label>
                ))
              )}
            </div>
            <div className="customPointRow">
              <input value={customPoint} onChange={(event) => setCustomPoint(event.target.value)} placeholder="自分で内容候補を追加" />
              <button className="secondaryButton compact" type="button" onClick={addCustomContentPoint}>
                追加
              </button>
            </div>
            {contentPoints.length > 0 && (
              <button className="secondaryButton" type="button" onClick={() => getPlans("initial")} disabled={busy}>
                {status === "plans" ? <Loader2 size={18} className="spin" /> : <BookOpen size={18} />}
                プランを作る
              </button>
            )}
          </section>

          <section aria-label="レポートプラン">
            <div className="sectionHeader">
              <BookOpen size={18} />
              <h2>3. プランを選ぶ・編集する</h2>
              {planRevisionCount > 0 && <span className="selectedChip">編集 {planRevisionCount}回</span>}
            </div>
            {plans.length > 0 && (
              <div className="planRefineBox">
                <label>
                  <span>プランをもっと自分向けに変える</span>
                  <textarea
                    value={refinementInstruction}
                    onChange={(event) => setRefinementInstruction(event.target.value)}
                    placeholder="例: プラン1は良いが、もっと授業内容に寄せたい。プラン2の比較視点も混ぜたい。"
                    rows={3}
                  />
                </label>
                <div className="quickEditRow">
                  {[
                    ["批判的にする", "各プランに反対意見や限界を入れて、批判的考察がしやすい形にしてください。"],
                    ["授業寄りにする", "課題文や授業内容との接続がはっきり見えるプランにしてください。"],
                    ["比較型にする", "比較軸を明確にして、賛否や事例を比べやすいプランにしてください。"],
                    ["簡単にする", "大学生が書きやすいように、範囲を狭めてシンプルなプランにしてください。"]
                  ].map(([label, instruction]) => (
                    <button className="secondaryButton compact" type="button" onClick={() => getPlans("refine", instruction)} disabled={busy} key={label}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="planRefineActions">
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("refine")} disabled={busy}>
                    {status === "plans" ? <Loader2 size={17} className="spin" /> : <RefreshCcw size={17} />}
                    編集内容で作り直す
                  </button>
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("mix")} disabled={busy || combinePlanIds.length < 2}>
                    <BookOpen size={17} />
                    選んだプランを混ぜる
                  </button>
                  <span>混ぜるプラン: {combinePlanIds.length}件</span>
                </div>
              </div>
            )}
            <div className="angleList">
              {plans.length === 0 ? (
                <div className="placeholderBlock">内容候補を選ぶと、ここにレポートプランが表示されます。</div>
              ) : (
                plans.map((plan) => (
                  <article className={plan.id === selectedPlanId ? "angleCard selected" : "angleCard"} key={plan.id}>
                    <label className="mixSelect">
                      <input type="checkbox" checked={combinePlanIds.includes(plan.id)} onChange={() => toggleCombinePlan(plan.id)} />
                      混ぜる
                    </label>
                    <span>{plan.title}</span>
                    <p>{renderMathText(plan.researchQuestion)}</p>
                    <small>{renderMathText(plan.reason)}</small>
                    <div className="outline">
                      {plan.outline.map((item) => (
                        <b key={item}>{item}</b>
                      ))}
                    </div>
                    <p className="whyUseful">{renderMathText(plan.thesisHint)}</p>
                    <button className="secondaryButton compact" type="button" onClick={() => getReferences(plan)} disabled={status === "references"}>
                      {status === "references" && selectedPlanId === plan.id ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
                      参考文献を探す
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="referencesPane" aria-label="参考文献">
          <div className="sectionHeader">
            <Library size={18} />
            <h2>4. 参考文献を選ぶ</h2>
            {selectedPlan && <span className="selectedChip">{selectedPlan.title}</span>}
          </div>
          {copyNotice && <div className="copyNotice">{copyNotice}</div>}

          {status === "references" && (
            <div className="loadingBlock">
              <Loader2 size={24} className="spin" />
              <span>学術データベースから候補を探しています...</span>
            </div>
          )}

          {(warnings.length > 0 || totalReviewed !== undefined) && (
            <div className="notice">
              {totalReviewed !== undefined && <p>確認した候補数: {totalReviewed}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {alternatives.length > 0 && <p>検索キーワード: {alternatives.join(", ")}</p>}
              {refinements.length > 0 && <p>{refinements.join(" / ")}</p>}
            </div>
          )}
          {references.length > 0 && (
            <div className="referenceActions">
              <button
                className="secondaryButton compact"
                type="button"
                onClick={() =>
                  copyToClipboard(
                    references
                      .filter((reference) => selectedReferenceIds.includes(reference.id))
                      .map((reference) => reference.apa7)
                      .join("\n\n"),
                    "選択中の引用をコピーしました"
                  )
                }
                disabled={selectedReferenceIds.length === 0}
              >
                <Clipboard size={16} />
                選択中の引用をまとめてコピー
              </button>
              <button
                className="secondaryButton compact"
                type="button"
                onClick={() =>
                  copyToClipboard(
                    references
                      .filter((reference) => selectedReferenceIds.includes(reference.id))
                      .map(copyReferenceSummary)
                      .join("\n\n---\n\n"),
                    "選択中の要約をコピーしました"
                  )
                }
                disabled={selectedReferenceIds.length === 0}
              >
                <Clipboard size={16} />
                要約と使いどころをコピー
              </button>
            </div>
          )}

          <div className="referenceList">
            {references.length === 0 && status !== "references" ? (
              <div className="placeholderBlock">プランを選んで「参考文献を探す」を押すと、確認済みメタデータの論文候補が表示されます。</div>
            ) : (
              references.map((reference) => (
                <article className="referenceCard" key={reference.id}>
                  <div className="referenceTopline">
                    <span>{reference.sourceProvider}</span>
                    <span>関連度 {reference.relevanceScore}%</span>
                  </div>
                  <div className="referenceMeta">
                    <span>{reference.year ?? "n.d."}</span>
                    <span>{reference.relevanceReason}</span>
                  </div>
                  <h3>{reference.title}</h3>
                  <label className="paperSelect">
                    <input type="checkbox" checked={selectedReferenceIds.includes(reference.id)} onChange={() => toggleReference(reference.id)} />
                    この論文を使う
                  </label>
                  <p className="authors">{reference.authors.join(", ")}</p>
                  <h4>要約</h4>
                  <p>{renderMathText(reference.abstractOrMetadataSummary)}</p>
                  <h4>レポートでの使いどころ</h4>
                  <p className="whyUseful">{renderMathText(reference.whyUseful)}</p>
                  <div className="citationRow">
                    <code>{reference.apa7}</code>
                    <button className="iconButton" type="button" onClick={() => copyToClipboard(copyText(reference), "引用・要約・リンクをコピーしました")} aria-label="引用をコピー" title="引用をコピー">
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <div className="referenceButtonRow">
                    <button className="secondaryButton compact" type="button" onClick={() => copyToClipboard(reference.apa7, "APA引用をコピーしました")}>
                      引用だけコピー
                    </button>
                    <button className="secondaryButton compact" type="button" onClick={() => copyToClipboard(copyReferenceSummary(reference), "要約をコピーしました")}>
                      要約をコピー
                    </button>
                  </div>
                  <a href={reference.doi ? `https://doi.org/${reference.doi}` : reference.url} target="_blank" rel="noreferrer">
                    論文ページを開く
                  </a>
                </article>
              ))
            )}
          </div>
        </section>

        {selectedPlan && (references.length > 0 || selectedPdfThemes().length > 0 || selectedContentPoints().length > 0) && (
          <section className="outlinePane" aria-label="構成案">
            <div className="sectionHeader">
              <ListChecks size={18} />
              <h2>5. 構成案・下書きを作る</h2>
              <span className="selectedChip">
                {selectedReferenceIds.length > 0 ? `${selectedReferenceIds.length}件の論文を選択中` : selectedPdfThemes().length > 0 ? "PDF中心" : "内容候補中心"}
              </span>
            </div>
            <button className="primaryButton" type="button" onClick={createOutline} disabled={busy || (selectedReferenceIds.length === 0 && selectedPdfThemes().length === 0 && selectedContentPoints().length === 0)}>
              {status === "outline" ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
              構成案を作る
            </button>
            {selectedReferenceIds.length === 0 && selectedPdfThemes().length > 0 && (
              <div className="notice">
                <p>PDFの内容だけで構成案を作ります。論文引用を入れる場合は、参考文献を選んでください。</p>
              </div>
            )}
            {reportOutline && (
              <article className="outlineResult">
                <h3>{reportOutline.title}</h3>
                <p className="whyUseful">{renderMathText(reportOutline.thesis)}</p>
                {reportOutline.sections.map((section) => (
                  <section className="outlineSection" key={section.title}>
                    <h4>{section.title}</h4>
                    <p>{renderMathText(section.purpose)}</p>
                    <ul>
                      {section.keyPoints.map((point) => (
                        <li key={point}>{renderMathText(point)}</li>
                      ))}
                    </ul>
                    {section.paperIds.length > 0 && <small>使う論文: {section.paperIds.join(", ")}</small>}
                  </section>
                ))}
                <div className="notice">
                  {reportOutline.nextSteps.map((step) => (
                    <p key={step}>{step}</p>
                  ))}
                </div>
              </article>
            )}
            <div className="draftBox">
              <div className="sectionHeader compactHeader">
                <PenLine size={18} />
                <h3>下書き作成</h3>
              </div>
              <div className="draftControls">
                <label>
                  <span>目標語数</span>
                  <input
                    type="number"
                    min={300}
                    max={5000}
                    step={100}
                    value={draftOptions.targetWordCount}
                    onChange={(event) => setDraftOptions({ ...draftOptions, targetWordCount: Number(event.target.value) || 1200 })}
                  />
                </label>
                <label>
                  <span>文章レベル</span>
                  <select value={draftOptions.languageLevel} onChange={(event) => setDraftOptions({ ...draftOptions, languageLevel: event.target.value as ReportDraftOptions["languageLevel"] })}>
                    <option value="high">高め</option>
                    <option value="middle">標準</option>
                    <option value="low">やさしめ</option>
                  </select>
                </label>
                <label>
                  <span>文体</span>
                  <select value={draftOptions.writingStyle} onChange={(event) => setDraftOptions({ ...draftOptions, writingStyle: event.target.value as ReportDraftOptions["writingStyle"] })}>
                    <option value="standard">標準</option>
                    <option value="academic">学術寄り</option>
                  </select>
                </label>
                <label className="inlineToggle draftToggle">
                  <input type="checkbox" checked={draftOptions.humanLike} onChange={(event) => setDraftOptions({ ...draftOptions, humanLike: event.target.checked })} />
                  自然な文章にする
                </label>
                <label className="wideCondition">
                  <span>その他の条件</span>
                  <textarea
                    value={draftOptions.otherConditions}
                    onChange={(event) => setDraftOptions({ ...draftOptions, otherConditions: event.target.value })}
                    placeholder="例: 反論を入れる、一人称を避ける、短めの段落にする"
                    rows={3}
                  />
                </label>
              </div>
              <button className="primaryButton" type="button" onClick={createDraft} disabled={busy || (selectedReferenceIds.length === 0 && selectedPdfThemes().length === 0 && selectedContentPoints().length === 0)}>
                {status === "draft" ? <Loader2 size={18} className="spin" /> : <PenLine size={18} />}
                下書きを作る
              </button>
              {reportDraft && (
                <article className="draftResult">
                  <div className="draftTopline">
                    <div>
                      <h3>{reportDraft.title}</h3>
                      <small>
                        約 {reportDraft.wordCountEstimate} 語 / {reportDraft.languageLevel}
                      </small>
                    </div>
                    <button
                      className="iconButton"
                      type="button"
                      onClick={() => copyToClipboard([reportDraft.title, reportDraft.draft, "参考文献", ...reportDraft.bibliography].join("\n\n"), "下書きをコピーしました")}
                      aria-label="下書きをコピー"
                      title="下書きをコピー"
                    >
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <pre>{renderMathText(reportDraft.draft)}</pre>
                  <div className="notice">
                    {reportDraft.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                  <h4>参考文献</h4>
                  {reportDraft.bibliography.map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                  <div className="personalizationBox">
                    <div className="sectionHeader compactHeader">
                      <ListChecks size={18} />
                      <h3>自分らしく直す</h3>
                    </div>
                    <button className="secondaryButton" type="button" onClick={checkPersonalization} disabled={busy}>
                      {status === "personalization" ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                      改善ポイントを確認
                    </button>
                    {personalizationCheck && (
                      <div className="improvementPanel">
                        <p>{personalizationCheck.summary}</p>
                        <div className="improvementGrid">
                          {personalizationCheck.points.map((point) => (
                            <label className={selectedImprovementIds.includes(point.id) ? "selectCard selected" : "selectCard"} key={point.id}>
                              <input type="checkbox" checked={selectedImprovementIds.includes(point.id)} onChange={() => toggleImprovement(point.id)} />
                              <span>{point.title}</span>
                              <small>{point.issue}</small>
                              <em>
                                {point.priority} / {point.category}: {point.suggestion}
                              </em>
                            </label>
                          ))}
                        </div>
                        <label className="otherImprovement">
                          <span>その他の直したい点</span>
                          <textarea
                            value={otherImprovement}
                            onChange={(event) => {
                              setOtherImprovement(event.target.value);
                              setRevisedDraft(null);
                            }}
                            placeholder="他に直したい点を書いてください。1行に1つでも大丈夫です。"
                            rows={3}
                          />
                        </label>
                        <button className="primaryButton" type="button" onClick={createRevision} disabled={busy}>
                          {status === "revision" ? <Loader2 size={18} className="spin" /> : <PenLine size={18} />}
                          改訂版を作る
                        </button>
                      </div>
                    )}
                    {revisedDraft && (
                      <article className="revisedResult">
                        <div className="draftTopline">
                          <div>
                            <h3>改訂版: {revisedDraft.title}</h3>
                            <small>
                              約 {revisedDraft.wordCountEstimate} 語 / {revisedDraft.appliedImprovementIds.length}件の改善を反映
                            </small>
                          </div>
                          <button
                            className="iconButton"
                            type="button"
                            onClick={() => copyToClipboard([revisedDraft.title, revisedDraft.draft, "参考文献", ...revisedDraft.bibliography].join("\n\n"), "改訂版をコピーしました")}
                            aria-label="改訂版をコピー"
                            title="改訂版をコピー"
                          >
                            <Clipboard size={16} />
                          </button>
                        </div>
                        <pre>{renderMathText(revisedDraft.draft)}</pre>
                        <div className="notice">
                          {revisedDraft.notes.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                        <h4>参考文献</h4>
                        {revisedDraft.bibliography.map((item) => (
                          <code key={item}>{item}</code>
                        ))}
                      </article>
                    )}
                  </div>
                </article>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
