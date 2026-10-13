# Walkthrough — ドロワー / カルーセル / リッチテキスト改行の修正

最終結果のみを記載。失敗や途中経過は含まない。

- 対象: `/Users/tysbox/Project/blog-post`
- ビルド: **13ページ成功** / 型エラー **0件**
- 直近のコミット: `679e084`（start.command がシートを同時起動する旨を追記）

---

## 1. 症状

| # | 症状 | 発生条件 |
|---|---|---|
| 1 | 記事ページの **Index ドロワー**が開かない | 記事内リンクで移動したとき（Part1 以外） |
| 2 | 記事ページの **日本語アコーディオン**が開かない | 同上 |
| 3 | カルタの**カルーセル**が動かない | 同上 |
| 4 | リッチテキストエディタの**改行が反映されない** | 全テキスト欄 |
| 5 | ヒーロー画像下に **Markdown 記号が生表示**される | 全記事 |
| 6 | Keystatic で **Save しても一部の欄が反映されない** | `order` を空欄のまま保存した記事 |

---

## 2. 原因

### 2-1. ビュートランジション（症状 1〜3）

Astro の `<script>` はモジュールとして**初回しか実行されない**。`ClientRouter` による
クライアント遷移では DOM だけが差し替わるため、モジュール先頭で取得した要素参照が
**削除済みの古い DOM** を指したままになり、イベントが発火しなくなっていた。

| アクセス方法 | 結果 |
|---|---|
| URL を直接開く / リロード | 動く |
| 記事内リンクで移動 | **壊れる** |

Part1 だけ動いて見えたのは、そこへ直接アクセスしていたため。

### 2-2. YAML folded scalar の改行（症状 4）

Keystatic は複数行を YAML の folded scalar（`>`）で保存する。強制改行
（Shift+Enter）は行末 `\` で表現されるが、実際のファイルでは
**`\` の直後に空白が入った状態**（`...感じています。\ `）で書き出されていた。

```
YAML の folded scalar では `\` + 改行 = 改行を畳まない
しかし `\` + 空白 + 改行 は「畳む」動作になり、Markdown に `\ ` が残る
→ バックスラッシュがそのまま文字として表示される
```

### 2-3. `stripMarkdown()` の記号除去漏れ（症状 5）

`<title>` / `alt` / キャプション用のプレーンテキスト変換が `**` しか除去しておらず、
`###`（見出し）と `>`（引用）が残っていた。

### 2-4. `order: .nan` による記事読み込み失敗（症状 6）

`order` を空欄のまま Keystatic で Save すると、number フィールドは YAML に
`order: .nan` として書き出される（js-yaml は NaN を `.nan` で表現する）。
Zod の `z.number()` は NaN を拒否するため、**記事コレクション全体の読み込みが失敗**し、
その記事だけ古いキャッシュ内容が表示され続けていた。

```
[InvalidContentEntryDataError] blog → 2025-12-15-...-pt1
  order: Expected type `"number"`, received `"number"`
```

日本語文や画像が反映されて見えたのは、それらが**別の記事ファイル**に保存されていたため。

---

## 3. 修正

### 3-1. ビュートランジション対応（症状 1〜3）

要素の取得とバインドを `init()` の中で行い、`astro:page-load` のたびに再バインドする。
`data-*-bound` ガードで二重バインドを防ぎ、`document` / `window` へのリスナーは
1 回だけ登録する。

| ファイル | 対象 |
|---|---|
| `src/pages/blog/[...slug].astro` | Index ドロワー / 日本語ドロワー / 用語集注釈 / ブックマーク / シェア |
| `src/components/mdx/KarutaGrid.astro` | カルタのカルーセル |
| `public/scripts/fusuma-hero.js` | ポータルの FUSUMA ヒーロー |

### 3-2. 改行の正規化（症状 4）

`src/utils/richText.ts` に `normalizeKeystaticText()` を追加。

- `\` + 空白（半角 / 全角）→ 強制改行（Markdown のハードブレーク）に正規化
- 行頭の空白保持用エンティティ `&#x20;` を除去

`richTextToMarkdown()` の入口で適用するため、**すべてのテキスト欄に共通**。

### 3-3. `stripMarkdown()` の強化（症状 5）

行頭記号（見出し `#` / 引用 `>` / リスト `-` `1.` / 区切り線 `---`）を除去し、
改行・連続空白を空白 1 つに畳むようにした。

あわせて、ヒーロー画像の下にあったキャプション行（タイトル再掲 ＋ `FIG. 00 / ARCHIVE`）を
撤去した。不要になった `figLabel` ラベルは Keystatic の編集項目・スキーマ・既定値からも削除。

### 3-4. `order: .nan` の正規化（症状 6）

`src/content.config.ts` で NaN を「未入力」として扱う。

```ts
order: z.preprocess(
  (v) => (typeof v === 'number' && !Number.isFinite(v) ? undefined : v),
  z.number().optional(),
),
```

壊れていた `order: .nan` 行も該当ファイルから除去した。

### 3-5. 全テキスト欄のリッチテキスト統一

Keystatic のテキスト欄を**すべて同じ GUI（WYSIWYG）エディタ**（`fields.mdx.inline`）に統一。
描画側も全箇所を `set:html` + `richTextToHtml*()` に統一した。

| 区分 | 欄 |
|---|---|
| 記事 | `title` / `description` / `heroTitle` / `heroSubtitle` / `japaneseText` / `bodyText` |
| 記事内カルタ | `karutaTitle` / `titleJp` / `titleEn` / `bodyJp` / `bodyEn` |
| 画像 | `caption` |
| 用語集 | `description` |
| ポータル | FUSUMA テキスト / Prologue / Featured / Bundle / ニュースレター |
| Folio | デッキ名 / カード名 / カード説明 |
| カルタ | 見出し / 説明 / カード本文 |
| About & Contact | 全テキスト |
| 共通 | サイトタイトル / フッター文言 |

### 3-6. ヒーロー見出しのサイズと見出しレベル

- `heroTitle` / `heroSubtitle` を GUI エディタ化し、見出し（H3/H4）を選べるようにした
- 見出し記法がある場合は `<h1>` で包まず、そのタグをそのまま出力（入れ子の崩れを回避）
- 見出し記法が無い場合の既定サイズを `text-3xl〜5xl` → **`text-2xl sm:text-3xl md:text-4xl`** に縮小
  （サブタイトル `text-lg md:text-xl` と従来サイズの中間）
- 見出しレベルごとのサイズを `.hero-heading` に定義

---

## 4. 検証結果

### 4-1. 記事ページ（本番ビルド `astro preview`）

| ページ | 直接表示 | クライアント遷移後 |
|---|---|---|
| `from-kyoto-to-the-world` | Index ○ / 日本語 ○ / カルタ ○ | — |
| `shinto-...-pt1` | Index ○ / 日本語 ○ / カルタ ○ | Index ○ / 日本語 ○ / カルタ ○ |
| `shinto-...-pt2` | Index ○ / 日本語 ○ / カルタ ○ | Index ○ / 日本語 ○ / カルタ ○ |
| `shinto-...-pt3` | Index ○ / 日本語 ○ / カルタ ○ | Index ○ / 日本語 ○ / カルタ ○ |

### 4-2. 日本語ドロワーの描画

| ページ | 文字数 | 生 `\` | `&#x20;` | `<br>` |
|---|---|---|---|---|
| `from-kyoto-to-the-world` | 1498 | 0 | 0 | 0 |
| `shinto-...-pt1` | 2149 | 0 | 0 | 13 |
| `shinto-...-pt2` | 1481 | 0 | 0 | 1 |
| `shinto-...-pt3` | 1227 | 0 | 0 | 0 |

### 4-3. ルート

`/` `/blog/` `/blog/{slug}` ×4 `/about` `/contact` = **すべて 200**

### 4-4. Keystatic 編集画面

| 画面 | 結果 |
|---|---|
| 記事編集（既存） | リッチテキスト欄 5つ |
| 記事作成（新規） | リッチテキスト欄 5つ（タイトル / 概要 / ヒーロー見出し / サブタイトル / 日本語） |
| `home` / `about` / `site` / `labels` / `glossary` | すべて表示 OK |
| `folio` / `karuta` | すべて表示 OK |

### 4-5. コマンド

| コマンド | 結果 |
|---|---|
| `npx astro check` | **0 errors** |
| `npm run build` | **13ページ成功** |

---

## 5. 起動と編集環境のセットアップ確認

`start.command`（Finder ダブルクリック相当）を `MA_NO_OPEN=1` で実行し、
ブラウザ自動オープンを抑止したうえで検証した。

```
• Node: v22.23.3
=== 編集セッションを開始します ===
  • 作業ディレクトリ: /Users/tysbox/Project/blog-post
  • node_modules: 外部キャッシュへの symlink ✓
--- 開発サーバー（Ctrl+C で停止）---
  • スプレッドシート型エディタを起動します（http://127.0.0.1:4322）…
  • スプレッドシート型エディタを起動しました ✓（http://127.0.0.1:4322/）
 astro  v7.3.5 ready in 803 ms
┃ Local    http://127.0.0.1:4321/
  • サーバーが起動しました: http://127.0.0.1:4321/keystatic
```

| 確認項目 | 結果 |
|---|---|
| Node 解決（`.nvmrc` / `engines.node`） | v22.23.3 ✓ |
| `node_modules` の外部キャッシュ symlink | 健全 ✓ |
| 依存のバージョン同期（`npm ls --depth=0`） | 一致（`npm install` 不要）✓ |
| Git インデックス自己修復 | 不要（健全）✓ |
| 開発サーバー（4321） | 起動 ✓ |
| スプレッドシート型エディタ（4322） | 同時起動 ✓ |
| ポート占有ガード | 該当なし ✓ |

### 5-1. 起動後の応答

| URL | 結果 |
|---|---|
| `http://127.0.0.1:4321/keystatic` | 200 |
| `http://127.0.0.1:4321/` | 200 |
| `http://127.0.0.1:4322/api/state` | 200 |

### 5-2. 起動後の画面

| 画面 | 結果 |
|---|---|
| Keystatic 記事編集 | リッチテキスト欄 5つ / Not found なし |
| スプレッドシート型エディタ | 「カルタ / 用語集 スプレッドシート」表示 |
| `/` | 本文 3043 文字 |
| `/blog/` | 本文 1698 文字 |
| `/blog/shinto-...-pt1` | 本文 6979 文字 |
| `/about` | 本文 2726 文字 |

---

## 6. 変更ファイル

| ファイル | 内容 |
|---|---|
| `src/utils/richText.ts` | `normalizeKeystaticText()` / `richTextToHtmlHeading()` / `hasMarkdownHeading()` / `stripMarkdown()` 強化 |
| `src/utils/readTime.ts` | **新規** 通読所要時間の共通ヘルパー |
| `src/pages/blog/[...slug].astro` | ビュートランジション対応 / ヒーロー見出し / キャプション撤去 |
| `src/pages/blog/index.astro` | タイトル・概要の Markdown 描画 |
| `src/pages/index.astro` | ポータル各欄の Markdown 描画 / Folio カードのリンク化 / 読了時間 |
| `src/pages/about.astro` | About 各欄の Markdown 描画 |
| `src/components/mdx/KarutaGrid.astro` | ビュートランジション対応 / 各欄の Markdown 描画 |
| `src/components/PortalLayout.astro` | FUSUMA テキストの Markdown 描画 |
| `src/components/PortalShelf.astro` | Bundle の Markdown 描画 |
| `src/components/Header.astro` / `Footer.astro` | サイトタイトル / フッター文言の Markdown 描画 |
| `src/layouts/BlogPost.astro` | 同上 |
| `src/utils/glossary.ts` | 用語集 POPUP の Markdown 描画 |
| `src/content.config.ts` | `order` の NaN 正規化 / `figLabel` 削除 |
| `keystatic.config.ts` | 全テキスト欄の GUI エディタ化 / `figLabel` 削除 |
| `public/scripts/fusuma-hero.js` | ビュートランジション対応 / `innerHTML` 化 |
| `src/content/labels/ui.json` / `src/utils/uiLabels.ts` | `figLabel` / `pageRange` 削除 |
| `MANUAL.md` | テキスト欄の Markdown 対応表 / 改行の扱い / ビュートランジション注記 |

---

## 7. 守るべき不変条件（追加分）

1. **テキスト欄はすべて `fields.mdx.inline`**（`fields.text` を混在させない）
2. **描画は `richTextToHtml*()` を通す**（`stripMarkdown()` は `<title>` / `alt` 用のみ）
3. **クライアント遷移で動く UI は `astro:page-load` で再バインド**する
   （`data-*-bound` ガード必須。`document` / `window` のリスナーは 1 回だけ登録）
4. **`order` は空欄のまま保存してよい**（`.nan` は読み込み時に無視される）
