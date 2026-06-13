import { legalUpdatedAt } from "@/lib/legal-content";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">AI Report Builderに戻る</Link>
      <header className="legalHero">
        <p className="eyebrow">Privacy</p>
        <h1>プライバシーポリシー</h1>
        <p>最終更新日: {legalUpdatedAt}</p>
      </header>

      <section className="legalSection">
        <h2>1. 取得する情報</h2>
        <ul>
          <li>ユーザーが入力したテーマ、課題内容、含めたい内容、追加条件。</li>
          <li>アップロードされたPDFから抽出される要約、重要テーマ、読み取り結果。</li>
          <li>生成された内容候補、プラン、参考文献候補、構成案、下書き。</li>
          <li>利用状況イベント、エラー情報、生成回数などの運営上必要な情報。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>2. 利用目的</h2>
        <p>取得した情報は、レポート作成支援、PDF読み取り、参考文献検索、下書き生成、品質改善、不具合調査、利用状況分析、サービスの安全運営のために利用します。</p>
      </section>

      <section className="legalSection">
        <h2>3. 外部サービスへの送信</h2>
        <p>AI生成やPDF解析のため、入力内容やPDF由来のテキストがOpenAI API等の外部AIサービスへ送信される場合があります。また、利用状況の把握のためVercel Analyticsを使用します。Analyticsでは、本文、PDF本文、レポートテーマ、個人名を送らない設計にします。</p>
      </section>

      <section className="legalSection">
        <h2>4. 保存と削除</h2>
        <p>初期運用では、PDF本文や入力内容を必要以上に保存しない方針とします。ブラウザ内の履歴はユーザーが削除できます。将来データベースを導入する場合は、保存対象、保存期間、削除方法を明示します。</p>
      </section>

      <section className="legalSection">
        <h2>5. 入力してはいけない情報</h2>
        <p>氏名、住所、学生番号、成績、パスワード、未公開研究、第三者の個人情報、機密資料などは入力しないでください。</p>
      </section>
    </main>
  );
}
