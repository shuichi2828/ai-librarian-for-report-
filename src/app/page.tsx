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
  "Personal experience focused",
  "Paper citation focused",
  "Objective facts focused",
  "Course content focused",
  "Comparison focused",
  "Policy/practice focused",
  "Critical discussion focused"
];

function languageLabel(language: OutputLanguage) {
  if (language === "ja") return "Japanese";
  if (language === "en") return "English";
  return "Auto";
}

function copyText(reference: ReferenceItem) {
  const url = reference.doi ? `https://doi.org/${reference.doi}` : reference.url;
  return [reference.apa7, reference.abstractOrMetadataSummary, reference.whyUseful, url].filter(Boolean).join("\n");
}

function trackUsage(eventName: string, properties: Record<string, string | number | boolean | null | undefined> = {}) {
  track(eventName, properties);
}

export default function Home() {
  const [user, setUser] = useState<GuestUser | null>(null);
  const [loginName, setLoginName] = useState("");
  const [topic, setTopic] = useState("Generative AI and university education");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("auto");
  const [details, setDetails] = useState<AssignmentDetails>({
    assignmentPrompt: "",
    userOpinion: "",
    mustInclude: "",
    reportPreferences: [],
    materialNotes: ""
  });
  const [materialCheck, setMaterialCheck] = useState<MaterialQualityCheck | null>(null);
  const [materialQuestionAnswers, setMaterialQuestionAnswers] = useState<Record<string, string>>({});
  const [selectedMaterialSuggestionIds, setSelectedMaterialSuggestionIds] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [forcePdfOcr, setForcePdfOcr] = useState(false);
  const [pdfMode, setPdfMode] = useState<"text" | "openai-ocr">();
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

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId), [plans, selectedPlanId]);
  const busy = status !== "idle";
  const userHistoryKey = user ? `${HISTORY_KEY}-${user.id}` : HISTORY_KEY;

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

  function selectedPdfThemes() {
    return pdfInsight?.themes.filter((theme) => selectedPdfThemeIds.includes(theme.id)) ?? [];
  }

  function selectedContentPoints() {
    return contentPoints.filter((point) => selectedContentPointIds.includes(point.id));
  }

  function currentAnswers(): InterviewAnswer[] {
    const answers: InterviewAnswer[] = [
      { questionId: "assignment-prompt", question: "Assignment prompt", answer: details.assignmentPrompt },
      { questionId: "user-opinion", question: "User opinion", answer: details.userOpinion },
      { questionId: "must-include", question: "Must-include points", answer: details.mustInclude },
      { questionId: "report-preferences", question: "Report preferences", answer: details.reportPreferences.join(", ") },
      { questionId: "material-notes", question: "Material notes from quality check", answer: details.materialNotes }
    ].filter((item) => item.answer.trim().length > 0);

    if (selectedPdfThemes().length > 0) {
      answers.push({
        questionId: "selected-pdf-themes",
        question: "Selected PDF themes",
        answer: selectedPdfThemes().map((theme) => `${theme.title}: ${theme.summary}`).join(" / ")
      });
    }

    if (selectedContentPoints().length > 0) {
      answers.push({
        questionId: "selected-content-points",
        question: "Selected content points",
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
        body: JSON.stringify({ topic, outputLanguage, details, pdfThemes: selectedPdfThemes() })
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
      setError("Could not create content suggestions.");
    } finally {
      setStatus("idle");
    }
  }

  async function checkMaterialQuality() {
    if (!topic.trim()) {
      setError("Please enter a research topic first.");
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
          outputLanguage,
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
      setError("Could not check the material yet.");
    } finally {
      setStatus("idle");
    }
  }

  async function getPlans(mode: "initial" | "refine" | "mix" = "initial") {
    if (selectedContentPoints().length === 0) {
      setError("Please select at least one content point first.");
      return;
    }

    if (mode === "mix" && combinePlanIds.length < 2) {
      setError("Please select at least two plans to mix.");
      return;
    }

    const previousPlans = plans;
    const instruction =
      mode === "initial"
        ? ""
        : refinementInstruction.trim() ||
          (mode === "mix" ? "Mix the selected plans into stronger alternatives while keeping their best parts." : "Create different report plans with clearer and more flexible angles.");

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
          outputLanguage,
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
      setError("Could not create report plans.");
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
        body: JSON.stringify({ candidate: plan, outputLanguage, citationStyle: "apa7" })
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
      setError("Could not fetch references.");
    } finally {
      setStatus("idle");
    }
  }

  async function readPdf(avoidThemes: string[] = []) {
    if (!pdfFile) {
      setError("Please choose a PDF first.");
      return;
    }

    setStatus("pdf");
    setError(undefined);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("outputLanguage", outputLanguage);
      formData.append("avoidThemes", JSON.stringify(avoidThemes));
      formData.append("forceOcr", String(forcePdfOcr));

      const response = await fetch("/api/pdf-insights", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("pdf");

      const result = (await response.json()) as PdfResponse;
      setPdfInsight(result);
      setPdfMode(result.extractionMode);
      setSelectedPdfThemeIds(result.themes.slice(0, 2).map((theme) => theme.id));
      trackUsage("pdf_read", {
        outputLanguage,
        forceOcr: forcePdfOcr,
        extractionMode: result.extractionMode,
        textLength: result.textLength,
        themeCount: result.themes.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("Could not read this PDF. Please try OCR mode or a smaller text-based PDF.");
    } finally {
      setStatus("idle");
    }
  }

  async function createOutline() {
    if (!selectedPlan) {
      setError("Please choose a report plan first.");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (selectedReferences.length === 0) {
      setError("Please select at least one paper to include.");
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
          outputLanguage: outputLanguage === "ja" ? "ja" : "en"
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
        contentPointCount: selectedContentPoints().length,
        pdfThemeCount: selectedPdfThemes().length,
        sectionCount: result.outline.sections.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("Could not create the report outline.");
    } finally {
      setStatus("idle");
    }
  }

  async function createDraft() {
    if (!selectedPlan) {
      setError("Please choose a report plan first.");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (selectedReferences.length === 0) {
      setError("Please select at least one paper to include.");
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
          outputLanguage: outputLanguage === "ja" ? "ja" : "en"
        })
      });

      if (!response.ok) throw new Error("draft");

      const result = (await response.json()) as DraftResponse;
      setReportDraft(result.draft);
      clearRevisionFlow();
      trackUsage("draft_created", {
        outputLanguage,
        selectedReferenceCount: selectedReferences.length,
        targetWordCount: draftOptions.targetWordCount,
        languageLevel: draftOptions.languageLevel,
        humanLike: draftOptions.humanLike,
        hasOtherConditions: draftOptions.otherConditions.trim().length > 0,
        usedFallback: result.usedFallback
      });
    } catch {
      setError("Could not create the report draft.");
    } finally {
      setStatus("idle");
    }
  }

  async function checkPersonalization() {
    if (!selectedPlan || !reportDraft) {
      setError("Please create a report draft first.");
      return;
    }

    const selectedReferences = references.filter((reference) => selectedReferenceIds.includes(reference.id));
    if (selectedReferences.length === 0) {
      setError("Please select at least one paper to include.");
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
          outputLanguage: outputLanguage === "ja" ? "ja" : "en"
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
      setError("Could not check the draft.");
    } finally {
      setStatus("idle");
    }
  }

  async function createRevision() {
    if (!selectedPlan || !reportDraft || !personalizationCheck) {
      setError("Please run the personalization check first.");
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
      setError("Please select at least one improvement or write an Other improvement.");
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
          outputLanguage: outputLanguage === "ja" ? "ja" : "en"
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
        usedFallback: result.usedFallback
      });
    } catch {
      setError("Could not revise the report draft.");
    } finally {
      setStatus("idle");
    }
  }

  function loadHistory(entry: HistoryEntry) {
    setTopic(entry.topic);
    setOutputLanguage(entry.outputLanguage);
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
      title: `Material detail ${index + 1}`,
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
      description: "User-added content point to include in the report.",
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
          <h1>Report Builder</h1>
          <p className="loginText">Enter your name or email to start. Anyone can use this app; this sign-in only keeps your saved plans separate on this device.</p>
          <form className="loginForm" onSubmit={login}>
            <label htmlFor="loginName">Name or email</label>
            <input id="loginName" value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="student@example.com" autoComplete="email" />
            <button className="primaryButton" type="submit">
              <UserRound size={18} />
              Log in
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="historyPane" aria-label="Search history">
        <div className="paneHeader">
          <div className="brandMark">
            <Library size={20} />
          </div>
          <div>
            <p className="eyebrow">AI Librarian</p>
            <h1>Report Builder</h1>
          </div>
        </div>

        <div className="userBox">
          <UserRound size={17} />
          <span>{user.name}</span>
          <button className="iconButton subtle" type="button" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        <div className="historyTitle">
          <History size={17} />
          <span>History</span>
          {history.length > 0 && (
            <button className="iconButton subtle" type="button" onClick={() => persistHistory([])} aria-label="Clear history" title="Clear history">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="historyList">
          {history.length === 0 ? (
            <p className="emptyText">Saved report plans will appear here.</p>
          ) : (
            history.map((entry) => (
              <button className="historyItem" type="button" key={entry.id} onClick={() => loadHistory(entry)}>
                <span>{entry.topic}</span>
                <small>
                  {new Date(entry.createdAt).toLocaleDateString()} / {languageLabel(entry.outputLanguage)}
                </small>
                <X
                  size={15}
                  aria-label="Delete history item"
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
            <label htmlFor="topic">Research topic</label>
            <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Example: generative AI and university education" />
          </div>
          <div className="languageControl" aria-label="Output language">
            <Languages size={18} />
            {(["auto", "ja", "en"] as const).map((language) => (
              <button className={outputLanguage === language ? "segmented active" : "segmented"} key={language} onClick={() => setOutputLanguage(language)} type="button">
                {languageLabel(language)}
              </button>
            ))}
          </div>
          <button className="primaryButton" type="submit" disabled={busy}>
            {status === "points" ? <Loader2 size={18} className="spin" /> : <MessageSquareText size={18} />}
            Suggest content
          </button>
        </form>

        {error && <div className="notice error">{error}</div>}

        <section className="detailsPane" aria-label="Assignment details">
          <div className="sectionHeader">
            <MessageSquareText size={18} />
            <h2>1. Add your material</h2>
          </div>
          <div className="detailsGrid">
            <label className="questionCard">
              <span>Assignment prompt</span>
              <small>Paste the exact report question or professor instructions.</small>
              <textarea value={details.assignmentPrompt} onChange={(event) => setDetails({ ...details, assignmentPrompt: event.target.value })} placeholder="Paste assignment prompt" rows={4} />
            </label>
            <label className="questionCard">
              <span>Your opinion or tentative claim</span>
              <small>Write what you personally want to argue or explore.</small>
              <textarea
                value={details.userOpinion}
                onChange={(event) => setDetails({ ...details, userOpinion: event.target.value })}
                placeholder="Example: universities should teach responsible use instead of banning AI"
                rows={4}
              />
            </label>
            <label className="questionCard">
              <span>Must-include points</span>
              <small>List concepts, cases, class keywords, or examples you want included.</small>
              <textarea value={details.mustInclude} onChange={(event) => setDetails({ ...details, mustInclude: event.target.value })} placeholder="AI literacy, plagiarism, university guidelines" rows={4} />
            </label>
          </div>
          <div className="preferenceBox">
            <span>Report preference</span>
            <div className="preferenceGrid">
              {REPORT_PREFERENCES.map((preference) => (
                <label className={details.reportPreferences.includes(preference) ? "preferenceChip selected" : "preferenceChip"} key={preference}>
                  <input type="checkbox" checked={details.reportPreferences.includes(preference)} onChange={() => toggleReportPreference(preference)} />
                  {preference}
                </label>
              ))}
            </div>
          </div>
          <div className="materialCheckBox">
            <div>
              <strong>Material Quality Check</strong>
              <p>Check whether the material is specific enough before creating content suggestions and plans.</p>
            </div>
            <button className="secondaryButton compact" type="button" onClick={checkMaterialQuality} disabled={busy}>
              {status === "material" ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
              Check material
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
                  <h3>What to clarify</h3>
                  {materialCheck.weaknesses.map((weakness) => (
                    <p key={weakness}>{weakness}</p>
                  ))}
                  {materialCheck.recommendedPreferences.length > 0 && <small>Recommended preferences: {materialCheck.recommendedPreferences.join(", ")}</small>}
                </section>
                <section>
                  <h3>Quick questions</h3>
                  <div className="materialQuestionList">
                    {materialCheck.questions.map((question) => (
                      <label className="materialQuestion" key={question.id}>
                        <span>{question.label}</span>
                        <small>{question.helpText}</small>
                        {question.type === "choice" ? (
                          <select value={materialQuestionAnswers[question.id] ?? ""} onChange={(event) => updateMaterialAnswer(question.id, event.target.value)}>
                            <option value="">Choose one</option>
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
                <h3>Material to add</h3>
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
                  Add selected material
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="pdfPane" aria-label="PDF insights">
          <div className="sectionHeader">
            <FileText size={18} />
            <h2>Optional PDF reading</h2>
          </div>
          <div className="pdfControls">
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                setPdfFile(event.target.files?.[0] ?? null);
                setPdfInsight(null);
                setPdfMode(undefined);
                setSelectedPdfThemeIds([]);
              }}
            />
            <label className="inlineToggle">
              <input type="checkbox" checked={forcePdfOcr} onChange={(event) => setForcePdfOcr(event.target.checked)} />
              Use OpenAI OCR for scanned PDFs
            </label>
            <button className="secondaryButton compact" type="button" onClick={() => readPdf()} disabled={busy || !pdfFile}>
              {status === "pdf" ? <Loader2 size={17} className="spin" /> : <FileText size={17} />}
              Read PDF
            </button>
            {pdfInsight && (
              <button className="secondaryButton compact" type="button" onClick={() => readPdf(pdfInsight.themes.map((theme) => theme.title))} disabled={busy}>
                <RefreshCcw size={17} />
                Extract again
              </button>
            )}
          </div>
          {pdfInsight && (
            <div className="pdfResult">
              <h3>{pdfInsight.documentTitle}</h3>
              {pdfMode && <small className="modeBadge">Read mode: {pdfMode === "openai-ocr" ? "OpenAI OCR" : "embedded text"}</small>}
              <p>{pdfInsight.summary}</p>
              <div className="themeGrid">
                {pdfInsight.themes.map((theme) => (
                  <label className={selectedPdfThemeIds.includes(theme.id) ? "selectCard selected" : "selectCard"} key={theme.id}>
                    <input type="checkbox" checked={selectedPdfThemeIds.includes(theme.id)} onChange={() => togglePdfTheme(theme.id)} />
                    <span>{theme.title}</span>
                    <small>{theme.summary}</small>
                    <em>{theme.keywords.join(", ")}</em>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="workflowGrid">
          <section aria-label="Content suggestions">
            <div className="sectionHeader">
              <MessageSquareText size={18} />
              <h2>2. Pick content points</h2>
            </div>
            <div className="questionList">
              {contentPoints.length === 0 ? (
                <div className="placeholderBlock">Add your topic and material, then let the librarian suggest content points to include.</div>
              ) : (
                contentPoints.map((point) => (
                  <label className={selectedContentPointIds.includes(point.id) ? "selectCard selected" : "selectCard"} key={point.id}>
                    <input type="checkbox" checked={selectedContentPointIds.includes(point.id)} onChange={() => toggleContentPoint(point.id)} />
                    <span>{point.title}</span>
                    <small>{point.description}</small>
                    <em>
                      {point.type} / {point.source}
                    </em>
                  </label>
                ))
              )}
            </div>
            <div className="customPointRow">
              <input value={customPoint} onChange={(event) => setCustomPoint(event.target.value)} placeholder="Add your own content point" />
              <button className="secondaryButton compact" type="button" onClick={addCustomContentPoint}>
                Add
              </button>
            </div>
            {contentPoints.length > 0 && (
              <button className="secondaryButton" type="button" onClick={() => getPlans("initial")} disabled={busy}>
                {status === "plans" ? <Loader2 size={18} className="spin" /> : <BookOpen size={18} />}
                Create report plans
              </button>
            )}
          </section>

          <section aria-label="Report plans">
            <div className="sectionHeader">
              <BookOpen size={18} />
              <h2>3. Choose a report plan</h2>
              {planRevisionCount > 0 && <span className="selectedChip">Revised {planRevisionCount}</span>}
            </div>
            {plans.length > 0 && (
              <div className="planRefineBox">
                <label>
                  <span>Want different or more flexible plans?</span>
                  <textarea
                    value={refinementInstruction}
                    onChange={(event) => setRefinementInstruction(event.target.value)}
                    placeholder="Example: Plan 1 is good, but make it more policy-focused. Or mix Plan 1's question with Plan 2's argument."
                    rows={3}
                  />
                </label>
                <div className="planRefineActions">
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("refine")} disabled={busy}>
                    {status === "plans" ? <Loader2 size={17} className="spin" /> : <RefreshCcw size={17} />}
                    Suggest different plans
                  </button>
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("mix")} disabled={busy || combinePlanIds.length < 2}>
                    <BookOpen size={17} />
                    Mix selected plans
                  </button>
                  <span>{combinePlanIds.length} selected to mix</span>
                </div>
              </div>
            )}
            <div className="angleList">
              {plans.length === 0 ? (
                <div className="placeholderBlock">Plans will appear after you choose content points.</div>
              ) : (
                plans.map((plan) => (
                  <article className={plan.id === selectedPlanId ? "angleCard selected" : "angleCard"} key={plan.id}>
                    <label className="mixSelect">
                      <input type="checkbox" checked={combinePlanIds.includes(plan.id)} onChange={() => toggleCombinePlan(plan.id)} />
                      Mix
                    </label>
                    <span>{plan.title}</span>
                    <p>{plan.researchQuestion}</p>
                    <small>{plan.reason}</small>
                    <div className="outline">
                      {plan.outline.map((item) => (
                        <b key={item}>{item}</b>
                      ))}
                    </div>
                    <p className="whyUseful">{plan.thesisHint}</p>
                    <button className="secondaryButton compact" type="button" onClick={() => getReferences(plan)} disabled={status === "references"}>
                      {status === "references" && selectedPlanId === plan.id ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
                      Find papers
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="referencesPane" aria-label="References">
          <div className="sectionHeader">
            <Library size={18} />
            <h2>4. Papers for the plan</h2>
            {selectedPlan && <span className="selectedChip">{selectedPlan.title}</span>}
          </div>

          {status === "references" && (
            <div className="loadingBlock">
              <Loader2 size={24} className="spin" />
              <span>Searching more candidates across academic sources...</span>
            </div>
          )}

          {(warnings.length > 0 || totalReviewed !== undefined) && (
            <div className="notice">
              {totalReviewed !== undefined && <p>Reviewed candidates before ranking: {totalReviewed}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {alternatives.length > 0 && <p>Keywords: {alternatives.join(", ")}</p>}
              {refinements.length > 0 && <p>{refinements.join(" / ")}</p>}
            </div>
          )}

          <div className="referenceList">
            {references.length === 0 && status !== "references" ? (
              <div className="placeholderBlock">Choose a plan to search verified papers.</div>
            ) : (
              references.map((reference) => (
                <article className="referenceCard" key={reference.id}>
                  <div className="referenceTopline">
                    <span>{reference.sourceProvider}</span>
                    <span>{reference.relevanceScore}% relevant</span>
                  </div>
                  <div className="referenceMeta">
                    <span>{reference.year ?? "n.d."}</span>
                    <span>{reference.relevanceReason}</span>
                  </div>
                  <h3>{reference.title}</h3>
                  <label className="paperSelect">
                    <input type="checkbox" checked={selectedReferenceIds.includes(reference.id)} onChange={() => toggleReference(reference.id)} />
                    Include this paper
                  </label>
                  <p className="authors">{reference.authors.join(", ")}</p>
                  <p>{reference.abstractOrMetadataSummary}</p>
                  <p className="whyUseful">{reference.whyUseful}</p>
                  <div className="citationRow">
                    <code>{reference.apa7}</code>
                    <button className="iconButton" type="button" onClick={() => navigator.clipboard.writeText(copyText(reference))} aria-label="Copy APA citation" title="Copy APA citation">
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <a href={reference.doi ? `https://doi.org/${reference.doi}` : reference.url} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                </article>
              ))
            )}
          </div>
        </section>

        {references.length > 0 && (
          <section className="outlinePane" aria-label="Report outline">
            <div className="sectionHeader">
              <ListChecks size={18} />
              <h2>5. Build outline and optional draft</h2>
              <span className="selectedChip">{selectedReferenceIds.length} papers selected</span>
            </div>
            <button className="primaryButton" type="button" onClick={createOutline} disabled={busy || selectedReferenceIds.length === 0}>
              {status === "outline" ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
              Create report outline
            </button>
            {reportOutline && (
              <article className="outlineResult">
                <h3>{reportOutline.title}</h3>
                <p className="whyUseful">{reportOutline.thesis}</p>
                {reportOutline.sections.map((section) => (
                  <section className="outlineSection" key={section.title}>
                    <h4>{section.title}</h4>
                    <p>{section.purpose}</p>
                    <ul>
                      {section.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    {section.paperIds.length > 0 && <small>Papers: {section.paperIds.join(", ")}</small>}
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
                <h3>Optional report draft</h3>
              </div>
              <div className="draftControls">
                <label>
                  <span>Word count</span>
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
                  <span>Language level</span>
                  <select value={draftOptions.languageLevel} onChange={(event) => setDraftOptions({ ...draftOptions, languageLevel: event.target.value as ReportDraftOptions["languageLevel"] })}>
                    <option value="high">High</option>
                    <option value="middle">Middle</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label className="inlineToggle draftToggle">
                  <input type="checkbox" checked={draftOptions.humanLike} onChange={(event) => setDraftOptions({ ...draftOptions, humanLike: event.target.checked })} />
                  Natural, human-like tone
                </label>
                <label className="wideCondition">
                  <span>Other conditions</span>
                  <textarea
                    value={draftOptions.otherConditions}
                    onChange={(event) => setDraftOptions({ ...draftOptions, otherConditions: event.target.value })}
                    placeholder="Example: include a counterargument, avoid first person, use short paragraphs"
                    rows={3}
                  />
                </label>
              </div>
              <button className="primaryButton" type="button" onClick={createDraft} disabled={busy || selectedReferenceIds.length === 0}>
                {status === "draft" ? <Loader2 size={18} className="spin" /> : <PenLine size={18} />}
                Write report draft
              </button>
              {reportDraft && (
                <article className="draftResult">
                  <div className="draftTopline">
                    <div>
                      <h3>{reportDraft.title}</h3>
                      <small>
                        About {reportDraft.wordCountEstimate} words / {reportDraft.languageLevel}
                      </small>
                    </div>
                    <button
                      className="iconButton"
                      type="button"
                      onClick={() => navigator.clipboard.writeText([reportDraft.title, reportDraft.draft, "References", ...reportDraft.bibliography].join("\n\n"))}
                      aria-label="Copy report draft"
                      title="Copy report draft"
                    >
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <pre>{reportDraft.draft}</pre>
                  <div className="notice">
                    {reportDraft.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                  <h4>References</h4>
                  {reportDraft.bibliography.map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                  <div className="personalizationBox">
                    <div className="sectionHeader compactHeader">
                      <ListChecks size={18} />
                      <h3>Make it your own</h3>
                    </div>
                    <button className="secondaryButton" type="button" onClick={checkPersonalization} disabled={busy}>
                      {status === "personalization" ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                      Check improvement points
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
                          <span>Others</span>
                          <textarea
                            value={otherImprovement}
                            onChange={(event) => {
                              setOtherImprovement(event.target.value);
                              setRevisedDraft(null);
                            }}
                            placeholder="Write anything else you want the revision to include. One idea per line is okay."
                            rows={3}
                          />
                        </label>
                        <button className="primaryButton" type="button" onClick={createRevision} disabled={busy}>
                          {status === "revision" ? <Loader2 size={18} className="spin" /> : <PenLine size={18} />}
                          Create revised draft
                        </button>
                      </div>
                    )}
                    {revisedDraft && (
                      <article className="revisedResult">
                        <div className="draftTopline">
                          <div>
                            <h3>Revised: {revisedDraft.title}</h3>
                            <small>
                              About {revisedDraft.wordCountEstimate} words / applied {revisedDraft.appliedImprovementIds.length} improvements
                            </small>
                          </div>
                          <button
                            className="iconButton"
                            type="button"
                            onClick={() => navigator.clipboard.writeText([revisedDraft.title, revisedDraft.draft, "References", ...revisedDraft.bibliography].join("\n\n"))}
                            aria-label="Copy revised report draft"
                            title="Copy revised report draft"
                          >
                            <Clipboard size={16} />
                          </button>
                        </div>
                        <pre>{revisedDraft.draft}</pre>
                        <div className="notice">
                          {revisedDraft.notes.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                        <h4>References</h4>
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
