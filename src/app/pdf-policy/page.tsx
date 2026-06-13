import { legalUpdatedAt } from "@/lib/legal-content";
import Link from "next/link";

export default function PdfPolicyPage() {
  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">AI Report Builderに戻る</Link>
      <header className="legalHero">
        <p className="eyebrow">PDF</p>
        <h1>PDFアップロード注意事項</h1>
        <p>最終更新日: {legalUpdatedAt}</p>
      </header>

      <section className="legalSection">
        <h2>アップロードできる資料</h2>
        <ul>
          <li>自分が利用する権限を持つPDF。</li>
          <li>授業や大学のルールで利用が許可されている資料。</li>
          <li>自分のメモ、公開資料、適切に入手した論文PDF。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>アップロードしてはいけない資料</h2>
        <ul>
          <li>権限のない有料論文、書籍PDF、授業資料。</li>
          <li>友人、教員、大学、企業など第三者の機密資料。</li>
          <li>個人情報や未公開情報が含まれるPDF。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>利用上の注意</h2>
        <p>PDF読み取り結果は要約やテーマ抽出の補助です。根拠として使う前に、PDF本文の該当箇所を自分で確認してください。原文の長文転載は禁止し、引用する場合は授業ルールと引用形式に従ってください。</p>
      </section>
    </main>
  );
}
