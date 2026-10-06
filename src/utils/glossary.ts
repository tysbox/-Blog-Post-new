import { getCollection } from 'astro:content';

export type GlossaryEntry = {
  term: string;
  reading: string;
  description: string;
  caseSensitive: boolean;
  excludeSpellings: string[];
};

/**
 * 用語集（Keystatic「用語集」= src/content/glossary/*.json）を読み込む。
 * term の長い順に並べ替える（短い語の部分一致で長い語を壊さないため）。
 */
export async function getGlossary(): Promise<GlossaryEntry[]> {
  const entries = await getCollection('glossary');
  return entries
    .map((e) => ({
      term: String(e.data.term || '').trim(),
      reading: String(e.data.reading || '').trim(),
      description: String(e.data.description || '').trim(),
      caseSensitive: e.data.caseSensitive === true,
      excludeSpellings: Array.isArray(e.data.excludeSpellings)
        ? e.data.excludeSpellings.map((s: unknown) => String(s || '').trim()).filter(Boolean)
        : [],
    }))
    .filter((e) => e.term.length > 0)
    .sort((a, b) => b.term.length - a.term.length || (a.term < b.term ? -1 : 1));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `!!語句` … その箇所だけ注釈化しない（`!!` 自体は表示から消す）。
const INLINE_ESCAPE_RE = /!!([^\s<]+)/g;
const ESCAPE_TOKEN = '\u0000GLOSS-ESC\u0000';

function splitEscapeWord(raw: string): { word: string; trail: string } {
  const m = raw.match(/^(.*?)([.,;:!?)\]}'"]+)$/);
  if (m) return { word: m[1], trail: m[2] };
  return { word: raw, trail: '' };
}

function wordBoundarySource(term: string): string {
  // 英数字で終わる語は単語境界、記号・日本語で終わる語はそのまま。
  // （`Ma` が `Main` / `Mausoleum` に誤爆するのを防ぐ）
  const last = term.charAt(term.length - 1);
  const end = /[A-Za-z0-9]/.test(last) ? '\\b' : '';
  const first = term.charAt(0);
  const start = /[A-Za-z0-9]/.test(first) ? '\\b' : '';
  return `${start}${escapeRegExp(term)}${end}`;
}

/**
 * 英語本文 HTML（.article-body の中身）に用語集の注釈ボタンを埋め込む。
 *
 * 仕様:
 * - テキストノードだけを処理する（タグ・属性・リンク先は触らない）
 * - 見出し（h1-h6）内は注釈化しない
 * - `!!語句` は注釈化せず素のテキストにする
 * - 用語集の excludeSpellings に載る綴りは注釈化しない
 * - 全出現を注釈化する（初出のみ制限はしない）
 */
export function annotateGlossary(html: string, glossary: GlossaryEntry[]): string {
  if (!html || glossary.length === 0) return html;

  // 1) `!!語句` を一時トークンへ退避（注釈化の対象外にする）
  const escaped: { word: string; trail: string }[] = [];
  let working = html.replace(INLINE_ESCAPE_RE, (_m, raw: string) => {
    escaped.push(splitEscapeWord(raw));
    return `${ESCAPE_TOKEN}${escaped.length - 1}${ESCAPE_TOKEN}`;
  });

  const pieces = glossary.map((entry) => {
    const spellings = [entry.term, ...entry.excludeSpellings];
    const excluded = new Set(
      entry.excludeSpellings.map((s) => (entry.caseSensitive ? s : s.toLowerCase())),
    );
    return { entry, excluded, spellings };
  });
  // 長い語を先に照合する（"Shinto OS" が "Shinto" に先食いされないよう）
  pieces.sort((a, b) => b.entry.term.length - a.entry.term.length);

  // 全用語を1つの複合正規表現にまとめ、テキストノードごとに1回だけ置換する。
  // 逐次置換方式では「先に生成したボタンのHTML内」を次の語が再走査して
  // 入れ子壊れ（data-gloss-term="<button ...）が起きていたため、単一パスに統合。
  const combined = new RegExp(
    pieces.map(({ entry }) => wordBoundarySource(entry.term)).join('|'),
    'gi', // 大小文字はエントリごとにコールバック側で判定する
  );

  const renderButton = (entry: GlossaryEntry, matched: string): string =>
    `<button type="button" class="gloss" data-gloss-term="${escapeHtml(entry.term)}" aria-expanded="false">` +
    `<span class="gloss-term">${escapeHtml(matched)}</span>` +
    `<span class="gloss-pop" role="note">` +
    (entry.reading ? `<span class="gloss-reading">${escapeHtml(entry.reading)}</span>` : '') +
    (entry.description ? `<span class="gloss-desc">${escapeHtml(entry.description)}</span>` : '') +
    `</span></button>`;

  // タグとテキストを分離して走査する
  const parts = working.split(/(<[^>]*>)/g);
  let headingDepth = 0;
  const linkDepthStack: boolean[] = [];
  let inLink = false;

  const openTagRe = /^<\s*([a-zA-Z][a-zA-Z0-9]*)/;
  const closeTagRe = /^<\/\s*([a-zA-Z][a-zA-Z0-9]*)/;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || part.startsWith('<')) {
      const open = part ? part.match(openTagRe) : null;
      const close = part ? part.match(closeTagRe) : null;
      if (open) {
        const name = open[1].toLowerCase();
        if (/^h[1-6]$/.test(name)) headingDepth++;
        // 見出し内だけでなく strong 内も注釈化しない（見出し相当の太字装飾のため）
        if (name === 'strong' || name === 'b') headingDepth++;
        if (name === 'a') {
          linkDepthStack.push(true);
          inLink = true;
        }
      } else if (close) {
        const name = close[1].toLowerCase();
        if (/^h[1-6]$/.test(name)) headingDepth = Math.max(0, headingDepth - 1);
        if (name === 'strong' || name === 'b') headingDepth = Math.max(0, headingDepth - 1);
        if (name === 'a') {
          linkDepthStack.pop();
          inLink = linkDepthStack.length > 0;
        }
      }
      continue;
    }
    // 見出し内・リンク内は触らない
    if (headingDepth > 0 || inLink) continue;

    // 単一パス置換（生成したボタンHTMLは再走査されない）
    parts[i] = part.replace(combined, (matched: string) => {
      const hit = pieces.find(({ entry }) =>
        entry.caseSensitive
          ? entry.term === matched
          : entry.term.toLowerCase() === matched.toLowerCase(),
      );
      if (!hit) return matched;
      const { entry, excluded } = hit;
      const key = entry.caseSensitive ? matched : matched.toLowerCase();
      // 除外表記に載る綴りは注釈化しない
      if (excluded.has(key)) return matched;
      return renderButton(entry, matched);
    });
  }

  working = parts.join('');

  // 2) 退避した `!!語句` を素のテキストに戻す（末尾の句読点つき）
  working = working.replace(
    new RegExp(`${ESCAPE_TOKEN}(\\d+)${ESCAPE_TOKEN}`, 'g'),
    (_m, index: string) => {
      const entry = escaped[Number(index)];
      if (!entry) return '';
      return escapeHtml(entry.word) + entry.trail;
    },
  );

  return working;
}
