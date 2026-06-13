import { legalUpdatedAt } from "@/lib/legal-content";
import Link from "next/link";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

const jaSections = [
  {
    title: "第1条 適用",
    body: [
      "本規約は、本サービスの利用に関するAI Report Builderとユーザーとの間の一切の関係に適用されます。",
      "本サービス上に表示されるAI利用ガイド、PDFアップロード注意事項、その他の注意書きは、本規約の一部を構成するものとします。",
      "本規約の内容と本サービス上の個別の説明が異なる場合、本規約が優先して適用されます。"
    ]
  },
  {
    title: "第2条 定義",
    body: [
      "「本サービス」とは、AI Report Builderが提供するレポート作成支援機能、PDF読み取り機能、参考文献検索補助機能、下書き作成機能、その他関連機能をいいます。",
      "「ユーザー」とは、本サービスを利用する個人をいいます。",
      "「入力データ」とは、ユーザーが本サービスに入力するテーマ、課題内容、レポートに含めたい内容、追加条件、PDF、その他の情報をいいます。",
      "「生成物」とは、本サービスがAIその他の処理により生成する内容候補、プラン、参考文献候補、構成案、下書き、要約、改訂案等をいいます。"
    ]
  },
  {
    title: "第3条 本サービスの内容",
    body: [
      "本サービスは、レポートテーマ、課題内容、材料の整理、PDF資料の要約、重要テーマ抽出、内容候補、レポートプラン、構成案の生成、参考文献候補の提示、引用形式の補助、下書き作成、文章改善の補助を提供します。",
      "本サービスは、レポート提出代行、成績保証、剽窃支援、不正行為支援を目的とするものではありません。"
    ]
  },
  {
    title: "第4条 ユーザーの責任",
    body: [
      "ユーザーは、所属大学、授業、教員が定めるAI利用ルールを自ら確認するものとします。",
      "ユーザーは、AI出力の内容確認、修正、事実確認、参考文献、引用、ページ番号、引用形式の確認を自ら行うものとします。",
      "ユーザーは、生成された下書きを自分の言葉で修正し、提出物が学則、授業ルール、著作権法その他の法令に反しないことを確認するものとします。"
    ]
  },
  {
    title: "第5条 未成年者の利用",
    body: [
      "未成年者が本サービスを利用する場合、必要に応じて保護者その他法定代理人の同意を得るものとします。",
      "未成年者は、学校、授業、保護者等の指示に反する方法で本サービスを利用してはなりません。",
      "AI Report Builderは、未成年者が本サービスを利用した場合、必要な同意を得ているものとして取り扱うことがあります。"
    ]
  },
  {
    title: "第6条 AI利用・剽窃防止ルール",
    body: [
      "ユーザーは、生成物を確認・修正せずそのまま提出する行為、読んでいない文献を読んだように見せる行為、出典、引用、ページ番号、参考文献を捏造する行為をしてはなりません。",
      "ユーザーは、他人の文章、資料、PDFを無断で利用する行為、大学や授業で禁止されている方法でAIを利用する行為、AI検出回避、剽窃隠し、不正提出を目的として本サービスを利用する行為をしてはなりません。",
      "本サービスは、ユーザーが自分の考えを整理し、レポート作成を補助するためのものであり、不正行為を支援するものではありません。"
    ]
  },
  {
    title: "第7条 PDFアップロードに関する注意事項",
    body: [
      "ユーザーは、PDFをアップロードする場合、自分が利用する権限を持つPDFであること、授業、大学、出版社、著作権者のルールに反しないこと、個人情報、機密情報、未公開情報が含まれていないことを確認するものとします。",
      "ユーザーは、有料論文、書籍PDF、授業資料等を無断で利用してはなりません。",
      "PDF要約やテーマ抽出は、内容理解の補助であり、PDF本文の正確な引用や権利処理を保証するものではありません。引用や根拠として利用する場合は、ユーザー自身が原文を確認してください。"
    ]
  },
  {
    title: "第8条 禁止事項",
    body: [
      "ユーザーは、法令または公序良俗に反する行為、著作権、商標権、プライバシー権、名誉権その他第三者の権利を侵害する行為、他人になりすます行為をしてはなりません。",
      "ユーザーは、虚偽情報、誤情報、違法情報を入力または生成させる行為、個人情報、機密情報、第三者の未公開情報を不用意に入力する行為をしてはなりません。",
      "ユーザーは、本サービスのサーバー、ネットワーク、APIに過度な負荷をかける行為、リバースエンジニアリング、不正アクセス、セキュリティ回避行為、本サービスを商用転用、再販売、競合サービス開発のために利用する行為、その他AI Report Builderが不適切と判断する行為をしてはなりません。"
    ]
  },
  {
    title: "第9条 参考文献・引用機能",
    body: [
      "本サービスは、参考文献候補やAPA 7、Chicago等の引用形式を補助的に表示します。",
      "AI Report Builderは、引用形式、著者名、出版年、ページ番号、DOI、URL等の正確性を保証しません。",
      "ユーザーは、提出前に必ず原典、授業指定の引用形式、ページ番号を確認するものとします。"
    ]
  },
  {
    title: "第10条 入力データおよび生成物の取扱い",
    body: [
      "入力データに関する権利は、ユーザーまたは正当な権利者に帰属します。",
      "生成物に関する利用の責任は、ユーザーが負うものとします。",
      "AI Report Builderは、本サービスの提供、品質改善、不具合対応、セキュリティ確保のために必要な範囲で、入力データおよび生成物を処理することがあります。",
      "PDF本文および生成履歴は、原則としてサーバーに保存しません。",
      "将来、データベース保存機能を導入する場合、保存期間は原則1週間とし、必要に応じて本規約およびプライバシーポリシーで明示します。"
    ]
  },
  {
    title: "第11条 知的財産権",
    body: [
      "本サービスの画面、プログラム、デザイン、ロゴ、文章、機能、その他本サービスに関する知的財産権は、AI Report Builderまたは正当な権利者に帰属します。",
      "ユーザーは、AI Report Builderの許可なく、本サービスの内容を複製、転載、販売、再配布、改変、解析してはなりません。"
    ]
  },
  {
    title: "第12条 利用停止",
    body: [
      "AI Report Builderは、ユーザーが本規約に違反した場合、または不適切な利用があると判断した場合、事前通知なく本サービスの利用制限、履歴削除、アクセス停止等の措置を行うことができます。"
    ]
  },
  {
    title: "第13条 サービスの変更・停止",
    body: [
      "AI Report Builderは、機能改善、保守、障害対応、外部APIの仕様変更、運営上の理由により、本サービスの全部または一部を変更、停止、終了することがあります。"
    ]
  },
  {
    title: "第14条 保証の否認・免責",
    body: [
      "AI Report Builderは、本サービスについて、正確性、完全性、有用性、特定目的への適合性、継続的な提供、エラーや不具合がないことを保証しません。",
      "AI Report Builderは、AI出力、参考文献候補、PDF要約、引用形式、下書き内容が正確であることを保証しません。",
      "本サービスの利用によりユーザーに生じた学業上、法的、経済的、その他の損害について、AI Report Builderは、法令上認められる範囲で責任を負わないものとします。",
      "消費者契約法その他の法令により免責が認められない場合、本条の免責はその範囲で適用されないものとします。"
    ]
  },
  {
    title: "第15条 規約の変更",
    body: [
      "AI Report Builderは、必要に応じて本規約を変更できます。重要な変更がある場合は、本サービス上で通知します。変更後にユーザーが本サービスを利用した場合、変更後の規約に同意したものとみなします。"
    ]
  },
  {
    title: "第16条 準拠法・管轄",
    body: [
      "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、日本の裁判所を管轄裁判所とします。"
    ]
  },
  {
    title: "第17条 問い合わせ",
    body: [
      "問い合わせ窓口は、今後本サービス上に設置する予定です。現時点では、個別の問い合わせ先は設置していません。"
    ]
  }
];

const enSections = [
  {
    title: "Article 1. Scope",
    body: [
      "These Terms apply to all relationships between AI Report Builder and users regarding use of the Service.",
      "The AI usage guide, PDF upload policy, and other notices displayed in the Service form part of these Terms.",
      "If there is any inconsistency between these Terms and other descriptions in the Service, these Terms prevail."
    ]
  },
  {
    title: "Article 2. Definitions",
    body: [
      "“Service” means the report-writing support functions, PDF reading functions, reference search support, draft generation, and related functions provided by AI Report Builder.",
      "“User” means any individual who uses the Service.",
      "“Input Data” means report topics, assignment details, content to include, additional conditions, PDFs, and other information entered or uploaded by the user.",
      "“Generated Output” means content points, plans, reference candidates, outlines, drafts, summaries, revisions, and other outputs generated by the Service."
    ]
  },
  {
    title: "Article 3. Service Description",
    body: [
      "The Service supports report writing by organizing report topics, assignment details, and materials; summarizing PDFs; extracting themes; generating content points, report plans, and outlines; assisting with references and citation styles; and supporting draft creation and writing improvement.",
      "The Service is not a report submission service, grade guarantee service, plagiarism support service, or academic misconduct support service."
    ]
  },
  {
    title: "Article 4. User Responsibility",
    body: [
      "Users are responsible for checking the AI use rules of their university, course, and instructor.",
      "Users are responsible for reviewing, correcting, and fact-checking AI outputs, and for checking references, citations, page numbers, and citation styles.",
      "Users must rewrite generated drafts in their own words and ensure that submitted work complies with school rules, course rules, copyright law, and applicable laws."
    ]
  },
  {
    title: "Article 5. Use by Minors",
    body: [
      "If a minor uses the Service, the minor must obtain consent from a parent or legal guardian where necessary.",
      "Minors must not use the Service in a way that violates instructions from their school, course, parent, or guardian.",
      "AI Report Builder may treat use by a minor as use with any required consent."
    ]
  },
  {
    title: "Article 6. AI Use and Plagiarism Prevention",
    body: [
      "Users must not submit Generated Output without reviewing or revising it, pretend to have read sources they have not read, or fabricate sources, citations, page numbers, or references.",
      "Users must not use another person’s writing, materials, or PDFs without permission, use AI in a way prohibited by their university or course, or use the Service to evade AI detection, hide plagiarism, or commit academic misconduct.",
      "The Service is designed to help users organize their own thinking and support report writing. It is not intended to support misconduct."
    ]
  },
  {
    title: "Article 7. PDF Upload Policy",
    body: [
      "When uploading PDFs, users must confirm that they have the right to use the PDF, that use does not violate course, university, publisher, or copyright holder rules, and that the PDF does not contain personal information, confidential information, or unpublished information.",
      "Users must not use paid papers, book PDFs, or course materials without permission.",
      "PDF summaries and theme extraction are only for understanding support. They do not guarantee accurate quotation or rights clearance. Users must check the original PDF before citing or relying on it."
    ]
  },
  {
    title: "Article 8. Prohibited Conduct",
    body: [
      "Users must not violate laws or public order, infringe copyrights, trademarks, privacy rights, reputation rights, or other third-party rights, or impersonate another person.",
      "Users must not enter or cause the generation of false, misleading, or illegal information, or carelessly enter personal, confidential, or third-party unpublished information.",
      "Users must not place excessive load on the Service’s servers, network, or APIs, reverse engineer, gain unauthorized access, bypass security measures, use the Service for commercial resale, redistribution, or development of a competing service, or engage in any other conduct AI Report Builder considers inappropriate."
    ]
  },
  {
    title: "Article 9. References and Citations",
    body: [
      "The Service may display reference candidates and assistive citation styles such as APA 7 and Chicago.",
      "AI Report Builder does not guarantee the accuracy of citation styles, author names, publication years, page numbers, DOIs, URLs, or references.",
      "Users must check original sources, course-required citation styles, and page numbers before submission."
    ]
  },
  {
    title: "Article 10. Input Data and Generated Output",
    body: [
      "Rights to Input Data remain with the user or the lawful rights holder.",
      "Users are responsible for how they use Generated Output.",
      "AI Report Builder may process Input Data and Generated Output as necessary to provide the Service, improve quality, handle errors, and ensure security.",
      "PDF text and generation history are not stored on the server in principle.",
      "If database storage is introduced in the future, the storage period will be one week in principle and will be disclosed in these Terms and the Privacy Policy."
    ]
  },
  {
    title: "Article 11. Intellectual Property",
    body: [
      "All intellectual property rights related to the Service, including screens, programs, designs, logos, text, and functions, belong to AI Report Builder or the lawful rights holder.",
      "Users must not copy, reproduce, sell, redistribute, modify, or analyze the Service without permission."
    ]
  },
  {
    title: "Article 12. Suspension of Use",
    body: [
      "AI Report Builder may restrict use, delete history, or suspend access without prior notice if a user violates these Terms or if AI Report Builder determines that use is inappropriate."
    ]
  },
  {
    title: "Article 13. Changes or Suspension of the Service",
    body: [
      "AI Report Builder may change, suspend, or terminate all or part of the Service for improvements, maintenance, system failures, external API changes, or operational reasons."
    ]
  },
  {
    title: "Article 14. Disclaimer",
    body: [
      "AI Report Builder does not guarantee the accuracy, completeness, usefulness, fitness for a particular purpose, continuous availability, or error-free operation of the Service.",
      "AI Report Builder does not guarantee the accuracy of AI outputs, reference candidates, PDF summaries, citation styles, or draft content.",
      "To the extent permitted by law, AI Report Builder is not liable for academic, legal, economic, or other damages arising from use of the Service.",
      "If applicable law does not allow certain disclaimers, those disclaimers apply only to the extent permitted by law."
    ]
  },
  {
    title: "Article 15. Changes to Terms",
    body: [
      "AI Report Builder may change these Terms as necessary. Important changes will be announced in the Service. If a user continues using the Service after changes, the user is deemed to have agreed to the updated Terms."
    ]
  },
  {
    title: "Article 16. Governing Law and Jurisdiction",
    body: [
      "These Terms are governed by the laws of Japan. Any dispute relating to the Service will be subject to the jurisdiction of the courts of Japan."
    ]
  },
  {
    title: "Article 17. Contact",
    body: [
      "A contact channel will be provided in the Service in the future. At present, no individual contact address is available."
    ]
  }
];

export default async function TermsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isEnglish = params?.lang === "en";
  const sections = isEnglish ? enSections : jaSections;

  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">{isEnglish ? "Back to AI Report Builder" : "AI Report Builderに戻る"}</Link>
      <header className="legalHero">
        <p className="eyebrow">Legal</p>
        <h1>{isEnglish ? "AI Report Builder Terms of Service" : "AI Report Builder 利用規約"}</h1>
        <p>{isEnglish ? `Last updated: ${legalUpdatedAt}` : `最終更新日：${legalUpdatedAt}`}</p>
        <p>
          {isEnglish
            ? "These Terms of Service set out the conditions for using AI Report Builder (“Service”). By using the Service, the user agrees to these Terms."
            : "この利用規約（以下「本規約」）は、AI Report Builderが提供するレポート作成支援サービス「AI Report Builder」（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本規約に同意したうえで本サービスを利用するものとします。"}
        </p>
      </header>

      {sections.map((section) => (
        <section className="legalSection" key={section.title}>
          <h2>{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
