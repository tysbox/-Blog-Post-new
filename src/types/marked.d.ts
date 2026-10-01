/**
 * `marked`（v5.1.1）は型宣言を同梱していないため、本プロジェクトで利用する
 * API だけをここで宣言する。
 *
 * 注意: `@types/marked` は v6 以降「marked 本体が型を持つ」として非推奨の
 * スタブになっており、導入しても型は得られない（依存と lock が増えるだけ）。
 * そのため依存を追加せず、ローカル宣言で解決する。
 */
declare module 'marked' {
  export interface MarkedOptions {
    gfm?: boolean;
    breaks?: boolean;
    pedantic?: boolean;
    silent?: boolean;
    async?: boolean;
    /** marked 本体のオプションはバージョンで増減するため寛容に受ける。 */
    [option: string]: unknown;
  }

  export function parse(src: string, options?: MarkedOptions): string;
  export function parseInline(src: string, options?: MarkedOptions): string;

  /** 名前付き import（`import { marked } from 'marked'`）で使う本体。 */
  export const marked: {
    parse: typeof parse;
    parseInline: typeof parseInline;
  };

  export default marked;
}
