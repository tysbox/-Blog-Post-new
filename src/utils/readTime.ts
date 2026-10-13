/**
 * 記事の通読所要時間（分）。
 *
 * 記事ページ上部の「N min read」とフロントページの Folio カードで
 * 同じ値を表示するため、計算はここ 1 箇所に集約する。
 * 本文（contentSections の bodyText）の文字数から求め、最低 1 分とする。
 */
type PostLike = { data?: Record<string, any> };

export function readMinutesOf(post: PostLike | null | undefined): number {
  const sections = post?.data?.contentSections;
  const all = (Array.isArray(sections) ? sections : [])
    .map((s: any) => (typeof s?.bodyText === 'string' ? s.bodyText : ''))
    .join(' ');
  const chars = all.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(chars / 700));
}
