import { legalUpdatedAt } from "@/lib/legal-content";
import Link from "next/link";

type PageProps = {
  searchParams?: Promise<{ lang?: string }>;
};

const jaSections = [
  {
    title: "第1条 基本方針",
    body: [
      "本サービスは、個人情報の重要性を認識し、個人情報保護法その他関連法令を遵守し、取得した情報を適切に管理します。"
    ]
  },
  {
    title: "第2条 取得する情報",
    body: [
      "本サービスは、ユーザーが入力した名前またはメールアドレス、レポートテーマ、課題内容、レポートに含めたい内容、追加条件を取得する場合があります。",
      "本サービスは、アップロードされたPDFおよびPDFから抽出されたテキスト、要約、重要テーマ、生成された内容候補、プラン、参考文献候補、構成案、下書き、改訂案を処理する場合があります。",
      "本サービスは、引用形式、選択した参考文献、PDFテーマ、生成設定、利用イベント、アクセス情報、エラー情報、生成回数、ブラウザに保存される履歴情報を取得する場合があります。"
    ]
  },
  {
    title: "第3条 取得方法",
    body: [
      "本サービスは、ユーザーによるフォーム入力、PDFアップロード、サービス利用時に自動的に送信されるイベント情報、ブラウザ保存機能等により情報を取得します。"
    ]
  },
  {
    title: "第4条 利用目的",
    body: [
      "取得した情報は、本サービスの提供、本人識別、履歴表示、レポート材料の整理、PDF読み取り、AI生成、参考文献検索、生成結果の表示、コピー、保存、再利用のために利用します。",
      "取得した情報は、不具合調査、エラー対応、セキュリティ確保、利用状況の分析、機能改善、品質改善、不正利用、過剰利用、規約違反の防止のために利用します。"
    ]
  },
  {
    title: "第5条 外部サービスへの送信",
    body: [
      "本サービスは、AI生成、PDF要約、下書き作成等のためOpenAI APIに情報を送信する場合があります。",
      "本サービスは、アプリのホスティング、実行環境、ログ管理のためVercelを利用し、利用状況の分析のためVercel Analyticsを利用します。",
      "本サービスは、参考文献候補の検索のためOpenAlex、Crossref、Semantic Scholar、CiNii等の外部サービスを利用する場合があります。",
      "Analyticsでは、レポート本文、PDF本文、レポートテーマ、個人名、メールアドレスを送信しない設計とします。ただし、AI生成やPDF解析のため、ユーザー入力やPDF由来テキストがOpenAI API等へ送信される場合があります。"
    ]
  },
  {
    title: "第6条 第三者提供",
    body: [
      "本サービスは、法令に基づく場合、ユーザーの同意がある場合、サービス提供に必要な外部サービスへの送信または委託を行う場合を除き、個人データを第三者に提供しません。"
    ]
  },
  {
    title: "第7条 共同利用",
    body: [
      "本サービスは、現時点で個人データの共同利用を予定していません。将来、共同利用を行う場合は、共同利用される情報の項目、共同利用者の範囲、利用目的、管理責任者等を本ポリシー上で公表します。"
    ]
  },
  {
    title: "第8条 保存期間",
    body: [
      "PDF本文および生成履歴は、原則としてサーバーに保存しません。",
      "ブラウザ内に保存された履歴は、ユーザー自身が削除できます。",
      "将来、データベース保存機能を導入する場合、保存期間は原則1週間とします。",
      "法令対応、不正利用調査、セキュリティ対応のために必要な場合、合理的に必要な範囲で情報を保存することがあります。"
    ]
  },
  {
    title: "第9条 安全管理措置",
    body: [
      "本サービスは、取得した情報について、不正アクセス、漏えい、滅失、改ざん等を防ぐため、必要かつ適切な安全管理措置を講じます。",
      "本サービスは、APIキー等の秘密情報をブラウザ側に公開せず、サーバー側で外部API通信を行い、不要な個人情報をAnalyticsに送信しないよう努めます。",
      "本サービスは、必要に応じたアクセス制限、レート制限を行い、不具合やセキュリティ問題が判明した場合、速やかに対応します。"
    ]
  },
  {
    title: "第10条 Cookie・Analytics",
    body: [
      "本サービスは、利用状況の把握、機能改善、不具合調査のため、Cookieまたは類似技術、Vercel Analyticsを利用する場合があります。",
      "これらは、ユーザー体験の改善や利用状況分析のために使用され、レポート本文やPDF本文の内容をAnalyticsイベントとして送信しない方針とします。"
    ]
  },
  {
    title: "第11条 開示・訂正・削除・利用停止",
    body: [
      "ユーザーが、自身の個人情報の開示、訂正、削除、利用停止等を希望する場合、今後設置予定の問い合わせ窓口から連絡するものとします。",
      "現時点では問い合わせ窓口を設置していないため、対応方法は今後本サービス上で案内します。"
    ]
  },
  {
    title: "第12条 未成年者の情報",
    body: [
      "未成年者が本サービスを利用する場合、必要に応じて保護者その他法定代理人の同意を得るものとします。",
      "本サービスは、未成年者が利用する可能性を想定し、過度な個人情報の入力を求めない方針とします。"
    ]
  },
  {
    title: "第13条 入力を避けるべき情報",
    body: [
      "ユーザーは、住所、電話番号、学生番号、成績情報、パスワード、認証情報、APIキー、第三者の個人情報、機密資料、未公開研究、社外秘情報、利用権限のないPDF、授業資料、有料資料を本サービスに入力またはアップロードしないでください。"
    ]
  },
  {
    title: "第14条 ポリシーの変更",
    body: [
      "本サービスは、機能追加、法令改正、外部サービスの仕様変更、運営方針の変更に応じて、本ポリシーを変更することがあります。重要な変更がある場合は、本サービス上で通知します。"
    ]
  },
  {
    title: "第15条 問い合わせ窓口",
    body: [
      "問い合わせ窓口は、今後本サービス上に設置する予定です。現時点では、個別の問い合わせ先は設置していません。"
    ]
  }
];

const enSections = [
  {
    title: "Article 1. Basic Policy",
    body: [
      "The Service recognizes the importance of personal information and handles acquired information appropriately in accordance with applicable privacy laws and regulations."
    ]
  },
  {
    title: "Article 2. Information Collected",
    body: [
      "The Service may collect the name or email address entered by the user, report topics, assignment details, content to include, and additional conditions.",
      "The Service may process uploaded PDFs and text, summaries, and important themes extracted from PDFs, as well as generated content points, plans, reference candidates, outlines, drafts, and revisions.",
      "The Service may collect citation style, selected references, selected PDF themes, generation settings, usage events, access information, error information, generation counts, and history information saved in the user’s browser."
    ]
  },
  {
    title: "Article 3. Collection Methods",
    body: [
      "The Service collects information through user form input, PDF uploads, automatically sent usage events, and browser storage functions."
    ]
  },
  {
    title: "Article 4. Purposes of Use",
    body: [
      "Collected information is used to provide the Service, identify users, display history, organize report materials, read PDFs, generate AI outputs, search references, and display, copy, save, or reuse generated results.",
      "Collected information is also used for error investigation, troubleshooting, security, usage analysis, feature improvement, quality improvement, and prevention of abuse, excessive use, and violations of the Terms."
    ]
  },
  {
    title: "Article 5. Transmission to External Services",
    body: [
      "The Service may transmit information to OpenAI API for AI generation, PDF summarization, and draft creation.",
      "The Service uses Vercel for hosting, runtime environment, and logs, and uses Vercel Analytics for usage analysis.",
      "The Service may use OpenAlex, Crossref, Semantic Scholar, CiNii, and similar services for reference search.",
      "Analytics is designed not to send report text, PDF text, report topics, personal names, or email addresses. However, user input and PDF-derived text may be sent to OpenAI API or similar services for AI generation and PDF analysis."
    ]
  },
  {
    title: "Article 6. Third-Party Provision",
    body: [
      "The Service does not provide personal data to third parties except where required by law, with user consent, or where transmission or outsourcing is necessary to provide the Service."
    ]
  },
  {
    title: "Article 7. Joint Use",
    body: [
      "The Service does not currently plan joint use of personal data. If joint use is introduced in the future, the relevant items, scope of joint users, purposes of use, and responsible party will be disclosed in this Policy."
    ]
  },
  {
    title: "Article 8. Retention Period",
    body: [
      "PDF text and generation history are not stored on the server in principle.",
      "Browser-stored history can be deleted by the user.",
      "If database storage is introduced in the future, the retention period will be one week in principle.",
      "Information may be retained to the extent reasonably necessary for legal compliance, abuse investigation, or security."
    ]
  },
  {
    title: "Article 9. Security Measures",
    body: [
      "The Service takes necessary and appropriate measures to prevent unauthorized access, leakage, loss, or alteration of acquired information.",
      "The Service does not expose API keys or secret information to browser-side code, uses server-side communication for external APIs, and works to avoid sending unnecessary personal information to Analytics.",
      "The Service applies access limits and rate limits where necessary and responds promptly to bugs or security issues when identified."
    ]
  },
  {
    title: "Article 10. Cookies and Analytics",
    body: [
      "The Service may use cookies or similar technologies and Vercel Analytics to understand usage, improve features, and investigate issues.",
      "These tools are used to improve user experience and analyze usage. The Service is designed not to send report text or PDF text as Analytics events."
    ]
  },
  {
    title: "Article 11. Disclosure, Correction, Deletion, and Suspension of Use",
    body: [
      "If users wish to request disclosure, correction, deletion, or suspension of use of their personal information, they may contact the Service through a contact channel to be provided in the future.",
      "At present, no individual contact address is available. The method for handling such requests will be announced in the Service in the future."
    ]
  },
  {
    title: "Article 12. Information of Minors",
    body: [
      "If a minor uses the Service, the minor must obtain consent from a parent or legal guardian where necessary.",
      "The Service assumes that minors may use it and is designed not to request excessive personal information."
    ]
  },
  {
    title: "Article 13. Information Users Should Not Enter",
    body: [
      "Users should not enter or upload addresses, phone numbers, student IDs, grade information, passwords, authentication information, API keys, personal information of third parties, confidential materials, unpublished research, trade secrets, PDFs, course materials, or paid materials the user is not authorized to use."
    ]
  },
  {
    title: "Article 14. Changes to This Policy",
    body: [
      "The Service may change this Policy due to feature additions, legal changes, external service changes, or operational changes. Important changes will be announced in the Service."
    ]
  },
  {
    title: "Article 15. Contact",
    body: [
      "A contact channel will be provided in the Service in the future. At present, no individual contact address is available."
    ]
  }
];

export default async function PrivacyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isEnglish = params?.lang === "en";
  const sections = isEnglish ? enSections : jaSections;

  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">{isEnglish ? "Back to AI Report Builder" : "AI Report Builderに戻る"}</Link>
      <header className="legalHero">
        <p className="eyebrow">Privacy</p>
        <h1>{isEnglish ? "AI Report Builder Privacy Policy" : "AI Report Builder プライバシーポリシー"}</h1>
        <p>{isEnglish ? `Last updated: ${legalUpdatedAt}` : `最終更新日：${legalUpdatedAt}`}</p>
        <p>
          {isEnglish
            ? "AI Report Builder (“Service”) establishes this Privacy Policy to describe how user information is handled."
            : "AI Report Builder（以下「本サービス」）は、ユーザーの情報を適切に取り扱うため、以下のとおりプライバシーポリシーを定めます。"}
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
