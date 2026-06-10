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
  verifiedMetadata: true;
};

export type ReferenceSearchResult = {
  references: ReferenceItem[];
  warnings: string[];
  alternativeKeywords: string[];
  refinementSuggestions: string[];
  totalCandidatesReviewed: number;
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
