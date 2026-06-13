"use client";

import {
  ArrowLeft,
  ArrowRight,
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
import { legalLinks } from "@/lib/legal-content";
import type {
  AssignmentDetails,
  CitationStyle,
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

type ActiveStep = 0 | 1 | 2 | 3 | 4 | 5;
type WorkflowStatus = "idle" | "material" | "points" | "pdf" | "plans" | "references" | "outline" | "draft" | "personalization" | "revision";

const HISTORY_KEY = "ai-librarian-history-v3";
const USER_KEY = "ai-librarian-user-v1";
const TERMS_KEY = "ai-librarian-terms-v1";
const STATUS_MESSAGES: Record<"ja" | "en", Record<WorkflowStatus, string>> = {
  ja: {
    idle: "",
    material: "材料の具体性と不足点を確認しています。",
    points: "レポートに入れる内容候補を整理しています。",
    pdf: "PDFを読み取り、重要テーマを抽出しています。",
    plans: "選んだ内容からレポートプランを作成しています。",
    references: "学術データベースから参考文献候補を確認しています。",
    outline: "選んだ材料から構成案を作成しています。",
    draft: "構成案と材料をもとに下書きを作成しています。",
    personalization: "下書きを自分らしく直すポイントを確認しています。",
    revision: "選んだ改善点を反映した改訂版を作成しています。"
  },
  en: {
    idle: "",
    material: "Checking how concrete the material is and what is missing.",
    points: "Organizing candidate content points for the report.",
    pdf: "Reading the PDF and extracting important themes.",
    plans: "Creating report plans from the selected content.",
    references: "Checking academic databases for reference candidates.",
    outline: "Creating an outline from the selected material.",
    draft: "Writing a draft from the outline and selected material.",
    personalization: "Checking how to revise the draft in your own voice.",
    revision: "Creating a revised draft with the selected improvements."
  }
};
const REPORT_PREFERENCES = [
  { id: "personal", label: { ja: "自分の経験を入れたい", en: "Include my experience" }, value: { ja: "個人の経験や意見を中心にする", en: "Center personal experience and opinion" } },
  { id: "paper", label: { ja: "論文をしっかり引用したい", en: "Use academic sources" }, value: { ja: "論文引用を重視する", en: "Prioritize academic citations" } },
  { id: "facts", label: { ja: "客観的な事実を重視したい", en: "Focus on objective facts" }, value: { ja: "客観的事実を重視する", en: "Prioritize objective facts" } },
  { id: "course", label: { ja: "授業内容に寄せたい", en: "Connect to class content" }, value: { ja: "授業内容とのつながりを重視する", en: "Connect the report to course content" } },
  { id: "comparison", label: { ja: "比較しながら書きたい", en: "Write by comparison" }, value: { ja: "比較を重視する", en: "Use comparison as the main structure" } },
  { id: "policy", label: { ja: "改善策まで書きたい", en: "Include improvements" }, value: { ja: "制度や実践への提案を重視する", en: "Include proposals for policy or practice" } },
  { id: "critical", label: { ja: "批判的に考察したい", en: "Add critical analysis" }, value: { ja: "批判的考察を重視する", en: "Prioritize critical analysis" } }
] as const;

const UI_TEXT = {
  ja: {
    languageJa: "日本語",
    languageEn: "英語",
    languageAuto: "自動",
    appTitle: "レポート作成AI",
    loginTitle: "AI Report Builder",
    loginIntro: "レポート作成を始める前に、言語を選んでください。",
    loginNameHelp: "名前またはメールアドレスを入力して始めましょう。",
    loginNameLabel: "名前またはメールアドレス",
    loginNamePlaceholder: "",
    loginStart: "始める",
    termsConsent: "利用規約、プライバシーポリシーを確認し、大学や授業のAI利用ルールに従うことに同意します。",
    termsRequired: "始める前に規約と安全ガイドへの同意が必要です。",
    safetyNotice: "AIは下書き補助です。提出前に内容・引用・大学のルールを必ず自分で確認してください。",
    pdfUploadNotice: "権限のあるPDFだけをアップロードしてください。授業資料、有料論文、個人情報を含む資料は、利用許可を確認してから使ってください。",
    draftSafetyNotice: "下書きはそのまま提出せず、自分の言葉で修正し、引用・ページ番号・参考文献を確認してください。",
    citationSafetyNotice: "引用形式は補助表示です。提出前に授業指定の形式と原文のページ番号を確認してください。",
    history: "履歴",
    clearHistory: "履歴を削除",
    emptyHistory: "保存したレポートプランがここに表示されます。",
    logout: "ログアウト",
    stepAria: "作成ステップ",
    materialSection: "1. 材料を入れる",
    assignmentPrompt: "課題の内容",
    assignmentPromptHelp: "",
    assignmentPromptPlaceholder: "",
    userOpinion: "メモ",
    userOpinionHelp: "",
    userOpinionPlaceholder: "",
    mustInclude: "レポートに含めたい内容",
    mustIncludeHelp: "",
    mustIncludePlaceholder: "",
    reportPreferences: "レポートの好み",
    addPreferencePlaceholder: "",
    add: "追加",
    materialCheck: "材料チェック",
    materialCheckHelp: "プランを作る前に、テーマ・意見・材料が十分に具体的か確認します。",
    runCheck: "チェックする",
    materialWeaknesses: "もう少し具体化したい点",
    recommendedDirection: "おすすめの方向性",
    quickQuestions: "追加質問",
    chooseOption: "選択してください",
    additionalMaterial: "追加できる材料",
    addSelectedMaterial: "選んだ材料を追加",
    pdfSection: "PDFを読み込む（任意・3件まで）",
    pdfLimitError: "PDFは3件まで選択できます。",
    pdfOcr: "スキャンPDFはOCRで読む",
    readPdf: "PDFを読む",
    reExtractPdf: "別の観点で再抽出",
    readMode: "読み取り",
    mixedMode: "複数方式",
    pdfTextMode: "PDF内テキスト",
    contentPointsSection: "2. 内容候補を選ぶ",
    contentPointsPlaceholder: "材料チェック後に内容候補を作ると、レポートに入れる候補が表示されます。",
    addContentPointPlaceholder: "",
    createPlan: "プランを作る",
    planSection: "3. プランを選ぶ・編集する",
    editCount: "編集",
    editCountSuffix: "回",
    refinePlanLabel: "プランをもっと自分向けに変える",
    refinePlanPlaceholder: "",
    quickCritical: "批判的にする",
    quickCriticalInstruction: "各プランに反対意見や限界を入れて、批判的考察がしやすい形にしてください。",
    quickCourse: "授業寄りにする",
    quickCourseInstruction: "課題内容や授業内容との接続がはっきり見えるプランにしてください。",
    quickCompare: "比較型にする",
    quickCompareInstruction: "比較軸を明確にして、賛否や事例を比べやすいプランにしてください。",
    quickSimple: "簡単にする",
    quickSimpleInstruction: "大学生が書きやすいように、範囲を狭めてシンプルなプランにしてください。",
    remakePlan: "編集内容で作り直す",
    mixSelectedPlans: "選んだプランを混ぜる",
    plansToMix: "混ぜるプラン",
    planPlaceholder: "内容候補を選ぶと、ここにレポートプランが表示されます。",
    mix: "混ぜる",
    itemCount: "件",
    citation: "引用",
    summary: "要約",
    usePoint: "使いどころ",
    link: "リンク",
    copiedCitationSet: "引用・要約・リンクをコピーしました",
    copiedCitationOnly: "引用だけコピーしました",
    copiedSelectedCitations: "選択中の引用をコピーしました",
    copiedSelectedSummaries: "選択中の要約をコピーしました",
    selectedCitations: "選択中の引用をまとめてコピー",
    selectedSummaries: "要約と使いどころをコピー",
    citationOnly: "引用だけコピー",
    summaryOnly: "要約をコピー",
    inTextCitation: "本文中の引用例",
    citationPage: "引用ページ",
    citationPageHelp: "Chicagoでは、本文で使う箇所のページ番号を入れてください。",
    citationPagePlaceholder: "",
    citationPageMissing: "ページ番号を入力すると、Chicago形式の本文中引用が表示されます。",
    citationFormat: "引用形式",
    citationFormatHelp: "参考文献の見た目とコピー内容を選べます。",
    citationUse: "どこで引用するか",
    createContent: "内容候補を作る",
    createContentHelp: "材料を入力した後に押すと、レポートへ入れる論点候補を作ります。",
    topicRequired: "先にレポートのテーマを入力してください。",
    contentError: "内容候補を作成できませんでした。少し時間を置いてもう一度試してください。",
    referencesLoading: "学術データベースから候補を探しています...",
    reviewedCandidates: "確認した候補数",
    searchKeywords: "検索キーワード",
    referencesPlaceholder: "プランを選んで「参考文献を探す」を押すと、確認済みメタデータの論文候補が表示されます。",
    relevance: "関連度",
    useThisPaper: "この論文を使う",
    openPaper: "論文ページを開く"
    ,
    draftFeedbackQuestion: "この下書きは役に立ちましたか？",
    draftFeedbackGood: "役に立った",
    draftFeedbackNeedsWork: "改善が必要",
    draftFeedbackThanks: "フィードバックを記録しました"
  },
  en: {
    languageJa: "Japanese",
    languageEn: "English",
    languageAuto: "Auto",
    appTitle: "Report Writing AI",
    loginTitle: "AI Report Builder",
    loginIntro: "Choose your language before starting your report.",
    loginNameHelp: "Enter your name or email address to begin.",
    loginNameLabel: "Name or email address",
    loginNamePlaceholder: "",
    loginStart: "Start",
    termsConsent: "I have reviewed the Terms and Privacy Policy, and I agree to follow my university and course AI rules.",
    termsRequired: "You need to accept the terms and safety guide before starting.",
    safetyNotice: "AI only helps with drafting. Before submission, check the content, citations, and university rules yourself.",
    pdfUploadNotice: "Upload only PDFs you are allowed to use. Check permission before using course materials, paid papers, or files containing personal information.",
    draftSafetyNotice: "Do not submit the draft as-is. Revise it in your own words and check citations, page numbers, and references.",
    citationSafetyNotice: "Citation styles are assistive. Before submission, verify the required course style and original page numbers.",
    history: "History",
    clearHistory: "Clear history",
    emptyHistory: "Saved report plans will appear here.",
    logout: "Log out",
    stepAria: "Creation steps",
    materialSection: "1. Add Material",
    assignmentPrompt: "Assignment details",
    assignmentPromptHelp: "",
    assignmentPromptPlaceholder: "",
    userOpinion: "Notes",
    userOpinionHelp: "",
    userOpinionPlaceholder: "",
    mustInclude: "Content to include",
    mustIncludeHelp: "",
    mustIncludePlaceholder: "",
    reportPreferences: "Report preferences",
    addPreferencePlaceholder: "",
    add: "Add",
    materialCheck: "Material Check",
    materialCheckHelp: "Before creating a plan, check whether the topic, opinion, and material are concrete enough.",
    runCheck: "Check",
    materialWeaknesses: "Points to make more specific",
    recommendedDirection: "Recommended direction",
    quickQuestions: "Additional questions",
    chooseOption: "Choose an option",
    additionalMaterial: "Material you can add",
    addSelectedMaterial: "Add selected material",
    pdfSection: "Read PDFs (optional, up to 3)",
    pdfLimitError: "You can select up to 3 PDFs.",
    pdfOcr: "Use OCR for scanned PDFs",
    readPdf: "Read PDF",
    reExtractPdf: "Re-extract from another angle",
    readMode: "Read mode",
    mixedMode: "Mixed methods",
    pdfTextMode: "Embedded PDF text",
    contentPointsSection: "2. Choose Content Points",
    contentPointsPlaceholder: "After checking your material, create content points to see candidates for the report.",
    addContentPointPlaceholder: "",
    createPlan: "Create plan",
    planSection: "3. Choose and Edit a Plan",
    editCount: "Edited",
    editCountSuffix: " times",
    refinePlanLabel: "Make the plan fit my report better",
    refinePlanPlaceholder: "",
    quickCritical: "Make it critical",
    quickCriticalInstruction: "Add counterarguments and limitations to each plan so it is easier to write critical analysis.",
    quickCourse: "Connect to class",
    quickCourseInstruction: "Make the connection to the assignment prompt and course content clearer.",
    quickCompare: "Make it comparative",
    quickCompareInstruction: "Clarify comparison axes so the student can compare positions and cases.",
    quickSimple: "Simplify",
    quickSimpleInstruction: "Narrow the scope and make the plan simpler for an undergraduate report.",
    remakePlan: "Remake with edits",
    mixSelectedPlans: "Mix selected plans",
    plansToMix: "Plans to mix",
    planPlaceholder: "Choose content points to see report plans here.",
    mix: "Mix",
    itemCount: " items",
    citation: "Citation",
    summary: "Summary",
    usePoint: "Where to use it",
    link: "Link",
    copiedCitationSet: "Copied citation, summary, and link",
    copiedCitationOnly: "Copied citation",
    copiedSelectedCitations: "Copied selected citations",
    copiedSelectedSummaries: "Copied selected summaries",
    selectedCitations: "Copy selected citations",
    selectedSummaries: "Copy summaries and use notes",
    citationOnly: "Copy citation only",
    summaryOnly: "Copy summary",
    inTextCitation: "In-text citation",
    citationPage: "Citation page",
    citationPageHelp: "For Chicago, enter the exact page used in the text.",
    citationPagePlaceholder: "",
    citationPageMissing: "Enter a page number to show the Chicago in-text citation.",
    citationFormat: "Citation style",
    citationFormatHelp: "Choose how references are displayed and copied.",
    citationUse: "Where to cite",
    createContent: "Create content points",
    createContentHelp: "After adding material, create candidate points for the report.",
    topicRequired: "Enter a report topic first.",
    contentError: "Could not create content points. Please wait a moment and try again.",
    referencesLoading: "Searching academic databases...",
    reviewedCandidates: "Candidates reviewed",
    searchKeywords: "Search keywords",
    referencesPlaceholder: "Choose a plan and search references to see papers with verified metadata.",
    relevance: "Relevance",
    useThisPaper: "Use this paper",
    openPaper: "Open paper page"
    ,
    draftFeedbackQuestion: "Was this draft useful?",
    draftFeedbackGood: "Useful",
    draftFeedbackNeedsWork: "Needs work",
    draftFeedbackThanks: "Feedback recorded"
  }
} as const;

function languageLabel(language: OutputLanguage, uiLanguage: "ja" | "en" = "ja") {
  const text = UI_TEXT[uiLanguage];
  if (language === "ja") return text.languageJa;
  if (language === "en") return text.languageEn;
  return text.languageAuto;
}

function citationText(reference: ReferenceItem) {
  return reference.formattedCitation ?? reference.apa7;
}

function cleanPageNumber(page: string) {
  return page.trim().replace(/\s+/g, " ");
}

function hasPagePlaceholder(text?: string) {
  return typeof text === "string" && /(?:\{\s*page\s*\}|\[\s*page\s*\])/i.test(text);
}

function replacePagePlaceholder(text: string, page: string) {
  return text.replace(/(?:\{\s*page\s*\}|\[\s*page\s*\])/gi, page);
}

function inTextCitationText(reference: ReferenceItem, pageNumber = "") {
  if (!reference.inTextCitation) return "";
  if (reference.citationStyle !== "chicago") return reference.inTextCitation;

  if (!hasPagePlaceholder(reference.inTextCitation)) return reference.inTextCitation;

  const page = cleanPageNumber(pageNumber);
  if (!page) return "";

  return replacePagePlaceholder(reference.inTextCitation, page);
}

function citationUseText(reference: ReferenceItem, uiLanguage: "ja" | "en", pageNumber = "") {
  if (reference.citationStyle !== "chicago") return reference.citationUse ?? "";

  const inTextCitation = inTextCitationText(reference, pageNumber);
  if (!inTextCitation) {
    return uiLanguage === "ja"
      ? "Chicago Author-Dateでは、本文確認後に実際のページ番号を入力してから引用してください。ページ番号は推測で入れないでください。"
      : "For Chicago Author-Date, enter the exact page after checking the full text. Do not guess page numbers.";
  }

  return uiLanguage === "ja"
    ? `本文では ${inTextCitation} のように示し、この論文が支える主張や段落の直後で使います。`
    : `Use ${inTextCitation} near the sentence or paragraph supported by this source.`;
}

function copyText(reference: ReferenceItem, uiLanguage: "ja" | "en", inTextCitation = "", citationUse = "") {
  const text = UI_TEXT[uiLanguage];
  const url = reference.doi ? `https://doi.org/${reference.doi}` : reference.url;
  return [
    `${text.citation}: ${citationText(reference)}`,
    inTextCitation ? `${text.inTextCitation}: ${inTextCitation}` : "",
    `${text.summary}: ${reference.abstractOrMetadataSummary}`,
    `${text.usePoint}: ${reference.whyUseful}`,
    citationUse ? `${text.citationUse}: ${citationUse}` : "",
    url ? `${text.link}: ${url}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function copyReferenceSummary(reference: ReferenceItem, uiLanguage: "ja" | "en", inTextCitation = "", citationUse = "") {
  const text = UI_TEXT[uiLanguage];
  return [
    reference.title,
    inTextCitation ? `${text.inTextCitation}: ${inTextCitation}` : "",
    `${text.summary}: ${reference.abstractOrMetadataSummary}`,
    `${text.usePoint}: ${reference.whyUseful}`,
    citationUse ? `${text.citationUse}: ${citationUse}` : "",
    `${text.citation}: ${citationText(reference)}`
  ]
    .filter(Boolean)
    .join("\n");
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

function contentTypeLabel(type: ContentPoint["type"], uiLanguage: "ja" | "en") {
  const labels = {
    ja: {
      background: "背景",
      argument: "主張",
      case: "事例",
      theory: "理論",
      evidence: "根拠",
      counterargument: "反論",
      policy: "提案",
      pdf: "PDF",
      custom: "追加"
    },
    en: {
      background: "Background",
      argument: "Argument",
      case: "Case",
      theory: "Theory",
      evidence: "Evidence",
      counterargument: "Counterargument",
      policy: "Proposal",
      pdf: "PDF",
      custom: "Custom"
    }
  } satisfies Record<"ja" | "en", Record<ContentPoint["type"], string>>;

  return labels[uiLanguage][type];
}

function sourceLabel(source: ContentPoint["source"], uiLanguage: "ja" | "en") {
  const labels = {
    ja: {
      ai: "AI提案",
      pdf: "PDF由来",
      user: "自分で追加"
    },
    en: {
      ai: "AI suggestion",
      pdf: "From PDF",
      user: "Added by me"
    }
  } satisfies Record<"ja" | "en", Record<ContentPoint["source"], string>>;

  return labels[uiLanguage][source];
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
  const [termsAccepted, setTermsAccepted] = useState(false);
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
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa7");
  const [referencePages, setReferencePages] = useState<Record<string, string>>({});
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
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [error, setError] = useState<string>();
  const [copyNotice, setCopyNotice] = useState("");
  const [activeStep, setActiveStep] = useState<ActiveStep>(0);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId), [plans, selectedPlanId]);
  const busy = status !== "idle";
  const userHistoryKey = user ? `${HISTORY_KEY}-${user.id}` : HISTORY_KEY;
  const selectedOutputLanguage: "ja" | "en" = outputLanguage === "en" ? "en" : "ja";
  const text = UI_TEXT[selectedOutputLanguage];
  const guideSteps =
    selectedOutputLanguage === "ja"
      ? [
          { id: 0 as const, eyebrow: "テーマ", title: "レポートのテーマを決める", short: "テーマ", done: topic.trim().length > 0 },
          { id: 1 as const, eyebrow: "Step 1", title: "レポート材料の収集", short: "材料収集", done: details.assignmentPrompt.trim().length > 0 || details.mustInclude.trim().length > 0 || allPdfThemes().length > 0 },
          { id: 2 as const, eyebrow: "Step 2", title: "内容の絞り込み", short: "内容整理", done: selectedContentPointIds.length > 0 },
          { id: 3 as const, eyebrow: "Step 3", title: "プランを作成", short: "プラン", done: Boolean(selectedPlan) },
          { id: 4 as const, eyebrow: "Step 4", title: "参考文献を探す", short: "参考文献", done: selectedReferenceIds.length > 0 },
          { id: 5 as const, eyebrow: "Step 5", title: "下書きを作成", short: "下書き", done: Boolean(reportOutline || reportDraft) }
        ]
      : [
          { id: 0 as const, eyebrow: "Theme", title: "Choose a report theme", short: "Theme", done: topic.trim().length > 0 },
          { id: 1 as const, eyebrow: "Step 1", title: "Collect report material", short: "Material", done: details.assignmentPrompt.trim().length > 0 || details.mustInclude.trim().length > 0 || allPdfThemes().length > 0 },
          { id: 2 as const, eyebrow: "Step 2", title: "Narrow the content", short: "Narrow", done: selectedContentPointIds.length > 0 },
          { id: 3 as const, eyebrow: "Step 3", title: "Create a plan", short: "Plan", done: Boolean(selectedPlan) },
          { id: 4 as const, eyebrow: "Step 4", title: "Find references", short: "References", done: selectedReferenceIds.length > 0 },
          { id: 5 as const, eyebrow: "Step 5", title: "Create a draft", short: "Draft", done: Boolean(reportOutline || reportDraft) }
        ];
  const activeGuide = guideSteps.find((step) => step.id === activeStep) ?? guideSteps[0];
  const busyMessage = STATUS_MESSAGES[selectedOutputLanguage][status];
  function legalHref(href: string) {
    return selectedOutputLanguage === "en" && (href === "/terms" || href === "/privacy") ? `${href}?lang=en` : href;
  }
  function lengthScore(value: string, usefulLength: number, strongLength: number) {
    const length = value.trim().length;
    if (length === 0) return 0;
    const base = Math.min(70, Math.round((length / strongLength) * 70));
    const bonus = length >= usefulLength ? 20 : 8;
    return Math.min(95, base + bonus);
  }

  const materialMetrics = [
    { label: text.assignmentPrompt, value: lengthScore(details.assignmentPrompt, 40, 220) },
    { label: text.mustInclude, value: Math.max(lengthScore(details.mustInclude, 30, 160), Math.min(90, allPdfThemes().length * 15)) },
    { label: text.reportPreferences, value: Math.min(95, details.reportPreferences.length * 18 + lengthScore(details.materialNotes, 30, 180)) }
  ];

  useEffect(() => {
    const acceptedTerms = window.localStorage.getItem(TERMS_KEY) === "true";
    setTermsAccepted(acceptedTerms);
    const savedUser = window.localStorage.getItem(USER_KEY);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as GuestUser;
      setLoginName(parsedUser.name);
      if (acceptedTerms) {
        setUser(parsedUser);
      }
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
    if (!termsAccepted) {
      setError(text.termsRequired);
      return;
    }

    const nextUser = {
      id: name.toLowerCase().replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 80),
      name
    };
    setUser(nextUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    window.localStorage.setItem(TERMS_KEY, "true");
    trackUsage("guest_login", { hasAtSign: name.includes("@") });
    trackUsage("terms_accepted", { version: TERMS_KEY });
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
    setReferencePages({});
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

  function allPdfThemes() {
    return pdfInsight?.themes ?? [];
  }

  function selectedContentPoints() {
    return contentPoints.filter((point) => selectedContentPointIds.includes(point.id));
  }

  function hasSelectedDraftMaterial(selectedReferences: ReferenceItem[]) {
    return selectedReferences.length > 0 || selectedPdfThemes().length > 0 || selectedContentPoints().length > 0;
  }

  function selectedReferencesForRequest() {
    return references
      .filter((reference) => selectedReferenceIds.includes(reference.id))
      .map((reference) => {
        const inTextCitation = inTextCitationText(reference, referencePages[reference.id]);
        if (reference.citationStyle !== "chicago") return reference;

        return {
          ...reference,
          inTextCitation: inTextCitation || undefined,
          citationUse: inTextCitation
            ? selectedOutputLanguage === "ja"
              ? `本文では ${inTextCitation} のように示し、この論文が支える主張や段落の直後で使います。`
              : `Use ${inTextCitation} near the sentence or paragraph supported by this source.`
            : reference.citationUse
        };
      });
  }

  function selectedPreferenceText() {
    return details.reportPreferences
      .map((preference) => REPORT_PREFERENCES.find((item) => item.id === preference)?.value[selectedOutputLanguage] ?? preference)
      .join(", ");
  }

  function currentAnswers(): InterviewAnswer[] {
    const labels =
      selectedOutputLanguage === "ja"
        ? {
            assignmentPrompt: "課題の内容",
            userOpinion: "自分の意見",
            mustInclude: "レポートに含めたい内容",
            reportPreferences: "レポートの好み",
            materialNotes: "材料チェックで追加した内容",
            pdfThemes: "選択したPDFテーマ",
            contentPoints: "選択した内容候補"
          }
        : {
            assignmentPrompt: "Assignment details",
            userOpinion: "My opinion",
            mustInclude: "Content to include",
            reportPreferences: "Report preferences",
            materialNotes: "Added material from material check",
            pdfThemes: "Selected PDF themes",
            contentPoints: "Selected content points"
          };
    const answers: InterviewAnswer[] = [
      { questionId: "assignment-prompt", question: labels.assignmentPrompt, answer: details.assignmentPrompt },
      { questionId: "user-opinion", question: labels.userOpinion, answer: details.userOpinion },
      { questionId: "must-include", question: labels.mustInclude, answer: details.mustInclude },
      { questionId: "report-preferences", question: labels.reportPreferences, answer: selectedPreferenceText() },
      { questionId: "material-notes", question: labels.materialNotes, answer: details.materialNotes }
    ].filter((item) => item.answer.trim().length > 0);

    if (selectedPdfThemes().length > 0) {
      answers.push({
        questionId: "selected-pdf-themes",
        question: labels.pdfThemes,
        answer: selectedPdfThemes().map((theme) => `${theme.title}: ${theme.summary}`).join(" / ")
      });
    }

    if (selectedContentPoints().length > 0) {
      answers.push({
        questionId: "selected-content-points",
        question: labels.contentPoints,
        answer: selectedContentPoints().map((point) => `${point.title}: ${point.description}`).join(" / ")
      });
    }

    return answers;
  }

  async function suggestContentPoints() {
    if (!topic.trim()) return;

    setStatus("points");
    setError(undefined);
    setContentPoints([]);
    setSelectedContentPointIds([]);
    setPlans([]);
    setReferences([]);
    setReferencePages({});
    setSelectedReferenceIds([]);
    setReportOutline(null);
    setReportDraft(null);
    clearRevisionFlow();
    setWarnings([]);

    try {
      const response = await fetch("/api/content-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, outputLanguage: selectedOutputLanguage, details, pdfThemes: allPdfThemes() })
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
        selectedPdfThemes: allPdfThemes().length,
        pointCount: result.points.length,
        usedFallback: result.usedFallback
      });
    } catch {
      setError(text.contentError);
    } finally {
      setStatus("idle");
    }
  }

  async function checkMaterialQuality() {
    if (!topic.trim()) {
      setError(text.topicRequired);
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
          pdfThemes: allPdfThemes()
        })
      });

      if (!response.ok) throw new Error("material");

      const result = (await response.json()) as MaterialQualityResponse;
      setMaterialCheck(result.check);
      setSelectedMaterialSuggestionIds(result.check.suggestions.slice(0, 3).map((suggestion) => suggestion.id));
      trackUsage("material_checked", {
        outputLanguage,
        score: result.check.score,
        weaknessCount: result.check.weaknesses.length,
        questionCount: result.check.questions.length,
        suggestionCount: result.check.suggestions.length,
        preferenceCount: details.reportPreferences.length,
        pdfThemeCount: allPdfThemes().length,
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
    setReferencePages({});
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
      trackUsage("plan_created", {
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
        body: JSON.stringify({ candidate: plan, outputLanguage: selectedOutputLanguage, citationStyle })
      });

      if (!response.ok) throw new Error("references");

      const result = (await response.json()) as ReferenceSearchResult;
      setReferences(result.references);
      setSelectedReferenceIds(result.references.slice(0, 4).map((reference) => reference.id));
      setReferencePages({});
      setReportDraft(null);
      clearRevisionFlow();
      setWarnings(result.warnings);
      setAlternatives(result.alternativeKeywords);
      setRefinements(result.refinementSuggestions);
      setTotalReviewed(result.totalCandidatesReviewed);
      trackUsage("references_found", {
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

  async function checkMaterialAndContinue() {
    if (!topic.trim()) {
      await checkMaterialQuality();
      return;
    }

    await checkMaterialQuality();
    setActiveStep(2);
  }

  async function suggestContentAndContinue() {
    if (!topic.trim()) {
      await suggestContentPoints();
      return;
    }

    await suggestContentPoints();
    setActiveStep(2);
  }

  async function createPlansAndContinue() {
    if (selectedContentPoints().length === 0) {
      await getPlans("initial");
      return;
    }

    await getPlans("initial");
    setActiveStep(3);
  }

  async function findReferencesAndContinue(plan: ThemeCandidate) {
    await getReferences(plan);
    setActiveStep(4);
  }

  async function readPdf(avoidThemes: string[] = []) {
    if (pdfFiles.length === 0) {
      setError("先にPDFを選んでください。PDFは3つまで読み込めます。");
      return;
    }

    setStatus("pdf");
    setError(undefined);
    const isAdditionalRead = avoidThemes.length > 0 && Boolean(pdfInsight);
    const runPrefix = isAdditionalRead ? `extra-${Date.now()}` : "base";

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

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || `${file.name}を読み込めませんでした。`);
        }

        const result = (await response.json()) as PdfResponse;
        results.push({
          ...result,
          documentTitle: result.documentTitle || file.name,
          themes: result.themes.map((theme) => ({
            ...theme,
            id: `${runPrefix}-pdf-${index + 1}-${theme.id}`,
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
      const nextInsight = isAdditionalRead && pdfInsight
        ? {
            documentTitle: pdfInsight.documentTitle,
            summary: [
              pdfInsight.summary,
              selectedOutputLanguage === "ja" ? "追加抽出:" : "Additional extraction:",
              combined.summary
            ].join("\n\n"),
            themes: [
              ...pdfInsight.themes,
              ...combined.themes.filter(
                (theme) =>
                  !pdfInsight.themes.some(
                    (previous) => previous.title.replace(/^PDF\d+:\s*/, "") === theme.title.replace(/^PDF\d+:\s*/, "")
                  )
              )
            ].slice(0, 18)
          }
        : combined;

      setPdfInsight(nextInsight);
      setPdfMode(modes.size === 1 ? results[0].extractionMode : "mixed");
      setSelectedPdfThemeIds((current) => {
        const addedIds = combined.themes.slice(0, Math.min(4, combined.themes.length)).map((theme) => theme.id);
        const nextIds = isAdditionalRead ? [...current, ...addedIds] : addedIds;
        return Array.from(new Set(nextIds)).filter((id) => nextInsight.themes.some((theme) => theme.id === id)).slice(0, 8);
      });
      trackUsage("pdf_read", {
        outputLanguage: selectedOutputLanguage,
        fileCount: pdfFiles.length,
        additionalRead: isAdditionalRead,
        forceOcr: forcePdfOcr,
        extractionMode: modes.size === 1 ? results[0].extractionMode : "mixed",
        textLength: results.reduce((total, result) => total + result.textLength, 0),
        themeCount: nextInsight.themes.length,
        usedFallback: results.some((result) => result.usedFallback)
      });
    } catch (pdfError) {
      const message = pdfError instanceof Error ? pdfError.message : "PDFを読み込めませんでした。";
      trackUsage("pdf_read_failed", {
        outputLanguage: selectedOutputLanguage,
        fileCount: pdfFiles.length,
        forceOcr: forcePdfOcr,
        additionalRead: avoidThemes.length > 0
      });
      setError(`${message} PDFを3件以内にする、容量を15MB以内にする、またはOCRモードも試してください。`);
    } finally {
      setStatus("idle");
    }
  }

  async function createOutline() {
    if (!selectedPlan) {
      setError("先にレポートプランを選んでください。");
      return;
    }

    const selectedReferences = selectedReferencesForRequest();
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

    const selectedReferences = selectedReferencesForRequest();
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

    const selectedReferences = selectedReferencesForRequest();
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

    const selectedReferences = selectedReferencesForRequest();
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
    setReferencePages({});
    setWarnings([]);
    setAlternatives([]);
    setRefinements([]);
    setReportDraft(null);
    clearRevisionFlow();
    setError(undefined);
    setActiveStep(4);
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
      title: selectedOutputLanguage === "ja" ? `追加した材料 ${index + 1}` : `Added material ${index + 1}`,
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
      description: selectedOutputLanguage === "ja" ? "自分で追加した、レポートに入れたい内容です。" : "A content point I added and want to include in the report.",
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
        <section className="loginPanel" aria-labelledby="loginTitle">
          <div className="appGlyph" aria-hidden="true" />
          <h1 id="loginTitle">{text.loginTitle}</h1>
          <div className="languageControl loginLanguage" aria-label={selectedOutputLanguage === "ja" ? "表示言語" : "Display language"}>
            <Languages size={18} />
            {(["ja", "en"] as const).map((language) => (
              <button className={selectedOutputLanguage === language ? "segmented active" : "segmented"} key={language} onClick={() => setOutputLanguage(language)} type="button">
                {language === "ja" ? "Japanese" : "English"}
              </button>
            ))}
          </div>
          <p className="loginText">{text.loginIntro}</p>
          {error && <div className="notice error">{error}</div>}
          <form className="loginForm" onSubmit={login}>
            <label htmlFor="loginName">{text.loginNameHelp}</label>
            <input id="loginName" value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="email" aria-label={text.loginNameLabel} />
            <label className="termsConsent">
              <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
              <span>{text.termsConsent}</span>
            </label>
            <nav className="legalLinks" aria-label="Legal links">
              {legalLinks.map((link) => (
                <a href={legalHref(link.href)} key={link.href}>{selectedOutputLanguage === "ja" ? link.labelJa : link.labelEn}</a>
              ))}
            </nav>
            <button className="primaryButton" type="submit" disabled={!loginName.trim() || !termsAccepted}>
              <UserRound size={18} />
              {text.loginStart}
            </button>
          </form>
          <p className="safetyText">{text.safetyNotice}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="historyPane" aria-label={text.history}>
        <div className="paneHeader">
          <div className="appGlyph miniGlyph" aria-hidden="true" />
          <div>
            <h1>AI Report Builder</h1>
          </div>
        </div>

        <div className="languageControl sidebarLanguage" aria-label={selectedOutputLanguage === "ja" ? "出力言語" : "Output language"}>
          <Languages size={18} />
          {(["ja", "en"] as const).map((language) => (
            <button className={selectedOutputLanguage === language ? "segmented active" : "segmented"} key={language} onClick={() => setOutputLanguage(language)} type="button">
              {languageLabel(language, selectedOutputLanguage)}
            </button>
          ))}
        </div>

        <div className="userBox">
          <UserRound size={17} />
          <span>{user.name}</span>
          <button className="iconButton subtle" type="button" onClick={logout} aria-label={text.logout} title={text.logout}>
            <LogOut size={16} />
          </button>
        </div>

        <div className="historyTitle">
          <History size={17} />
          <span>{text.history}</span>
          {history.length > 0 && (
            <button className="iconButton subtle" type="button" onClick={() => persistHistory([])} aria-label={text.clearHistory} title={text.clearHistory}>
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="historyList">
          {history.length === 0 ? (
            <p className="emptyText">{text.emptyHistory}</p>
          ) : (
            history.map((entry) => (
              <button className="historyItem" type="button" key={entry.id} onClick={() => loadHistory(entry)}>
                <span>{entry.topic}</span>
                <small>
                  {new Date(entry.createdAt).toLocaleDateString()} / {languageLabel(entry.outputLanguage, selectedOutputLanguage)}
                </small>
                <X
                  size={15}
                  aria-label={text.clearHistory}
                  onClick={(event) => {
                    event.stopPropagation();
                    persistHistory(history.filter((item) => item.id !== entry.id));
                  }}
                />
              </button>
            ))
          )}
        </div>
        <nav className="legalLinks sidebarLegalLinks" aria-label="Legal links">
          {legalLinks.map((link) => (
            <a href={legalHref(link.href)} key={link.href}>{selectedOutputLanguage === "ja" ? link.labelJa : link.labelEn}</a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <div className="workspaceTop">
          <div>
            <p className="eyebrow">{activeGuide.eyebrow}</p>
            <h2>{activeGuide.title}</h2>
          </div>
          {activeStep > 0 && (
            <button className="secondaryButton compact" type="button" onClick={() => setActiveStep((Math.max(0, activeStep - 1) as ActiveStep))}>
              <ArrowLeft size={17} />
              {selectedOutputLanguage === "ja" ? "前のStep" : "Previous"}
            </button>
          )}
        </div>

        <nav className="stepRail stepRailButtons" aria-label={text.stepAria}>
          {guideSteps.map((step) => (
            <button className={step.id === activeStep ? "stepPill active" : step.done ? "stepPill done" : "stepPill"} key={step.id} type="button" onClick={() => setActiveStep(step.id)}>
              {step.done && <CheckCircle2 size={15} />}
              {step.short}
            </button>
          ))}
        </nav>

        {error && <div className="notice error">{error}</div>}
        {busyMessage && (
          <div className="notice loadingNotice">
            <p>{busyMessage}</p>
          </div>
        )}
        <div className="notice safetyNotice">
          <p>{text.safetyNotice}</p>
        </div>

        {activeStep === 0 && (
          <section className="topicHero" aria-label={selectedOutputLanguage === "ja" ? "レポートテーマ入力" : "Report theme input"}>
            <label className="topicHeroField" htmlFor="topic">
              <span>{selectedOutputLanguage === "ja" ? "レポートのテーマを入力してください。" : "Enter your report theme."}</span>
              <div>
                <input
                  id="topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
                <button className="arrowButton" type="button" onClick={() => topic.trim() && setActiveStep(1)} aria-label={selectedOutputLanguage === "ja" ? "次の画面へ進む" : "Go to the next screen"}>
                  <ArrowRight size={22} />
                </button>
              </div>
            </label>
            <p className="topicHeroText">
              {selectedOutputLanguage === "ja"
                ? "テーマを入力後、以下の手順でレポート作成を進めます。AIは下書きまでのお手伝いです。"
                : "After entering a theme, follow these steps to build your report. AI helps you reach a draft."}
            </p>
            <div className="processList">
              {guideSteps.slice(1).map((step) => (
                <button className="processItem" key={step.id} type="button" onClick={() => setActiveStep(step.id)}>
                  <span>{step.eyebrow}</span>
                  <strong>{step.title}</strong>
                </button>
              ))}
            </div>
          </section>
        )}

        {activeStep === 1 && (
          <>
        <section className="detailsPane stepPage" aria-label="Assignment details">
          <div className="sectionHeader">
            <MessageSquareText size={18} />
            <h2>{text.materialSection}</h2>
          </div>
          <div className="detailsGrid">
            <label className="questionCard">
              <span>{text.assignmentPrompt}</span>
              <textarea value={details.assignmentPrompt} onChange={(event) => setDetails({ ...details, assignmentPrompt: event.target.value })} rows={4} />
            </label>
            <label className="questionCard">
              <span>{text.mustInclude}</span>
              <textarea value={details.mustInclude} onChange={(event) => setDetails({ ...details, mustInclude: event.target.value })} rows={4} />
            </label>
          </div>
          <div className="preferenceBox">
            <span>{text.reportPreferences}</span>
            <div className="preferenceGrid">
              {REPORT_PREFERENCES.map((preference) => (
                <label className={details.reportPreferences.includes(preference.id) ? "preferenceChip selected" : "preferenceChip"} key={preference.id}>
                  <input type="checkbox" checked={details.reportPreferences.includes(preference.id)} onChange={() => toggleReportPreference(preference.id)} />
                  {preference.label[selectedOutputLanguage]}
                </label>
              ))}
            </div>
            <div className="customPreferenceRow">
              <input
                value={customPreference}
                onChange={(event) => setCustomPreference(event.target.value)}
              />
              <button className="secondaryButton compact" type="button" onClick={addCustomPreference}>
                {text.add}
              </button>
            </div>
          </div>
        </section>

        <section className="pdfPane" aria-label={text.pdfSection}>
          <div className="sectionHeader">
            <FileText size={18} />
            <h2>{text.pdfSection}</h2>
          </div>
          <div className="notice safetyNotice">
            <p>{text.pdfUploadNotice}</p>
          </div>
          <div className="pdfControls">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? []);
                if (selectedFiles.length > 3) {
                  setError(text.pdfLimitError);
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
              {text.pdfOcr}
            </label>
            <button className="secondaryButton compact" type="button" onClick={() => readPdf()} disabled={busy || pdfFiles.length === 0}>
              {status === "pdf" ? <Loader2 size={17} className="spin" /> : <FileText size={17} />}
              {text.readPdf}
            </button>
            {pdfInsight && (
              <button className="secondaryButton compact" type="button" onClick={() => readPdf(pdfInsight.themes.map((theme) => theme.title))} disabled={busy}>
                <RefreshCcw size={17} />
                {text.reExtractPdf}
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
              {pdfMode && <small className="modeBadge">{text.readMode}: {pdfMode === "mixed" ? text.mixedMode : pdfMode === "openai-ocr" ? "OpenAI OCR" : text.pdfTextMode}</small>}
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
        <div className="materialCheckBox stepPage">
          <div>
            <strong>{text.materialCheck}</strong>
            {text.materialCheckHelp && <p>{text.materialCheckHelp}</p>}
          </div>
          <button className="primaryButton compact" type="button" onClick={checkMaterialAndContinue} disabled={busy}>
            {status === "material" ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />}
            {text.runCheck}
          </button>
        </div>
          </>
        )}

        {(activeStep === 2 || activeStep === 3) && (
        <div className={activeStep === 2 ? "workflowGrid stepFocusGrid" : "workflowGrid planStageGrid"}>
          {activeStep === 2 && (
          <section className="analysisPane" aria-label={selectedOutputLanguage === "ja" ? "材料の分析結果" : "Material analysis"}>
            <div className="sectionHeader">
              <ListChecks size={18} />
              <h2>{selectedOutputLanguage === "ja" ? "分析結果" : "Analysis result"}</h2>
            </div>
            <div className="scoreBars">
              {materialMetrics.map((metric) => (
                <div className="scoreBar" key={metric.label}>
                  <div>
                    <span>{metric.label}</span>
                    <b>{metric.value}%</b>
                  </div>
                  <meter min={0} max={100} value={metric.value} />
                </div>
              ))}
            </div>
            {materialCheck ? (
              <div className="analysisSummary">
                <div className="materialScore compactScore">
                  <b>{materialCheck.score}%</b>
                  <span>{materialCheck.verdict}</span>
                </div>
                <strong>{text.materialWeaknesses}</strong>
                {materialCheck.weaknesses.map((weakness) => (
                  <p key={weakness}>{weakness}</p>
                ))}
                {materialCheck.recommendedPreferences.length > 0 && <small>{text.recommendedDirection}: {materialCheck.recommendedPreferences.join(", ")}</small>}
              </div>
            ) : (
              <div className="placeholderBlock">{selectedOutputLanguage === "ja" ? "Step 1でチェックすると、材料の分析結果がここに表示されます。" : "Check Step 1 to show the material analysis here."}</div>
            )}
          </section>
          )}

          {activeStep === 2 && materialCheck && (
          <section className="questionsPane" aria-label={text.quickQuestions}>
            <div className="sectionHeader">
              <MessageSquareText size={18} />
              <h2>{text.quickQuestions}</h2>
            </div>
            {materialCheck && (
              <div className="materialQuestionList">
                {materialCheck.questions.map((question) => (
                  <label className="materialQuestion" key={question.id}>
                    <span>{question.label}</span>
                    <small>{question.helpText}</small>
                    {question.type === "choice" ? (
                      <select value={materialQuestionAnswers[question.id] ?? ""} onChange={(event) => updateMaterialAnswer(question.id, event.target.value)}>
                        <option value="">{text.chooseOption}</option>
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
            )}
            {materialCheck.suggestions.length > 0 && (
              <div className="materialSuggestionArea">
                <h3>{text.additionalMaterial}</h3>
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
                  {text.addSelectedMaterial}
                </button>
              </div>
            )}
          </section>
          )}

          {activeStep === 2 && (
          <section className="contentPointsPane" aria-label={text.contentPointsSection}>
            <div className="sectionHeader">
              <MessageSquareText size={18} />
              <h2>{text.contentPointsSection}</h2>
            </div>
            <div className="questionList">
              {contentPoints.length === 0 ? (
                <div className="placeholderBlock">{text.contentPointsPlaceholder}</div>
              ) : (
                contentPoints.map((point) => (
                  <label className={selectedContentPointIds.includes(point.id) ? "selectCard selected" : "selectCard"} key={point.id}>
                    <input type="checkbox" checked={selectedContentPointIds.includes(point.id)} onChange={() => toggleContentPoint(point.id)} />
                    <span>{point.title}</span>
                    <small>{renderMathText(point.description)}</small>
                    <em>
                      {contentTypeLabel(point.type, selectedOutputLanguage)} / {sourceLabel(point.source, selectedOutputLanguage)}
                    </em>
                  </label>
                ))
              )}
            </div>
            <div className="customPointRow">
              <input value={customPoint} onChange={(event) => setCustomPoint(event.target.value)} />
              <button className="secondaryButton compact" type="button" onClick={addCustomContentPoint}>
                {text.add}
              </button>
            </div>
            <button className="primaryButton" type="button" onClick={suggestContentAndContinue} disabled={busy || !topic.trim()}>
              {status === "points" ? <Loader2 size={18} className="spin" /> : <MessageSquareText size={18} />}
              {text.createContent}
            </button>
            {contentPoints.length > 0 && (
              <button className="secondaryButton" type="button" onClick={createPlansAndContinue} disabled={busy}>
                {status === "plans" ? <Loader2 size={18} className="spin" /> : <BookOpen size={18} />}
                {text.createPlan}
              </button>
            )}
          </section>
          )}

          {activeStep === 3 && (
          <section aria-label={text.planSection}>
            <div className="sectionHeader">
              <BookOpen size={18} />
              <h2>{text.planSection}</h2>
              {planRevisionCount > 0 && <span className="selectedChip">{text.editCount} {planRevisionCount}{text.editCountSuffix}</span>}
            </div>
            {plans.length > 0 && (
              <div className="planRefineBox">
                <label>
                  <span>{text.refinePlanLabel}</span>
                  <textarea
                    value={refinementInstruction}
                    onChange={(event) => setRefinementInstruction(event.target.value)}
                    rows={3}
                  />
                </label>
                <div className="quickEditRow">
                  {[
                    [text.quickCritical, text.quickCriticalInstruction],
                    [text.quickCourse, text.quickCourseInstruction],
                    [text.quickCompare, text.quickCompareInstruction],
                    [text.quickSimple, text.quickSimpleInstruction]
                  ].map(([label, instruction]) => (
                    <button className="secondaryButton compact" type="button" onClick={() => getPlans("refine", instruction)} disabled={busy} key={label}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="planRefineActions">
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("refine")} disabled={busy}>
                    {status === "plans" ? <Loader2 size={17} className="spin" /> : <RefreshCcw size={17} />}
                    {text.remakePlan}
                  </button>
                  <button className="secondaryButton compact" type="button" onClick={() => getPlans("mix")} disabled={busy || combinePlanIds.length < 2}>
                    <BookOpen size={17} />
                    {text.mixSelectedPlans}
                  </button>
                  <span>{text.plansToMix}: {combinePlanIds.length}{text.itemCount}</span>
                </div>
              </div>
            )}
            <div className="angleList">
              {plans.length === 0 ? (
                <div className="placeholderBlock">{text.planPlaceholder}</div>
              ) : (
                plans.map((plan) => (
                  <article className={plan.id === selectedPlanId ? "angleCard selected" : "angleCard"} key={plan.id}>
                    <label className="mixSelect">
                      <input type="checkbox" checked={combinePlanIds.includes(plan.id)} onChange={() => toggleCombinePlan(plan.id)} />
                      {text.mix}
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
                    <button className="secondaryButton compact" type="button" onClick={() => findReferencesAndContinue(plan)} disabled={status === "references"}>
                      {status === "references" && selectedPlanId === plan.id ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
                      {selectedOutputLanguage === "ja" ? "参考文献を探す" : "Find references"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
          )}
        </div>
        )}

        {activeStep === 4 && (
        <section className="referencesPane stepPage" aria-label="参考文献">
          <div className="sectionHeader">
            <Library size={18} />
            <h2>{selectedOutputLanguage === "ja" ? "4. 参考文献を選ぶ" : "4. Choose References"}</h2>
            {selectedPlan && <span className="selectedChip">{selectedPlan.title}</span>}
          </div>
          <div className="materialCheckBox">
            <div>
              <strong>{text.citationFormat}</strong>
              <p>{text.citationFormatHelp}</p>
            </div>
            <select
              value={citationStyle}
              onChange={(event) => {
                setCitationStyle(event.target.value as CitationStyle);
                setReferences([]);
                setReferencePages({});
                setSelectedReferenceIds([]);
              }}
            >
              <option value="apa7">APA 7</option>
              <option value="chicago">Chicago</option>
            </select>
          </div>
          <div className="notice safetyNotice">
            <p>{text.citationSafetyNotice}</p>
          </div>
          {copyNotice && <div className="copyNotice">{copyNotice}</div>}

          {status === "references" && (
            <div className="loadingBlock">
              <Loader2 size={24} className="spin" />
              <span>{text.referencesLoading}</span>
            </div>
          )}

          {(warnings.length > 0 || totalReviewed !== undefined) && (
            <div className="notice">
              {totalReviewed !== undefined && <p>{text.reviewedCandidates}: {totalReviewed}</p>}
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              {alternatives.length > 0 && <p>{text.searchKeywords}: {alternatives.join(", ")}</p>}
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
                      .map(citationText)
                      .join("\n\n"),
                    text.copiedSelectedCitations
                  )
                }
                disabled={selectedReferenceIds.length === 0}
              >
                <Clipboard size={16} />
                {text.selectedCitations}
              </button>
              <button
                className="secondaryButton compact"
                type="button"
                onClick={() =>
                  copyToClipboard(
                    references
                      .filter((reference) => selectedReferenceIds.includes(reference.id))
                      .map((reference) =>
                        copyReferenceSummary(
                          reference,
                          selectedOutputLanguage,
                          inTextCitationText(reference, referencePages[reference.id]),
                          citationUseText(reference, selectedOutputLanguage, referencePages[reference.id])
                        )
                      )
                      .join("\n\n---\n\n"),
                    text.copiedSelectedSummaries
                  )
                }
                disabled={selectedReferenceIds.length === 0}
              >
                <Clipboard size={16} />
                {text.selectedSummaries}
              </button>
            </div>
          )}

          <div className="referenceList">
            {references.length === 0 && status !== "references" ? (
              <div className="placeholderBlock">{text.referencesPlaceholder}</div>
            ) : (
              references.map((reference) => (
                <article className="referenceCard" key={reference.id}>
                  <div className="referenceTopline">
                    <span>{reference.sourceProvider}</span>
                    <span>{text.relevance} {reference.relevanceScore}%</span>
                  </div>
                  <div className="referenceMeta">
                    <span>{reference.year ?? "n.d."}</span>
                    <span>{reference.relevanceReason}</span>
                  </div>
                  <h3>{reference.title}</h3>
                  <label className="paperSelect">
                    <input type="checkbox" checked={selectedReferenceIds.includes(reference.id)} onChange={() => toggleReference(reference.id)} />
                    {text.useThisPaper}
                  </label>
                  <p className="authors">{reference.authors.join(", ")}</p>
                  <h4>{text.summary}</h4>
                  <p>{renderMathText(reference.abstractOrMetadataSummary)}</p>
                  <h4>{text.usePoint}</h4>
                  <p className="whyUseful">{renderMathText(reference.whyUseful)}</p>
                  {reference.citationStyle === "chicago" && hasPagePlaceholder(reference.inTextCitation) && (
                    <label className="citationPageField">
                      <span>{text.citationPage}</span>
                      <small>{text.citationPageHelp}</small>
                      <input
                        value={referencePages[reference.id] ?? ""}
                        onChange={(event) => {
                          setReferencePages((current) => ({ ...current, [reference.id]: event.target.value }));
                          setReportDraft(null);
                          clearRevisionFlow();
                        }}
                      />
                    </label>
                  )}
                  {reference.inTextCitation && (
                    <>
                      <h4>{text.inTextCitation}</h4>
                      <p className="whyUseful">{inTextCitationText(reference, referencePages[reference.id]) || text.citationPageMissing}</p>
                    </>
                  )}
                  {reference.citationUse && (
                    <>
                      <h4>{text.citationUse}</h4>
                      <p className="whyUseful">{citationUseText(reference, selectedOutputLanguage, referencePages[reference.id])}</p>
                    </>
                  )}
                  <div className="citationRow">
                    <code>{citationText(reference)}</code>
                    <button
                      className="iconButton"
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          copyText(
                            reference,
                            selectedOutputLanguage,
                            inTextCitationText(reference, referencePages[reference.id]),
                            citationUseText(reference, selectedOutputLanguage, referencePages[reference.id])
                          ),
                          text.copiedCitationSet
                        )
                      }
                      aria-label={text.citationOnly}
                      title={text.citationOnly}
                    >
                      <Clipboard size={16} />
                    </button>
                  </div>
                  <div className="referenceButtonRow">
                    <button className="secondaryButton compact" type="button" onClick={() => copyToClipboard(citationText(reference), text.copiedCitationOnly)}>
                      {text.citationOnly}
                    </button>
                    <button
                      className="secondaryButton compact"
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          copyReferenceSummary(
                            reference,
                            selectedOutputLanguage,
                            inTextCitationText(reference, referencePages[reference.id]),
                            citationUseText(reference, selectedOutputLanguage, referencePages[reference.id])
                          ),
                          text.copiedSelectedSummaries
                        )
                      }
                    >
                      {text.summaryOnly}
                    </button>
                  </div>
                  <a href={reference.doi ? `https://doi.org/${reference.doi}` : reference.url} target="_blank" rel="noreferrer">
                    {text.openPaper}
                  </a>
                </article>
              ))
            )}
          </div>
          <div className="stepActions">
            <button
              className="primaryButton"
              type="button"
              onClick={() => setActiveStep(5)}
              disabled={selectedReferenceIds.length === 0 && selectedPdfThemes().length === 0 && selectedContentPoints().length === 0}
            >
              <ArrowRight size={18} />
              {selectedOutputLanguage === "ja" ? "下書きを作成へ" : "Go to draft"}
            </button>
          </div>
        </section>
        )}

        {activeStep === 5 && selectedPlan && (references.length > 0 || selectedPdfThemes().length > 0 || selectedContentPoints().length > 0) && (
          <section className="outlinePane stepPage" aria-label="構成案">
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
            <div className="notice safetyNotice">
              <p>{text.draftSafetyNotice}</p>
            </div>
            <div className="materialCheckBox">
              <div>
                <strong>{text.citationFormat}</strong>
                <p>{text.citationFormatHelp}</p>
              </div>
              <select
                value={citationStyle}
                onChange={(event) => {
                  setCitationStyle(event.target.value as CitationStyle);
                  setReferences([]);
                  setReferencePages({});
                  setSelectedReferenceIds([]);
                  setReportOutline(null);
                  setReportDraft(null);
                  clearRevisionFlow();
                  setActiveStep(4);
                }}
              >
                <option value="apa7">APA 7</option>
                <option value="chicago">Chicago</option>
              </select>
            </div>
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
                  <div className="feedbackBox">
                    <span>{text.draftFeedbackQuestion}</span>
                    <button
                      className="secondaryButton compact"
                      type="button"
                      onClick={() => {
                        trackUsage("draft_feedback_submitted", {
                          rating: "good",
                          outputLanguage: selectedOutputLanguage,
                          hasReferences: selectedReferenceIds.length > 0,
                          hasPdfThemes: selectedPdfThemes().length > 0,
                          wordCountEstimate: reportDraft.wordCountEstimate
                        });
                        setCopyNotice(text.draftFeedbackThanks);
                      }}
                    >
                      {text.draftFeedbackGood}
                    </button>
                    <button
                      className="secondaryButton compact"
                      type="button"
                      onClick={() => {
                        trackUsage("draft_feedback_submitted", {
                          rating: "needs_work",
                          outputLanguage: selectedOutputLanguage,
                          hasReferences: selectedReferenceIds.length > 0,
                          hasPdfThemes: selectedPdfThemes().length > 0,
                          wordCountEstimate: reportDraft.wordCountEstimate
                        });
                        setCopyNotice(text.draftFeedbackThanks);
                      }}
                    >
                      {text.draftFeedbackNeedsWork}
                    </button>
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
