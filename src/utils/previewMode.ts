/**
 * 「プレビュー扱い＝下書き(draft)も表示する」かどうかの唯一の判定場所。
 *
 * 下書き記事は本番サイトでは非公開にする（frontmatter の `draft` は
 * src/content.config.ts の Zod スキーマと keystatic.config.ts の
 * 「下書き (Draft)」チェックボックスで管理する）。
 *
 * 一方で編集の現場では、下書きのまま見た目を確認したい:
 *   - ローカル開発（astro dev）: Keystatic 管理画面の「Preview」ボタンは
 *     この dev サーバーの /blog/{slug} を開く。ここで下書きを除外すると
 *     「保存したのにページが無い（目次も Folio も空）」となり、
 *     編集が反映されていないように見える（実際に Chapter 2 Part 2 で発生した）。
 *   - Cloudflare Pages のプレビューデプロイ: master 以外のブランチを確認する。
 *
 * 本番ビルド（astro build / CF_PAGES が master）では必ず false になる。
 * 各ページで同じ条件式を重複して書かず、必ずこの関数を通すこと
 * （片方だけ直して挙動がずれる事故を防ぐため）。
 */
export function isPreviewMode(): boolean {
  // ローカル開発サーバー（astro dev）。本番ビルドでは Vite が false に置換する。
  if (import.meta.env.DEV) return true;
  // Cloudflare Pages のプレビューデプロイ（master 以外のブランチ）
  return process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH !== 'master';
}
