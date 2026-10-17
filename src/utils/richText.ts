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
 * 実際のファイルでは次の 3 パターンが観測された（いずれも強制改行の意図）:
 *
 *   1. `\` + 改行 + インデント  … Keystatic の markdoc format() が出す形
 *   2. `\` + 改行               … 再保存でインデントが落ちた形
 *   3. `\` + 空白               … YAML が「改行を畳む」動きになった形
 *
 * このほか、Keystatic が Markdown のエスケープとして書き出す残骸が
 * そのまま HTML に出ていた:
 *
 *   - `&#x20;` 行頭の空白を保持するための HTML エンティティ
 *   - `\-`     `-` のエスケープ（行頭の `-` がリストにならないように）
 *
 * ここでは全パターンを Markdown のハードブレーク（行末 `\` + 改行）に
 * 正規化し、エスケープ残骸を除去する。これで GUI エディタで入れた改行が
 * どの欄（日本語本文 / 英語本文 / 見出し / キャプション / 新規ページ含む）
 * でも同じように反映される。
 */
function normalizeKeystaticText(value: string): string {
  return value
    // 行頭の空白保持用エンティティ（表示上は空白 1 個で、装飾の意味は無い）
    .replace(/&#x20;/g, ' ')
    // `\-` は Keystatic のエスケープ残骸。実文字 `-` に戻す。
    .replace(/\\-/g, '-')
    // `\` + 空白（半角/全角）→ 強制改行。YAML が改行を畳んだ状態。
    .replace(/\\[ \t\u3000]+/g, '\\\n')
    // `\` + 改行 + インデント → 強制改行。markdoc format() の出力形式。
    // インデントを残すと marked が 4 スペースをコードブロックと誤認し、
    // 改行が `<br>` ではなく別ブロックになってしまうため除去する。
    .replace(/\\\\n[ \\t]+/g, '\\\\n');
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
    .join(chr(10)+chr(10))

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
    .replace(/\\/g, '')                       // ハードブレークの `\` 残骸
    .replace(/\s+/g, ' ')                     // 改行・連続空白を 1 つに畳む
    .trim();
}
