# Step 3 以降 変更内容 Walkthrough

最終結果のみを記載。失敗や途中経過は含まない。

- 対象: `/Users/user/Desktop/Blog-Post-new`
- ビルド: **17ページ成功** / 型エラー **0件**
- 参照プロトタイプ: `/tmp/ma-portal/src/App.tsx`, `/tmp/mablogx/src/App.tsx`

---

## 1. デザイン適用（2Sight）

### 1-1. ポータル（`/`）

`/tmp/ma-portal/src/App.tsx` に準拠し、セクション順を 1:1 で再現。

| # | セクション | 内容 |
|---|---|---|
| 1 | FUSUMA Hero | 襖（`静寂` / `幽玄`）＋ 画像/テキスト分離サイクル |
| 2 | Prologue | `PROLOGUE` ラベル＋ 見出し＋ 引用 |
| 3 | Featured Page Card | 画像600px＋右テキスト（注目記事） |
| 4 | Vol. I Bundle | 2記事、ホバーで記事紹介プレビュー |
| 5 | Anthology & Folios | デッキ（2列×3段＝最大6枚）＋ホバー紹介 |
| 6 | Dispatches from Kyoto | ニュースレター（編集可能） |
| 7 | Footer | サイト名＋著作権＋SNSリンク |

### 1-2. ブログ記事（`/blog/{slug}`）

`/tmp/mablogx/src/App.tsx` に準拠。

固定ヘッダー → 記事ヘッダー → Hero（FIG.00キャプション）→ Trigger Bar（INDEX / 日本語）→ Frosted Glass TOC Drawer → 本文 → Karuta → Pagination → Editorial Footer。

### 1-3. 共通ヘッダー／フッター

全ページで共通化。タイトル `間　MA (Vide Signifiant)` は全ページ **黒**（`text-gray-900`）。

---

## 2. Index（目次）

### 仕様
- **全記事6件**を Index トリガーの直下に展開
- 幅 **500px**（`sm:w-[500px]`）
- **透過率75%**（`background-color: rgba(252, 249, 245, 0.25)` ＋ `backdrop-filter: blur(24px)`）
- 並び: **Index 章順（公開日の昇順）**。第一回目が `NO.01`
- 現在記事はハイライト表示
- トリガーラベル: `(All Articles · 6)`

### セクション抽出
`src/utils/toc.ts` で本文から自動抽出。`##` / `###` 見出しに加え、**単独の `**ボールド行**`** もセクション見出しとして認識。

---

## 3. ページ送り（Pagination）

記事下部 `PREVIOUS ARTICLE`（←）／ `NEXT ARTICLE`（→）は **Index 章順**に従う。

- `←` = 1つ前の記事
- `→` = 1つ後の記事

---

## 4. Karuta（空間語彙のカルタ）

- **全ブログページ共通**で表示
- **1ページ3枚**のカルーセル（前後ボタン・ページドット付き）
- 上限 **100枚**
- 3枚以下の場合は操作ボタン非表示（1ページ完結）

### 表示要素
`壱 / 弐 / 参`、タグ（BOUNDARY / PURIFICATION / INTERVAL）、ローマ字、FOLIO ID、日本語/英語タイトル、`bodyJp` / `bodyEn`、カテゴリ、Material Symbols アイコン、2つのオーバーレイ（ベース＋記事紹介）。

---

## 5. コンテンツ編集（Keystatic）

| ページ | 対象 | パス |
|---|---|---|
| ブログ記事 | 記事・本文ブロック | `src/content/blog/*.mdx` |
| フロントページ | FUSUMA画像/テキスト・Prologue・注目記事・Bundle・ニュースレター | `src/content/portal/home.json` |
| **Folio** | デッキ＋カード（2列×3段＝最大6枚） | `src/content/folio/folio.json` |
| **Karuta** | カード（1ページ3枚・最大100枚） | `src/content/karuta/karuta.json` |
| About & Contact | 既存 | `src/content/global/about.json` |
| ヘッダー/フッター | サイト名・ロゴ・SNS・著作権 | `src/content/global/config.json` |
| SEO/ナビ | 既定タイトル/説明・OG画像・Archive・ナビ・SNS | `src/content/config/config.json` |

### スロット仕様

| 項目 | 件数 | 補完ロジック |
|---|---|---|
| 注目記事 | 1件 | 未指定なら最新記事 |
| **Vol. I Bundle** | **2記事** | 注目記事と重複除外、不足分は最新記事 |
| **Folio（デッキ）** | 2列×3段＝**最大6枚** | 6枚に満たない場合は最新記事 |

### FUSUMA

- **FUSUMA 画像**（最大5件）／ **FUSUMA テキスト**（最大5件）を分離
- 同じ番号どうしで対になり、`1 → 5 → 1` のサイクルで自動巡回

---

## 6. 技術的変更

| ファイル | 内容 |
|---|---|
| `src/styles/global.css` | mablogx トークン、FUSUMA CSS、book-deck CSS、Karuta utility |
| `tailwind.config.mjs` | v4 互換 utility（`shadow-xs` / `backdrop-blur-xs` / `rounded-xs`）、フォント |
| `src/components/BaseHead.astro` | OG画像・既定SEO を `config.json` から取得 |
| `src/components/mdx/ImageGrid.astro` | mablogx の画像グリッド（FIG.番号付き） |

---

## 7. Tina CMS の撤去（Keystatic 一本化）

CMS を **Keystatic のみ**に統一。Tina 関連の設定・スクリプトを撤去。

### 7-1. 削除したファイル

| 対象 | 内容 |
|---|---|
| `tina/` | Tina 管理画面・生成型定義 |
| `astro-tina-directive/` | Tina カスタム指令 |
| `scripts/start-tina-dev.mjs` / `.sh` | Tina 開発サーバー起動 |
| `scripts/verify-tina-astro.mjs` | Tina 検証 |
| `scripts/restore-blog-from-json.py` | Tina JSON 復元 |
| `scripts/convert-tina-json-to-mdx.mjs` | Tina→MDX 移行（移行完了・入力元なし） |
| `public/tina-astro-reflected.html` / `tina-full-blog.html` | Tina 検証用HTML |

### 7-2. 依存関係

`tinacms` / `@tinacms/cli` を `package.json` から削除。

### 7-3. 開発コマンドの修正

`npm run dev` が Tina を起動する設定で **Keystatic 管理画面が出ていない状態**だったため、`astro dev` に変更。

```json
"dev": "astro dev --host 127.0.0.1",
"dev:keystatic": "astro dev --host 127.0.0.1"
```

管理画面: **http://127.0.0.1:4321/keystatic**

### 7-4. 保持したデータ

移行前の生データは削除せずバックアップとして保持。

- `backup/tina-json-original/`（JSON 6件）

---

## 8. 制約遵守

- `contact.astro` / `about.astro` / `ContactForm.astro` … **未変更**
- 既存テキスト・画像の書き換え … **なし**（FUSUMA / Karuta / Folio はデータ移行のみ）
- 旧設定の削除: `settings`（補助設定）、`hero.slides`、`image1〜5`
