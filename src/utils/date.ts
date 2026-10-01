/**
 * 記事の日付まわりの共通ヘルパー。
 *
 * 背景:
 *   `pubDate` / `updatedDate` はコンテンツスキーマ上 optional です。
 *   そのため、日付を欠いた記事が 1 件でもあると
 *     - `new Date(undefined)` → Invalid Date → "NaN" と表示される
 *     - `undefined.valueOf()` → TypeError でページ生成ごと失敗する
 *   という壊れ方をしていました。
 *
 * 方針:
 *   表示・並び順のロジックは必ずこのヘルパーを通し、
 *   「日付が無くても例外を投げない・NaN を出さない」ことを保証します。
 *   - 並び順: 日付が無い記事はタイムスタンプ 0（最古）として扱われ、降順では末尾に並びます
 *   - 表示  : 日付が無い場合は空文字を返します（"NaN" や "1970" を出しません）
 */

export type DateLike = Date | string | number | null | undefined;

/** 有効な Date に正規化する。欠落・不正値は null を返す（例外は投げない）。 */
export function toValidDate(value: DateLike): Date | null {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 渡された候補のうち、最初に見つかった有効な日付のタイムスタンプ(ms)を返す。
 * 例: `timestamp(updatedDate, pubDate)` は従来の `updatedDate || pubDate` と同じ優先順。
 * すべて無効な場合は 0 を返す（降順ソートでは末尾に並ぶ）。
 */
export function timestamp(...values: DateLike[]): number {
  for (const value of values) {
    const date = toValidDate(value);
    if (date) return date.getTime();
  }

  return 0;
}

/** 表示用の西暦4桁。日付が無い場合は空文字。 */
export function formatYear(value: DateLike): string {
  const date = toValidDate(value);

  return date ? String(date.getFullYear()) : '';
}

/** 表示用のロケール日付。日付が無い場合は空文字。 */
export function formatDate(
  value: DateLike,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toValidDate(value);

  return date ? date.toLocaleDateString(locale, options) : '';
}
