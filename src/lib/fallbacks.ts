import type { InterviewAnswer, LibrarianQuestion, PdfInsightResult, PdfTheme, ReferenceItem, ReportOutline, ThemeCandidate } from "./types";

export function fallbackLibrarianQuestions(topic: string, outputLanguage: "ja" | "en"): LibrarianQuestion[] {
  const ja = outputLanguage === "ja";

  return [
    {
      id: "purpose",
      type: "choice",
      label: ja ? "レポートで一番重視したいことは何ですか？" : "What should this report prioritize?",
      helpText: ja ? "論文探しの軸を決めます。" : "This sets the search direction.",
      options: ja
        ? ["現状整理", "賛否比較", "原因分析", "解決策・提案", "事例比較", "その他"]
        : ["Background overview", "Compare arguments", "Causal analysis", "Solutions", "Case comparison", "Other"],
      required: true
    },
    {
      id: "related-topic",
      type: "choice",
      label: ja ? "他のトピックと関連させますか？" : "Do you want to connect it with another topic?",
      helpText: ja ? "はいの場合、次の欄に関連トピックを書いてください。" : "If yes, describe the related topic in the next field.",
      options: ja ? ["はい", "いいえ", "まだ分からない"] : ["Yes", "No", "Not sure yet"],
      required: true
    },
    {
      id: "related-topic-detail",
      type: "text",
      label: ja ? "関連させたいトピックがあれば書いてください。" : "Describe the related topic, if any.",
      helpText: ja ? "例: 地方大学、著作権、就職活動、気候変動など。" : "Examples: regional universities, copyright, job hunting, climate change.",
      required: false
    },
    {
      id: "scope",
      type: "choice",
      label: ja ? "対象範囲はどれに近いですか？" : "What scope feels closest?",
      helpText: ja ? "広すぎるテーマをレポート向けに絞ります。" : "This narrows a broad idea into a report-sized frame.",
      options: ja
        ? ["日本中心", "海外中心", "日英比較", "大学生中心", "政策・制度中心"]
        : ["Japan-focused", "International", "Japan-English comparison", "Students", "Policy/institutions"],
      required: true
    },
    {
      id: "interest",
      type: "text",
      label: ja ? "特に気になる点を一文で書いてください。" : "Write one sentence about what interests you most.",
      helpText: ja ? `例: ${topic}が学生の学び方をどう変えるか知りたい。` : `Example: I want to know how ${topic} changes student learning.`,
      required: false
    }
  ];
}

export function fallbackThemeCandidates(topic: string, outputLanguage: "ja" | "en", answers: InterviewAnswer[] = [], pdfThemes: PdfTheme[] = []): ThemeCandidate[] {
  const ja = outputLanguage === "ja";
  const answerText = answers.map((item) => `${item.question}: ${item.answer}`).join(" / ");
  const related = answers.find((answer) => answer.questionId === "related-topic-detail")?.answer || pdfThemes[0]?.title || topic;
  const jaKeywords = [topic, related, "大学", "学生", "研究"].filter(Boolean);
  const enKeywords = [topic, related, "university", "students", "research"].filter(Boolean);

  return [
    {
      id: "plan-1",
      title: ja ? "背景整理から問題提起につなげるプラン" : "Background-to-problem framing",
      researchQuestion: ja ? `${topic}は大学生や大学教育にどのような課題を生んでいるのか。` : `What problems does ${topic} create for students or higher education?`,
      keywordsJa: jaKeywords,
      keywordsEn: enKeywords,
      reason: ja ? "漠然としたテーマを、現状、先行研究、課題の順に整理できます。" : "Turns a broad idea into a clear sequence: context, prior work, problem.",
      thesisHint: ja ? `${topic}の影響を整理し、大学で対応すべき課題を示す。` : `Map the impact of ${topic} and identify what universities should address.`,
      outline: ja ? ["背景", "先行研究の整理", "主要な課題", "考察"] : ["Background", "Prior research", "Key issues", "Discussion"],
      paperStrategy: ja ? "レビュー論文、教育研究、政策資料を優先します。" : "Prioritize review papers, education studies, and policy-oriented sources."
    },
    {
      id: "plan-2",
      title: ja ? "賛否を比較して自分の立場を作るプラン" : "Argument comparison plan",
      researchQuestion: ja ? `${topic}の利点とリスクは、どの条件で変わるのか。` : `Under what conditions do the benefits and risks of ${topic} change?`,
      keywordsJa: [topic, related, "利点", "リスク", "評価"].filter(Boolean),
      keywordsEn: [topic, related, "benefits", "risks", "evaluation"].filter(Boolean),
      reason: ja ? "肯定・否定の両方の文献を使い、結論を作りやすい構成です。" : "Uses both supportive and critical literature to build a defensible position.",
      thesisHint: ja ? `利点を認めつつ、リスクを下げる条件を提案する。` : "Acknowledge benefits while proposing conditions that reduce risk.",
      outline: ja ? ["利点", "リスク", "比較基準", "自分の主張"] : ["Benefits", "Risks", "Comparison criteria", "Your position"],
      paperStrategy: ja ? "実証研究、批判的研究、ガイドライン系文献を混ぜます。" : "Mix empirical studies, critical work, and guideline-style sources."
    },
    {
      id: "plan-3",
      title: ja ? "関連トピックと結びつけるプラン" : "Connected-topic plan",
      researchQuestion: ja ? `${topic}は${related}と結びつくことで、どんな新しい論点を生むのか。` : `What new issues appear when ${topic} is connected with ${related}?`,
      keywordsJa: [topic, related, "関連", "影響", "事例"].filter(Boolean),
      keywordsEn: [topic, related, "relationship", "impact", "case study"].filter(Boolean),
      reason: ja ? "ユーザーの関心を反映し、独自性のある枠組みにできます。" : "Reflects the student's interest and creates a more original frame.",
      thesisHint: ja ? `${topic}を単独で扱わず、${related}との関係から考察する。` : `Analyze ${topic} through its relationship with ${related}.`,
      outline: ja ? ["関連づける理由", "両分野の先行研究", "接点の分析", "結論"] : ["Why connect them", "Prior work in both areas", "Point of connection", "Conclusion"],
      paperStrategy: ja ? "2つのキーワード群を組み合わせ、分野横断の文献を探します。" : "Combine keyword groups to find cross-disciplinary sources."
    },
    {
      id: "plan-4",
      title: ja ? "提案型レポートにするプラン" : "Recommendation report plan",
      researchQuestion: ja ? `${topic}について、大学や社会はどのような対応を取るべきか。` : `What should universities or society do about ${topic}?`,
      keywordsJa: [topic, related, "政策", "実践", "ガイドライン"].filter(Boolean),
      keywordsEn: [topic, related, "policy", "practice", "guidelines"].filter(Boolean),
      reason: ja ? "最後に具体的な提案を置けるため、レポートとしてまとまりやすいです。" : "Ends with concrete recommendations, which makes the paper easier to organize.",
      thesisHint: ja ? `先行研究に基づき、実行可能な対応策を提案する。` : "Use prior research to propose feasible responses.",
      outline: ja ? ["課題の特定", "既存の対応", "改善案", "限界"] : ["Problem", "Existing responses", "Recommendations", "Limitations"],
      paperStrategy: ja ? "政策研究、大学実践、レビュー論文を重視します。" : "Prioritize policy research, institutional practice, and review papers."
    }
  ].map((plan) => ({
    ...plan,
    reason: [plan.reason, answerText ? `${ja ? "回答内容" : "Answers"}: ${answerText}` : "", pdfThemes.length ? `${ja ? "PDF論点" : "PDF themes"}: ${pdfThemes.map((theme) => theme.title).join(", ")}` : ""]
      .filter(Boolean)
      .join(" ")
  }));
}

export function fallbackPdfInsights(pdfText: string, outputLanguage: "ja" | "en"): PdfInsightResult {
  const ja = outputLanguage === "ja";
  const words = pdfText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4);
  const topWords = [...new Set(words)].slice(0, 18);
  const makeTheme = (index: number, title: string): PdfTheme => ({
    id: `pdf-theme-${index + 1}`,
    title,
    summary: ja
      ? "PDF本文から抽出した重要そうな論点です。OpenAI APIキーを設定すると、より自然な要約になります。"
      : "A potentially important theme extracted from the PDF text. Set an OpenAI API key for a richer summary.",
    keywords: topWords.slice(index * 3, index * 3 + 5),
    evidence: pdfText.slice(index * 220, index * 220 + 220).replace(/\s+/g, " ").trim()
  });

  return {
    documentTitle: ja ? "アップロードされたPDF" : "Uploaded PDF",
    summary: ja
      ? `PDFから約${pdfText.length.toLocaleString()}文字を読み取りました。重要テーマ候補を選んでレポートプランに組み込めます。`
      : `Read about ${pdfText.length.toLocaleString()} characters from the PDF. Select themes to include them in the report plan.`,
    themes: [
      makeTheme(0, ja ? "中心概念と背景" : "Core concept and background"),
      makeTheme(1, ja ? "主要な問題設定" : "Main problem framing"),
      makeTheme(2, ja ? "方法・事例・証拠" : "Methods, cases, or evidence"),
      makeTheme(3, ja ? "示唆と今後の課題" : "Implications and future issues")
    ]
  };
}

export function fallbackReportOutline(
  plan: ThemeCandidate,
  references: ReferenceItem[],
  pdfThemes: PdfTheme[],
  outputLanguage: "ja" | "en"
): ReportOutline {
  const ja = outputLanguage === "ja";
  const paperIds = references.map((reference) => reference.id);

  return {
    title: plan.title,
    thesis: plan.thesisHint,
    selectedPdfThemes: pdfThemes.map((theme) => theme.id),
    selectedPaperIds: paperIds,
    sections: [
      {
        title: ja ? "1. 問題意識と背景" : "1. Problem and background",
        purpose: ja ? "テーマの背景とレポートで扱う範囲を示す。" : "Introduce the background and scope.",
        keyPoints: [plan.researchQuestion, ...pdfThemes.slice(0, 1).map((theme) => theme.summary)],
        paperIds: paperIds.slice(0, 2)
      },
      {
        title: ja ? "2. 先行研究の整理" : "2. Prior research",
        purpose: ja ? "選択した論文を使って、既存研究の流れを整理する。" : "Use selected papers to map the literature.",
        keyPoints: references.slice(0, 3).map((reference) => reference.abstractOrMetadataSummary),
        paperIds: paperIds.slice(0, 4)
      },
      {
        title: ja ? "3. PDFから得た論点の組み込み" : "3. Integrating PDF themes",
        purpose: ja ? "PDFから選んだ抜粋をレポートの内容要素として使う。" : "Use selected PDF themes as report content elements.",
        keyPoints: pdfThemes.map((theme) => `${theme.title}: ${theme.summary}`),
        paperIds: paperIds.slice(2, 5)
      },
      {
        title: ja ? "4. 考察と結論" : "4. Discussion and conclusion",
        purpose: ja ? "問いへの暫定的な答えと限界をまとめる。" : "Answer the research question and note limitations.",
        keyPoints: [plan.thesisHint, plan.paperStrategy],
        paperIds: paperIds.slice(0, 6)
      }
    ],
    nextSteps: ja
      ? ["選択論文の本文または抄録を確認する", "引用形式を授業指定に合わせる", "反対意見を補う論文を1本追加する"]
      : ["Check the abstracts or full text of selected papers", "Adjust citation style to course requirements", "Add one paper with a contrasting view"]
  };
}

export function fallbackSummary(reference: ReferenceItem, outputLanguage: "ja" | "en"): Pick<ReferenceItem, "abstractOrMetadataSummary" | "whyUseful"> {
  if (reference.abstract) {
    return {
      abstractOrMetadataSummary:
        outputLanguage === "ja"
          ? `抄録に基づく概要: ${reference.abstract.slice(0, 320)}${reference.abstract.length > 320 ? "..." : ""}`
          : `Abstract-based summary: ${reference.abstract.slice(0, 320)}${reference.abstract.length > 320 ? "..." : ""}`,
      whyUseful:
        outputLanguage === "ja"
          ? "研究目的、方法、結果の手がかりがあり、レポートの根拠として検討できます。"
          : "It includes enough abstract detail to evaluate whether it can support the report argument."
    };
  }

  return {
    abstractOrMetadataSummary:
      outputLanguage === "ja"
        ? `メタデータからの概要: ${reference.year ?? "年不明"}年の${reference.sourceName ?? "学術資料"}に掲載された文献です。本文内容は未確認です。`
        : `Metadata-based summary: This is a ${reference.year ?? "date unknown"} work from ${reference.sourceName ?? "an academic source"}. Full text was not inspected.`,
    whyUseful:
      outputLanguage === "ja"
        ? "タイトル、著者、掲載情報から関連性を確認できる候補です。本文または抄録を開いて採用判断してください。"
        : "Use it as a candidate source after opening the record and checking the abstract or full text."
  };
}
