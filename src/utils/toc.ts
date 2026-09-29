import { richTextToMarkdown } from './richText';

export interface TocEntry {
  id: string;
  level: 2 | 3;
  text: string;
  sectionIndex: number;
}

/** 見出し用スラグ（日本語を保持し、空白→ハイフン・重複に連番）。 */
export function slugifyHeading(text: string): string {
  const base = (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'section';
}

/**
 * 見出し候補の判定。
 *
 * 実データの textBlock は `## 見出し` ではなく
 * 「段落が単独の `**ボールド**`」形式（例: `**1. A Culture That ...**`）。
 * どちらの形式でも拾わないと Index が空になるため、両方を受理する。
 */
function matchHeading(line: string): { level: 2 | 3; text: string } | null {
  // `## / ###` 見出し
  const atx = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
  if (atx) {
    return { level: atx[1].length === 2 ? 2 : 3, text: cleanHeadingText(atx[2]) };
  }
  // 単独の `**ボールド行**`（実데이터のセクション見出し）
  const bold = line.match(/^\*\*(.+?)\*\*:?\s*$/);
  if (bold) {
    const text = cleanHeadingText(bold[1]);
    if (text) return { level: 2, text };
  }
  return null;
}

/** 見出し内の Markdown 記号・リンクを除去して表示テキスト化 */
function cleanHeadingText(raw: string): string {
  const text = raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
  return text;
}

/** bodyText(Markdown文字列 or richText)から `## / ###` または単独 `**見出し**` を順に抽出する。 */
export function extractToc(contentSections: unknown): TocEntry[] {
  if (!Array.isArray(contentSections)) return [];
  const entries: TocEntry[] = [];
  const used = new Map<string, number>();

  contentSections.forEach((section: unknown, sectionIndex: number) => {
    if (!section || typeof section !== 'object') return;
    const s = section as { _template?: string; bodyText?: unknown };
    if (s._template !== undefined && s._template !== 'textBlock') return;
    if (s._template === undefined && !('bodyText' in s)) return;
    const markdown = richTextToMarkdown(s.bodyText);
    if (!markdown) return;

    markdown.split('\n').forEach((line) => {
      const hit = matchHeading(line);
      if (!hit) return;
      if (!hit.text) return;

      const base = slugifyHeading(hit.text);
      const n = used.get(base) ?? 0;
      used.set(base, n + 1);
      entries.push({
        id: n === 0 ? base : `${base}-${n + 1}`,
        level: hit.level,
        text: hit.text,
        sectionIndex,
      });
    });
  });

  return entries;
}

/**
 * textBlock の描画 HTML 内の `<h2>/<h3>` に、抽出順で id を付与する。
 * @param html richTextToHtml() 済みの HTML
 * @param ids  このセクションに対応する見出し id のキュー（順序どおり）
 */
export function addHeadingIds(html: string, ids: string[]): string {
  if (!html || ids.length === 0) return html;
  let i = 0;
  return html.replace(/<h([23])([^>]*)>/g, (m, level: string, attrs: string) => {
    if (i >= ids.length) return m;
    if (/\bid\s*=/.test(attrs)) return m;
    const id = ids[i++];
    return `<h${level}${attrs} id="${id}">`;
  });
}
