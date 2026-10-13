import { marked } from 'marked';

type RichTextNode = {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  children?: RichTextNode[];
};

/**
 * Keystatic の GUI エディタが YAML に書き出すときの「表現のゆれ」を吸収する。
 *
 * Keystatic は複数行のテキストを YAML の folded scalar（`>`）で保存する。
 * この形式は改行を空白に畳んでしまうため、エディタは改行を次のように書き分ける:
 *
 *   段落（空行）      → 空行（そのまま）
 *   強制改行（Shift+Enter） → 行末の `\`（YAML の folded scalar では
 *                            `\` + 改行 = 改行を畳まない、の意味）
 *
 * ところが実際のファイルでは `\` の直後に空白が入った状態
 * （`...感じています。\ `）で保存されることがあり、その場合は
 * YAML が「改行を畳む」動作になり、Markdown 側には
 * `\ `（バックスラッシュ + 空白）が残って **そのまま文字として表示** される。
 *
 * ここでは `\` + 空白 を「強制改行」として解釈し直し、
 * Markdown のハードブレーク（行末 `\` + 改行）に正規化する。
 * これで GUI エディタで入れた改行が、どの欄でも同じように反映される。
 *
 * あわせて、Keystatic が行頭の空白を保持するために挿入する
 * `&#x20;`（HTML エンティティ）を除去する。
 */
function normalizeKeystaticText(value: string): string {
  return value
    // `\` + 空白（半角/全角）→ 強制改行。行末の空白は YAML が落とすため、
    // ここで改行に置き換えて Markdown のハードブレークとして扱わせる。
    .replace(/\\[ \t\u3000]+/g, '\\\n')
    // 行頭の空白保持用エンティティ（表示上は空白 1 個で、装飾の意味は無い）
    .replace(/&#x20;/g, ' ');
}

function normalizeInlineText(value: string): string {
  return normalizeKeystaticText(value).replace(/\\([*_])/g, '$1');
}

function renderInlineNode(node: RichTextNode): string {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    let text = normalizeInlineText(node.text || '');

    if (node.bold) {
      text = `**${text}**`;
    }

    if (node.italic) {
      text = `*${text}*`;
    }

    return text;
  }

  if (node.type === 'break') {
    return '\n';
  }

  if (Array.isArray(node.children)) {
    return node.children.map(renderInlineNode).join('');
  }

  return '';
}

export function richTextToMarkdown(content: unknown): string {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return normalizeKeystaticText(content);
  }

  if (typeof content !== 'object') {
    return String(content);
  }

  const root = content as RichTextNode;

  if (!Array.isArray(root.children)) {
    return '';
  }

  return root.children
    .map((child) => {
      if (child.type === 'p') {
        return renderInlineNode(child).trimEnd();
      }

      return renderInlineNode(child).trimEnd();
    })
    .filter(Boolean)
    .join('\n\n');
}

export function richTextToHtml(content: unknown): string {
  const markdown = richTextToMarkdown(content);

  if (!markdown) {
    return '';
  }

  return marked.parse(markdown, {
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: false,
  }) as string;
}

/**
 * 見出し・タイトルなど「1行の装飾」に使う Markdown → HTML。
 *
 * `marked.parse` は段落を `<p>` で包むため、`<h1>` などの 안에置くと
 * 入れ子が崩れてしまう。見出し内ではこちらを使う。
 */
export function richTextToHtmlInline(content: unknown): string {
  const markdown = richTextToMarkdown(content);

  if (!markdown) {
    return '';
  }

  return marked.parseInline(markdown, {
    gfm: true,
    breaks: true,
    mangle: false,
    headerIds: false,
  }) as string;
}

/** 見出し記法（行頭の `#`）を含むかどうか。 */
export function hasMarkdownHeading(content: unknown): boolean {
  return /^[ \t]{0,3}#{1,6}[ \t]/m.test(richTextToMarkdown(content));
}

/**
 * ヒーロー見出し用の Markdown → HTML。
 *
 * 本文と同じ GUI エディタで編集するため、`### 見出し` のように
 * 見出しレベルを選べる。見出し記法があるときはそのレベルをそのまま
 * `<h1>`〜`<h6>` として出力し、無いときは従来どおりインライン
 * （改行は `<br>`）で出力する。
 *
 * 見出しタグを出す場合は `<h1>` で包むと入れ子が不正になるため、
 * 呼び出し側は hasMarkdownHeading() で包み分ける。
 */
export function richTextToHtmlHeading(content: unknown): string {
  const markdown = richTextToMarkdown(content);

  if (!markdown) {
    return '';
  }

  if (hasMarkdownHeading(markdown)) {
    return marked.parse(markdown, {
      gfm: true,
      breaks: true,
      mangle: false,
      headerIds: false,
    }) as string;
  }

  return richTextToHtmlInline(markdown);
}

/**
 * `<title>` や `alt` など装飾が要らない箇所用に、Markdown 記号を取り除く。
 *
 * 見出し（`###`）・引用（`>`）・リスト（`-` / `1.`）・区切り線（`---`）の
 * 行頭記号も落とす。これらを残すと `<title>` や画像キャプションに
 * `### 見出し > 引用` のような生の記号がそのまま出てしまう。
 * 改行は空白 1 つに畳む（HTML の属性・1 行表示では改行が意味を持たないため）。
 */
export function stripMarkdown(content: unknown): string {
  return richTextToMarkdown(content)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 画像・リンク
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '') // 見出し
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')      // 引用
    .replace(/^[ \t]{0,3}(?:[-*+]|\d+\.)[ \t]+/gm, '') // リスト
    .replace(/^[ \t]{0,3}(?:[-*_] *){3,}$/gm, '') // 区切り線
    .replace(/[*_`~]/g, '')                   // 強調・コード
    .replace(/\s+/g, ' ')                     // 改行・連続空白を 1 つに畳む
    .trim();
}
