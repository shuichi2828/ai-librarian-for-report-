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

function isJa(outputLanguage: "ja" | "en") {
  return outputLanguage === "ja";
}

function wordsFrom(text: string) {
  return text
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3)
    .slice(0, 8);
}

export function fallbackLibrarianQuestions(topic: string, outputLanguage: "ja" | "en"): LibrarianQuestion[] {
  const ja = isJa(outputLanguage);

  return [
    {
      id: "purpose",
      type: "choice",
      label: ja ? "このレポートで一番重視したいことは何ですか？" : "What should this report prioritize?",
      helpText: ja ? "ここで選ぶと、探す論文やプランの方向が決まります。" : "This sets the search direction.",
      options: ja ? ["背景整理", "賛否比較", "原因分析", "解決策", "事例比較", "その他"] : ["Background overview", "Compare arguments", "Causal analysis", "Solutions", "Case comparison", "Other"],
      required: true
    },
    {
      id: "related-topic",
      type: "choice",
      label: ja ? "別のテーマと関連づけたいですか？" : "Do you want to connect it with another topic?",
      helpText: ja ? "関連づけたい場合は、次の欄にテーマを書いてください。" : "If yes, describe the related topic in the next field.",
      options: ja ? ["はい", "いいえ", "まだ分からない"] : ["Yes", "No", "Not sure yet"],
      required: true
    },
    {
      id: "related-topic-detail",
      type: "text",
      label: ja ? "関連づけたいテーマがあれば書いてください。" : "Describe the related topic, if any.",
      helpText: ja ? "レポートで扱う対象を短く書いてください。" : "Briefly write the subject your report will cover.",
      required: false
    },
    {
      id: "scope",
      type: "choice",
      label: ja ? "対象範囲はどれに近いですか？" : "What scope feels closest?",
      helpText: ja ? "広すぎるテーマを、レポートで扱える大きさに絞ります。" : "This narrows a broad idea into a report-sized frame.",
      options: ja ? ["日本中心", "海外中心", "日英比較", "大学生中心", "政策・制度中心"] : ["Japan-focused", "International", "Japan-English comparison", "Students", "Policy/institutions"],
      required: true
    },
    {
      id: "interest",
      type: "text",
      label: ja ? "特に気になる点を一文で書いてください。" : "Write one sentence about what interests you most.",
      helpText: ja ? "知りたいことや考えたい方向を短く書いてください。" : "Briefly write what you want to explore.",
      required: false
    }
  ];
}

export function fallbackContentPoints(topic: string, details: AssignmentDetails, pdfThemes: PdfTheme[], outputLanguage: "ja" | "en"): ContentPoint[] {
  const ja = isJa(outputLanguage);
  const base: ContentPoint[] = [
    {
      id: "point-background",
      title: ja ? "背景と現状" : "Background and current situation",
      description: ja ? `${topic}がなぜレポートの論点になるのかを整理します。` : `Explain why ${topic} matters as a report topic.`,
      type: "background",
      keywordsJa: [topic, "背景", "現状"],
      keywordsEn: [topic, "background", "current situation"],
      source: "ai"
    },
    {
      id: "point-main-argument",
      title: ja ? "自分の主張を支える根拠" : "Point supporting your claim",
      description: details.userOpinion || (ja ? "自分の立場を支える根拠を組み込みます。" : "Include evidence that supports your tentative position."),
      type: "argument",
      keywordsJa: [topic, "主張", "根拠"],
      keywordsEn: [topic, "argument", "evidence"],
      source: "user"
    },
    {
      id: "point-counterargument",
      title: ja ? "反対意見や限界" : "Counterargument or limitation",
      description: ja ? "一方的なレポートにならないよう、反対意見や限界を入れます。" : "Add a counterargument or limitation so the report is not one-sided.",
      type: "counterargument",
      keywordsJa: [topic, "反対意見", "限界"],
      keywordsEn: [topic, "counterargument", "limitations"],
      source: "ai"
    },
    {
      id: "point-policy",
      title: ja ? "制度・実践への提案" : "Policy or practice angle",
      description: ja ? "大学や社会がどのように対応すべきかを考える材料にします。" : "Use this to discuss how universities or society should respond.",
      type: "policy",
      keywordsJa: [topic, "制度", "提案"],
      keywordsEn: [topic, "policy", "practice"],
      source: "ai"
    },
    {
      id: "point-case",
      title: ja ? "具体例・事例" : "Concrete case or example",
      description: ja ? "抽象論だけでなく、具体的な事例を入れて説明しやすくします。" : "Include a concrete case so the report does not stay too abstract.",
      type: "case",
      keywordsJa: [topic, "事例", "大学"],
      keywordsEn: [topic, "case study", "university"],
      source: "ai"
    }
  ];

  const mustInclude = details.mustInclude
    .split(/[,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map<ContentPoint>((item, index) => ({
      id: `point-must-${index + 1}`,
      title: item,
      description: ja ? "ユーザーがレポートに含めたい内容です。" : "Content the user wants to include in the report.",
      type: "custom",
      keywordsJa: [topic, item],
      keywordsEn: [topic, item],
      source: "user"
    }));

  const preferencePoints = (details.reportPreferences ?? []).slice(0, 4).map<ContentPoint>((preference, index) => ({
    id: `point-preference-${index + 1}`,
    title: preference,
    description: ja ? "レポートの好みに合わせて、論点や根拠の出し方を調整します。" : "Use this preference to shape the argument and evidence style.",
    type: "custom",
    keywordsJa: [topic, preference],
    keywordsEn: [topic, preference],
    source: "user"
  }));

  const pdfPoints = pdfThemes.slice(0, 4).map<ContentPoint>((theme) => ({
    id: `point-${theme.id}`,
    title: theme.title,
    description: theme.summary,
    type: "pdf",
    keywordsJa: theme.keywords,
    keywordsEn: theme.keywords,
    source: "pdf"
  }));

  return [...base, ...mustInclude, ...preferencePoints, ...pdfPoints].slice(0, 12);
}

export function fallbackMaterialQualityCheck(topic: string, details: AssignmentDetails, outputLanguage: "ja" | "en", pdfThemes: PdfTheme[] = []): MaterialQualityCheck {
  const ja = isJa(outputLanguage);
  const score =
    15 +
    Math.min(25, details.assignmentPrompt.trim().length / 10) +
    Math.min(25, details.mustInclude.trim().length / 9) +
    Math.min(15, pdfThemes.length * 5) +
    Math.min(10, (details.reportPreferences ?? []).length * 3) +
    Math.min(10, details.materialNotes.trim().length / 14);

  return {
    score: Math.round(Math.min(95, score)),
    verdict: ja ? "使い始められる材料はあります。対象範囲、使う根拠、授業内容とのつながりを足すと、プランがさらに作りやすくなります。" : "The material can be used, but narrowing the scope, evidence, and course connection will make the plans sharper.",
    weaknesses: ja ? ["対象範囲がまだ広い可能性があります。", "どの根拠を中心に使うかをもう少し選べます。", "授業内容や具体例を足すと説得力が上がります。"] : ["Target scope may still be broad.", "The central evidence could be selected more clearly.", "Course concepts or concrete examples may be missing."],
    questions: [
      {
        id: "target",
        type: "choice",
        label: ja ? "主な対象は誰・何にしますか？" : "Who or what should the report focus on?",
        helpText: ja ? "対象を絞るとレポートの範囲が扱いやすくなります。" : "Pick the target that makes the topic report-sized.",
        options: ja ? ["学生", "教員", "大学の制度", "授業実践", "社会全体", "その他"] : ["Students", "Teachers", "University policy", "Classroom practice", "Society", "Other"]
      },
      {
        id: "stance",
        type: "choice",
        label: ja ? "中心に使いたい根拠はどれですか？" : "Which evidence should be central?",
        helpText: ja ? "PDF・授業内容・論文検索のどれを重視するか決めます。" : "Choose whether PDFs, class material, or paper search should lead.",
        options: ja ? ["PDFの内容", "授業内容", "論文引用", "自分の経験", "比較しながら決めたい"] : ["PDF content", "Course content", "Paper citations", "Personal experience", "Compare first"]
      },
      {
        id: "course-keyword",
        type: "text",
        label: ja ? "課題と一番つなげたいキーワードを1つ足してください。" : "Add one keyword that should connect the report to the assignment.",
        helpText: ja ? "授業内容・PDFテーマ・使いたい概念のどれでも大丈夫です。" : "This can be a course idea, PDF theme, or concept.",
        options: []
      }
    ],
    suggestions: [
      {
        id: "material-course",
        title: ja ? "授業内容との接続" : "Course content focus",
        description: ja ? "授業で扱った概念、課題内容の語句、授業内の議論とつなげます。" : "Connect the report to course concepts, assignment wording, or class discussion.",
        preferenceFit: ja ? "授業に沿ったレポートに向いています。" : "Good for course-focused reports.",
        keywordsJa: [topic, "授業", "課題"],
        keywordsEn: [topic, "course", "assignment"]
      },
      {
        id: "material-evidence",
        title: ja ? "論文引用を中心にする" : "Paper citation focus",
        description: ja ? "選んだ論文が支えられること・支えられないことを中心に整理します。" : "Make the report center on what selected papers can and cannot support.",
        preferenceFit: ja ? "引用を多めに使いたい場合に向いています。" : "Good for citation-heavy reports.",
        keywordsJa: [topic, "根拠", "先行研究"],
        keywordsEn: [topic, "evidence", "literature"]
      },
      {
        id: "material-objective",
        title: ja ? "客観的事実を増やす" : "Objective facts focus",
        description: ja ? "データ、制度文書、確認できる事実を先に置いてから意見につなげます。" : "Use data, policy documents, and verified facts before giving an opinion.",
        preferenceFit: ja ? "事実ベースで書きたい場合に向いています。" : "Good for fact-based reports.",
        keywordsJa: [topic, "データ", "制度"],
        keywordsEn: [topic, "data", "policy"]
      },
      {
        id: "material-experience",
        title: ja ? "自分の経験とつなげる" : "Personal experience connection",
        description: ja ? "授業経験や学生目線を入り口にし、論文で支える形にします。" : "Use a class experience or student perspective as the entry point, then support it with papers.",
        preferenceFit: ja ? "個人の考察が許される課題に向いています。" : "Good when personal reflection is allowed.",
        keywordsJa: [topic, "学生経験", "考察"],
        keywordsEn: [topic, "student experience", "reflection"]
      }
    ],
    recommendedPreferences: ja ? ["授業内容とのつながりを重視する", "論文引用を重視する"] : ["Course content focused", "Paper citation focused"]
  };
}

export function fallbackThemeCandidates(
  topic: string,
  outputLanguage: "ja" | "en",
  answers: InterviewAnswer[] = [],
  pdfThemes: PdfTheme[] = [],
  contentPoints: ContentPoint[] = []
): ThemeCandidate[] {
  const ja = isJa(outputLanguage);
  const answerText = answers.map((item) => `${item.question}: ${item.answer}`).join(" / ");
  const related = answers.find((answer) => answer.questionId === "related-topic-detail")?.answer || pdfThemes[0]?.title || topic;
  const contentIds = contentPoints.slice(0, 6).map((point) => point.id);
  const suffix = [answerText ? `${ja ? "回答内容" : "Answers"}: ${answerText}` : "", pdfThemes.length ? `${ja ? "PDFテーマ" : "PDF themes"}: ${pdfThemes.map((theme) => theme.title).join(", ")}` : ""].filter(Boolean).join(" ");

  return [
    {
      id: "plan-1",
      title: ja ? "背景から問題提起につなげるプラン" : "Background-to-problem framing",
      researchQuestion: ja ? `${topic}は大学や学生にどのような課題を生んでいるのか。` : `What problems does ${topic} create for students or higher education?`,
      keywordsJa: [topic, related, "大学", "学生", "課題"].filter(Boolean),
      keywordsEn: [topic, related, "university", "students", "issue"].filter(Boolean),
      reason: ja ? `現状、先行研究、問題点の順に整理しやすいプランです。${suffix}` : `Turns a broad idea into context, prior work, and problem. ${suffix}`,
      thesisHint: ja ? `${topic}の影響を整理し、大学が対応すべき課題を示す。` : `Map the impact of ${topic} and identify what universities should address.`,
      outline: ja ? ["背景", "先行研究", "主な課題", "考察"] : ["Background", "Prior research", "Key issues", "Discussion"],
      paperStrategy: ja ? "レビュー論文、教育研究、制度・実践に関する資料を優先します。" : "Prioritize review papers, education studies, and policy-oriented sources.",
      contentPointIds: contentIds
    },
    {
      id: "plan-2",
      title: ja ? "賛否を比較して立場を作るプラン" : "Argument comparison plan",
      researchQuestion: ja ? `${topic}の利点とリスクは、どの条件で変わるのか。` : `Under what conditions do the benefits and risks of ${topic} change?`,
      keywordsJa: [topic, related, "利点", "リスク", "比較"].filter(Boolean),
      keywordsEn: [topic, related, "benefits", "risks", "comparison"].filter(Boolean),
      reason: ja ? "賛成・反対の根拠を並べ、自分の立場を作りやすいプランです。" : "Uses supportive and critical literature to build a defensible position.",
      thesisHint: ja ? "利点を認めつつ、リスクを下げる条件を提案する。" : "Acknowledge benefits while proposing conditions that reduce risk.",
      outline: ja ? ["利点", "リスク", "比較基準", "自分の立場"] : ["Benefits", "Risks", "Comparison criteria", "Your position"],
      paperStrategy: ja ? "実証研究、批判的研究、ガイドライン系文献を混ぜて探します。" : "Mix empirical studies, critical work, and guideline-style sources.",
      contentPointIds: contentIds
    },
    {
      id: "plan-3",
      title: ja ? "関連テーマと結びつけるプラン" : "Connected-topic plan",
      researchQuestion: ja ? `${topic}を${related}と結びつけると、どのような新しい論点が見えるのか。` : `What new issues appear when ${topic} is connected with ${related}?`,
      keywordsJa: [topic, related, "関連", "影響", "事例"].filter(Boolean),
      keywordsEn: [topic, related, "relationship", "impact", "case study"].filter(Boolean),
      reason: ja ? "自分の関心を反映し、独自性のある構成にしやすいプランです。" : "Reflects the student's interest and creates a more original frame.",
      thesisHint: ja ? `${topic}を単独ではなく、${related}との関係から考察する。` : `Analyze ${topic} through its relationship with ${related}.`,
      outline: ja ? ["結びつける理由", "両分野の先行研究", "接点の分析", "結論"] : ["Why connect them", "Prior work in both areas", "Point of connection", "Conclusion"],
      paperStrategy: ja ? "2つのキーワード群を組み合わせ、横断的な文献を探します。" : "Combine keyword groups to find cross-disciplinary sources.",
      contentPointIds: contentIds
    },
    {
      id: "plan-4",
      title: ja ? "改善策まで提案するプラン" : "Recommendation report plan",
      researchQuestion: ja ? `${topic}について、大学や社会はどのように対応すべきか。` : `What should universities or society do about ${topic}?`,
      keywordsJa: [topic, related, "政策", "実践", "ガイドライン"].filter(Boolean),
      keywordsEn: [topic, related, "policy", "practice", "guidelines"].filter(Boolean),
      reason: ja ? "最後に具体的な提案を置けるため、レポートとしてまとまりやすいプランです。" : "Ends with concrete recommendations, which makes the paper easier to organize.",
      thesisHint: ja ? "先行研究に基づき、実行可能な対応策を提案する。" : "Use prior research to propose feasible responses.",
      outline: ja ? ["問題の特定", "既存の対応", "改善提案", "限界"] : ["Problem", "Existing responses", "Recommendations", "Limitations"],
      paperStrategy: ja ? "政策研究、大学実践、レビュー論文を重視します。" : "Prioritize policy research, institutional practice, and review papers.",
      contentPointIds: contentIds
    }
  ];
}

export function fallbackPdfInsights(pdfText: string, outputLanguage: "ja" | "en"): PdfInsightResult {
  const ja = isJa(outputLanguage);
  const topWords = wordsFrom(pdfText);
  const makeTheme = (index: number, title: string): PdfTheme => ({
    id: `pdf-theme-${index}`,
    title,
    summary: ja ? "PDF本文から確認できる範囲で、レポートの材料になりそうな論点です。" : "A report-worthy point identified from the readable PDF text.",
    keywords: topWords.slice(index, index + 4).length ? topWords.slice(index, index + 4) : ja ? ["PDF", "資料", "論点"] : ["PDF", "source", "theme"],
    evidence: pdfText.slice(index * 160, index * 160 + 220)
  });

  return {
    documentTitle: ja ? "アップロードPDFの要約" : "Uploaded PDF summary",
    summary: ja ? "PDFから読み取れたテキストをもとに、主要な論点を抽出しました。必要に応じて本文の該当箇所を確認してください。" : "Key themes were extracted from the readable text. Check the original PDF passages before citing them.",
    themes: [
      makeTheme(0, ja ? "中心テーマ" : "Main theme"),
      makeTheme(1, ja ? "背景と問題点" : "Background and problem"),
      makeTheme(2, ja ? "方法・事例・根拠" : "Methods, cases, or evidence"),
      makeTheme(3, ja ? "示唆と今後の課題" : "Implications and future issues")
    ]
  };
}

export function fallbackReportOutline(
  plan: ThemeCandidate,
  references: ReferenceItem[],
  pdfThemes: PdfTheme[],
  contentPoints: ContentPoint[],
  outputLanguage: "ja" | "en"
): ReportOutline {
  const ja = isJa(outputLanguage);
  const paperIds = references.map((reference) => reference.id);

  return {
    title: plan.title,
    thesis: plan.thesisHint,
    selectedPdfThemes: pdfThemes.map((theme) => theme.id),
    selectedContentPointIds: contentPoints.map((point) => point.id),
    selectedPaperIds: paperIds,
    sections: [
      {
        title: ja ? "1. 問題意識と背景" : "1. Problem and background",
        purpose: ja ? "テーマの背景と、レポートで扱う範囲を示します。" : "Introduce the background and scope.",
        keyPoints: [plan.researchQuestion, ...contentPoints.slice(0, 2).map((point) => point.description), ...pdfThemes.slice(0, 1).map((theme) => theme.summary)],
        paperIds: paperIds.slice(0, 2)
      },
      {
        title: ja ? "2. 先行研究の整理" : "2. Prior research",
        purpose: ja ? "選択した論文を使って、研究や議論の流れを整理します。" : "Use selected papers to map the literature.",
        keyPoints: references.slice(0, 3).map((reference) => reference.abstractOrMetadataSummary),
        paperIds: paperIds.slice(0, 4)
      },
      {
        title: ja ? "3. PDF・内容候補の組み込み" : "3. Integrating PDF and content points",
        purpose: ja ? "PDFや自分で選んだ内容候補を、本文の論点として使います。" : "Use selected PDF themes and content points as report elements.",
        keyPoints: [...pdfThemes.map((theme) => `${theme.title}: ${theme.summary}`), ...contentPoints.slice(0, 3).map((point) => point.description)],
        paperIds: paperIds.slice(2, 5)
      },
      {
        title: ja ? "4. 考察と結論" : "4. Discussion and conclusion",
        purpose: ja ? "研究問いへの答え、限界、今後確認すべき点をまとめます。" : "Answer the research question and note limitations.",
        keyPoints: [plan.thesisHint, plan.paperStrategy],
        paperIds: paperIds.slice(0, 6)
      }
    ],
    nextSteps: ja ? ["選択した論文の抄録または本文を確認する", "授業の引用ルールに合わせる", "反対意見を支える論文を1本追加する"] : ["Check abstracts or full texts", "Adjust citation style to course requirements", "Add one paper with a contrasting view"]
  };
}

export function fallbackReportDraft(
  plan: ThemeCandidate,
  references: ReferenceItem[],
  pdfThemes: PdfTheme[],
  contentPoints: ContentPoint[],
  outline: ReportOutline | null,
  options: ReportDraftOptions,
  outputLanguage: "ja" | "en"
): ReportDraft {
  const ja = isJa(outputLanguage);
  const bibliography = references.map((reference) => reference.formattedCitation ?? reference.apa7);
  const sectionText = (outline?.sections ?? fallbackReportOutline(plan, references, pdfThemes, contentPoints, outputLanguage).sections)
    .map((section) => `${section.title}\n${section.purpose}\n${section.keyPoints.join("\n")}`)
    .join("\n\n");
  const referenceLine = references.slice(0, 4).map((reference) => `${reference.authors[0] ?? reference.title} (${reference.year ?? "n.d."})`).join(", ");
  const pdfLine = pdfThemes.slice(0, 3).map((theme) => theme.title).join(", ");

  const draft = ja
    ? [
        plan.title,
        "",
        `本稿は「${plan.researchQuestion}」という問いに答えるための下書きである。中心的な主張は、${plan.thesisHint} という方向で整理できる。まず、${contentPoints[0]?.title ?? plan.title}を手がかりに、なぜこのテーマが大学生のレポートで扱う価値を持つのかを確認する。`,
        "",
        references.length ? `先行研究の整理では、${referenceLine} などを手がかりに議論の流れをまとめる。ただし、抄録やメタデータだけで判断している文献については、本文を確認するまで断定的な表現を避ける必要がある。` : "現時点では外部論文を選択していないため、本文ではPDFや内容候補に基づく整理にとどめる。論文引用を入れる場合は、後で参考文献を選択して本文を修正する必要がある。",
        "",
        sectionText,
        "",
        pdfLine ? `アップロードしたPDFからは、${pdfLine} という観点も得られる。これらは独自性を高める材料になるが、引用や根拠として使う前にPDF本文の該当箇所を確認する。` : "",
        "",
        "結論では、研究問いに対する暫定的な答えを示し、選択した資料から言えることと言えないことを分けて述べる。最後に、授業内容や自分の経験と照らし合わせて、どの点をさらに検討すべきかを示す。"
      ]
        .filter(Boolean)
        .join("\n")
    : [
        plan.title,
        "",
        `This draft starts from the question: ${plan.researchQuestion}. The central claim can be developed as follows: ${plan.thesisHint}.`,
        "",
        references.length ? `The literature review can use ${referenceLine} to organize the discussion.` : "No external papers are selected yet, so this draft is grounded in PDF themes and content points.",
        "",
        sectionText,
        "",
        pdfLine ? `The uploaded PDF suggests these useful elements: ${pdfLine}. Check the relevant passages before using them as evidence.` : "",
        "",
        "The conclusion should answer the research question while distinguishing between what the selected materials support and what still needs checking."
      ]
        .filter(Boolean)
        .join("\n");

  return {
    title: plan.title,
    draft,
    wordCountEstimate: draft.split(/\s+/).filter(Boolean).length,
    languageLevel: options.languageLevel,
    humanLike: options.humanLike,
    notes: ja ? ["これは編集用の下書きです。授業ルールに合わせて自分の言葉で直してください。", "論文を根拠として使う前に、抄録または本文を確認してください。", `目標の${options.targetWordCount}語前後に近づけるには、各段落の説明量を調整してください。`] : ["This is an editable draft. Revise it in your own voice and follow course rules.", "Check abstracts or full texts before using papers as evidence.", `Adjust paragraph length to approach about ${options.targetWordCount} words.`],
    bibliography
  };
}

export function fallbackPersonalizationCheck(
  draft: ReportDraft,
  plan: ThemeCandidate,
  references: ReferenceItem[],
  contentPoints: ContentPoint[],
  outputLanguage: "ja" | "en"
): PersonalizationCheck {
  const ja = isJa(outputLanguage);
  const hasReferences = references.length > 0;
  const points: PersonalizationPoint[] = [
    {
      id: "improve-opinion",
      title: ja ? "自分の立場を明確にする" : "Make your own position explicit",
      issue: ja ? "説明はありますが、自分がどの立場を取るのかがまだ弱い可能性があります。" : "The draft explains the topic, but your own position may still be too implicit.",
      suggestion: ja ? "序論または結論に、賛成・反対・条件付き賛成などの立場と理由を1段落追加します。" : "Add one paragraph that states your position and why you hold it.",
      category: "opinion",
      priority: "high"
    },
    {
      id: "improve-course",
      title: ja ? "授業内容とつなげる" : "Connect the report to the course or assignment",
      issue: ja ? "授業概念や課題内容との接続が弱いと、一般論に見えやすくなります。" : "Without course concepts or assignment constraints, the draft can feel too general.",
      suggestion: ja ? "課題内容のキーワード、授業で扱った概念、先生が強調した論点を具体的に入れます。" : "Add assignment keywords, course concepts, or issues emphasized by the instructor.",
      category: "course",
      priority: "high"
    },
    {
      id: "improve-evidence",
      title: ja ? "根拠の使い方を明確にする" : "Clarify how selected papers support each claim",
      issue: hasReferences ? (ja ? "どの主張をどの論文が支えるのかを、さらに明確にできます。" : "The link between each source and claim can be clearer.") : ja ? "論文が選ばれていないため、根拠の位置づけが弱くなっています。" : "Without selected papers, the evidence structure is weak.",
      suggestion: ja ? "本文の各段落に、対応する論文とその論文が支える点を1文追加します。" : "Add one sentence per body paragraph explaining which paper supports which point.",
      category: "evidence",
      priority: "high"
    },
    {
      id: "improve-example",
      title: ja ? "具体例を入れる" : "Add a concrete example",
      issue: ja ? "抽象的な説明が続くと、読み手が場面を想像しにくくなります。" : "When the prose stays abstract, the reader cannot easily picture the situation.",
      suggestion: ja ? "授業、課題、学生の行動、制度、ニュースなどから具体例を1つ入れます。" : "Add one concrete example from a class, assignment, student behavior, policy, or news case.",
      category: "example",
      priority: "medium"
    },
    {
      id: "improve-counterargument",
      title: ja ? "反論や限界を補う" : "Strengthen counterarguments and limitations",
      issue: ja ? "主張が一方向に進みすぎると、考察が浅く見えることがあります。" : "If the argument moves in only one direction, the discussion can feel shallow.",
      suggestion: ja ? "反対意見、例外、選択した資料だけでは言えないことを1段落追加します。" : "Add a paragraph on objections, exceptions, or what the selected sources cannot prove.",
      category: "counterargument",
      priority: "medium"
    }
  ];

  return {
    summary: ja ? `「${plan.title}」の下書きは、自分の意見、授業との接続、根拠の使い方を強めるとより良くなります。` : `The draft for "${plan.title}" can be improved by strengthening your own position, course connection, and evidence use.`,
    points
  };
}

export function fallbackRevisedReportDraft(
  draft: ReportDraft,
  references: ReferenceItem[],
  selectedImprovements: PersonalizationPoint[],
  customImprovements: string[],
  options: ReportDraftOptions,
  outputLanguage: "ja" | "en"
): RevisedReportDraft {
  const ja = isJa(outputLanguage);
  const improvementText = selectedImprovements.map((item) => `${item.title}: ${item.suggestion}`).join("\n");
  const customText = customImprovements.join("\n");
  const addendum = ja
    ? ["", "改訂メモ", improvementText, customText ? `その他の要望:\n${customText}` : "", "上のメモを本文に自然に組み込み、自分の授業経験・判断・確認済みの根拠に合わせて直してください。"].filter(Boolean).join("\n")
    : ["", "Revision notes", improvementText, customText ? `Other requested improvements:\n${customText}` : "", "Turn these notes into your own wording and checked evidence."].filter(Boolean).join("\n");
  const revisedText = `${draft.draft}\n${addendum}`;

  return {
    ...draft,
    draft: revisedText,
    wordCountEstimate: revisedText.split(/\s+/).filter(Boolean).length,
    languageLevel: options.languageLevel,
    humanLike: options.humanLike,
    bibliography: draft.bibliography.length ? draft.bibliography : references.map((reference) => reference.formattedCitation ?? reference.apa7),
    notes: ja ? ["選択した改善点を改訂メモとして追加しました。本文に自然に組み込んでください。", "論文の本文や抄録を確認してから根拠として使ってください。"] : ["Selected improvements were added as revision guidance.", "Check abstracts or full texts before using papers as evidence."],
    appliedImprovementIds: selectedImprovements.map((item) => item.id),
    customImprovements
  };
}

export function fallbackSummary(reference: ReferenceItem, outputLanguage: "ja" | "en"): Pick<ReferenceItem, "abstractOrMetadataSummary" | "whyUseful"> {
  const ja = isJa(outputLanguage);

  if (reference.abstract) {
    return {
      abstractOrMetadataSummary: ja ? `抄録に基づく要約: ${reference.abstract.slice(0, 320)}${reference.abstract.length > 320 ? "..." : ""}` : `Abstract-based summary: ${reference.abstract.slice(0, 320)}${reference.abstract.length > 320 ? "..." : ""}`,
      whyUseful: ja ? "抄録から研究目的や方法の手がかりが確認できるため、レポートの根拠候補として検討できます。" : "It includes enough abstract detail to evaluate whether it can support the report argument."
    };
  }

  return {
    abstractOrMetadataSummary: ja ? `メタデータに基づく要約: ${reference.year ?? "年不明"}年の${reference.sourceName ?? "学術資料"}です。本文内容は未確認です。` : `Metadata-based summary: This is a ${reference.year ?? "date unknown"} work from ${reference.sourceName ?? "an academic source"}. Full text was not inspected.`,
    whyUseful: ja ? "タイトル、著者、掲載情報から関連性を確認できる候補です。本文または抄録を開いて、採用可否を判断してください。" : "Use it as a candidate source after opening the record and checking the abstract or full text."
  };
}
