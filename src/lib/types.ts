export type OutputLanguage = "ja" | "en" | "auto";

export type LibrarianQuestion = {
  id: string;
  type: "choice" | "text";
  label: string;
  helpText: string;
  options?: string[];
  required: boolean;
};

export type InterviewAnswer = {
  questionId: string;
  question: string;
  answer: string;
};

export type PdfTheme = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  evidence: string;
};

export type PdfInsightResult = {
  documentTitle: string;
  summary: string;
  themes: PdfTheme[];
};

export type AssignmentDetails = {
  assignmentPrompt: string;
  userOpinion: string;
  mustInclude: string;
  reportPreferences: string[];
  materialNotes: string;
};

export type MaterialQuestion = {
  id: string;
  type: "choice" | "text";
  label: string;
  helpText: string;
  options: string[];
};

export type MaterialSuggestion = {
  id: string;
  title: string;
  description: string;
  preferenceFit: string;
  keywordsJa: string[];
  keywordsEn: string[];
};

export type MaterialQualityCheck = {
  score: number;
  verdict: string;
  weaknesses: string[];
  questions: MaterialQuestion[];
  suggestions: MaterialSuggestion[];
  recommendedPreferences: string[];
};

export type ContentPoint = {
  id: string;
  title: string;
  description: string;
  type: "background" | "argument" | "case" | "theory" | "evidence" | "counterargument" | "policy" | "pdf" | "custom";
  keywordsJa: string[];
  keywordsEn: string[];
  source: "ai" | "pdf" | "user";
};

export type ThemeCandidate = {
  id: string;
  title: string;
  researchQuestion: string;
  keywordsJa: string[];
  keywordsEn: string[];
  reason: string;
  thesisHint: string;
  outline: string[];
  paperStrategy: string;
  contentPointIds: string[];
};

export type ReferenceItem = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  sourceName?: string;
  doi?: string;
  url?: string;
  language?: string;
  abstract?: string;
  abstractOrMetadataSummary: string;
  whyUseful: string;
  apa7: string;
  sourceProvider: string;
  citationCount?: number;
  relevanceScore: number;
  relevanceReason: string;
  verifiedMetadata: true;
};

export type ReferenceSearchResult = {
  references: ReferenceItem[];
  warnings: string[];
  alternativeKeywords: string[];
  refinementSuggestions: string[];
  totalCandidatesReviewed: number;
};

export type ReportSection = {
  title: string;
  purpose: string;
  keyPoints: string[];
  paperIds: string[];
};

export type ReportOutline = {
  title: string;
  thesis: string;
  sections: ReportSection[];
  selectedPdfThemes: string[];
  selectedContentPointIds: string[];
  selectedPaperIds: string[];
  nextSteps: string[];
};

export type ReportDraftOptions = {
  targetWordCount: number;
  languageLevel: "high" | "middle" | "low";
  writingStyle: "standard" | "academic";
  humanLike: boolean;
  otherConditions: string;
};

export type ReportDraft = {
  title: string;
  draft: string;
  wordCountEstimate: number;
  languageLevel: "high" | "middle" | "low";
  humanLike: boolean;
  notes: string[];
  bibliography: string[];
};

export type PersonalizationPoint = {
  id: string;
  title: string;
  issue: string;
  suggestion: string;
  category: "opinion" | "course" | "evidence" | "example" | "counterargument" | "structure" | "clarity" | "other";
  priority: "high" | "medium" | "low";
};

export type PersonalizationCheck = {
  summary: string;
  points: PersonalizationPoint[];
};

export type RevisedReportDraft = ReportDraft & {
  appliedImprovementIds: string[];
  customImprovements: string[];
};

export type ProviderPaper = {
  title: string;
  authors: string[];
  year?: number;
  sourceName?: string;
  doi?: string;
  url?: string;
  language?: string;
  abstract?: string;
  citationCount?: number;
  provider: string;
};
