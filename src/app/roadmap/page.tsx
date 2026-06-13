import Link from "next/link";

export default function RoadmapPage() {
  return (
    <main className="legalPage">
      <Link className="legalBack" href="/">AI Report Builderに戻る</Link>
      <header className="legalHero">
        <p className="eyebrow">Roadmap</p>
        <h1>半年間統合実行計画</h1>
        <p>日本人大学生向けに安全で使いやすいレポート作成支援AIを育て、その後に海外展開を目指します。</p>
      </header>

      <section className="legalSection">
        <h2>6月: 友人テストと安全設計</h2>
        <ul>
          <li>友人5〜10人に使ってもらい、UI、PDF、下書き、引用の課題を記録する。</li>
          <li>利用規約、プライバシーポリシー、AI利用ガイド、PDF注意事項を整える。</li>
          <li>広告費は使わず、プロダクト品質を優先する。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>7月: ベータ版公開</h2>
        <ul>
          <li>日本人大学生向けに小さく公開し、利用者100人とフィードバック20件を目指す。</li>
          <li>主要ステップの完了率、PDF失敗率、下書き作成率をAnalyticsで確認する。</li>
          <li>履歴、フィードバック、エラー、生成回数を保存するデータベース導入を進める。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>8月: 完成版と宣伝</h2>
        <ul>
          <li>トップページ、ステップUI、引用、PDF、下書き品質を完成版に近づける。</li>
          <li>使い方ページ、FAQ、紹介動画、スクリーンショットを作る。</li>
          <li>広告を試す場合は1〜2万円までに抑える。</li>
        </ul>
      </section>

      <section className="legalSection">
        <h2>9月以降: データ改善と拡大</h2>
        <ul>
          <li>毎週Analyticsとフィードバックを確認する。</li>
          <li>日本語版で継続利用が見えたら、英語版UIと海外向け引用形式を整える。</li>
          <li>Proプランや有料化は、利用データとAPI費を見てから判断する。</li>
        </ul>
      </section>
    </main>
  );
}
