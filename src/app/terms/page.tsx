import { legalUpdatedAt, safetyPrinciples } from "@/lib/legal-content";
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">AI Report Builderに戻る</Link>
      <header className="legalHero">
        <p className="eyebrow">Legal</p>
        <h1>利用規約</h1>
        <p>最終更新日: {legalUpdatedAt}</p>
      </header>

      <section className="legalSection">
        <h2>1. サービスの位置づけ</h2>
        <p>AI Report Builderは、大学生のレポート作成を支援するためのツールです。構成案、内容候補、参考文献候補、下書き、文章改善の補助を行いますが、提出物の完成、成績、正確性、適法性を保証するものではありません。</p>
      </section>

      <section className="legalSection">
        <h2>2. ユーザーの責任</h2>
        <ul>
          {safetyPrinciples.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>生成された文章をそのまま提出せず、内容、引用、参考文献、表現を自分で確認・修正してください。</li>
          <li>授業や大学がAI利用を禁止または制限している場合、そのルールを優先してください。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>3. 禁止事項</h2>
        <ul>
          <li>剽窃、出典の捏造、読んでいない資料を読んだように見せる行為。</li>
          <li>他人の著作物、授業資料、有料論文、PDF等を権限なく入力またはアップロードする行為。</li>
          <li>個人情報、機密情報、未公開情報、第三者の情報を不用意に入力する行為。</li>
          <li>サービスの制限、レート制限、保護機能を回避する行為。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>4. AI出力と免責</h2>
        <p>AIの出力には誤り、不完全な情報、引用形式の誤り、事実と異なる内容が含まれる場合があります。ユーザーは出力内容を自分で確認し、必要に応じて原典や授業資料を確認してください。本サービスは、利用により生じた学業上、法的、経済的、その他の損害について、法令で認められる範囲で責任を負いません。</p>
      </section>

      <section className="legalSection">
        <h2>5. 変更</h2>
        <p>本規約は、機能追加、運営方針、法令・外部サービスの変更に応じて更新されることがあります。重要な変更がある場合は、アプリ内で分かりやすく案内します。</p>
      </section>
    </main>
  );
}
