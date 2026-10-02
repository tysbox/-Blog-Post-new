# Step 3 以降 変更内容 Walkthrough

最終結果のみを記載。失敗や途中経過は含まない。

- 対象: `/Users/tysbox/Project/blog-post`
- ビルド: **17ページ成功** / 型エラー **17件**（§13-2 に引き継ぎ事项として記載）
- 参照プロトタイプ: `/tmp/ma-portal/src/App.tsx`, `/tmp/mablogx/src/App.tsx`
- 直近のコミット: `ec6d5d2`（Node 22.23.3 統一 / Tina 残骸撤去 / 日付欠落対策 / 編集ランチャー）

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

---

## 9. 実行環境の統一（Node.js 22.23.3）

| ファイル | 変更前 | 変更後 |
|---|---|---|
| `.nvmrc` | `20.19.6` | `22.23.3` |
| `.node-version` | `20.19.6` | `22.23.3` |
| `package.json` `engines.node` | `>=20.0.0` | `>=22.19.0` |

**理由**: `astro@5.18.1` → `unifont@0.7.5` → `undici@8.10.2` が `node >= 22.19.0` を要求する。`.npmrc` の `engine-strict=true` と組み合わさると、Node 20 系では `npm ci` / `npm install` が **EBADENGINE で失敗**し、Cloudflare Pages へのデプロイが成立しない状態だった。

`preinstall`（`scripts/check-node-version.mjs`）は `.nvmrc` との完全一致を要求するため、ローカル・CI とも Node 22.23.3 固定。

**Cloudflare Pages**: `.nvmrc` を尊重して Node 22.23.3 を使用する。ダッシュボードに `NODE_VERSION` 環境変数を設定している場合はそちらが優先されるため `22.19.0` 以上にすること。

---

## 10. `package-lock.json` の再生成

| 項目 | 変更前 | 変更後 |
|---|---|---|
| サイズ | 1.0MB | 543KB |
| エントリ数 | 1,937 | 993 |
| `tinacms` / `@tinacms` 関連エントリ | 159 | **0** |

- `package.json` と lock の不整合を解消（`tinacms` が root 依存に残っていた）
- **追加 0・バージョン変更 0**。純粋な減算であり、他の依存バージョンは一切変わらない
- 削除された559パッケージのうち、生存パッケージが依存しているものは **0件**
- `package.json`: 重複していた `dev:keystatic` スクリプトキーを削除

---

## 11. Tina 残骸の撤去（§7 の続き）

| 対象 | 内容 |
|---|---|
| `README.md` | Keystatic 前提へ全面書き換え（存在しない `tina:dev`、旧パス `/Users/tystudio/...` を除去） |
| `public/admin/` | Tina 管理画面 `index.html` を削除 |
| `public/*.html` 6件 | 未参照のまま `dist` にコピーされていた移行検証用HTMLを削除 |
| `scripts/sync-icloud-backup.sh` | 既定パスを `$HOME/Desktop/Blog-Post-backup` へ、`tina.log` 除外を削除 |
| `keystatic.config.ts` | 削除済みスクリプトへの言及コメントを修正 |

### 11-1. `/admin` の再定義

旧: `/admin` → `/admin/index.html`（Tina 管理画面）。自己リダイレクトで循環し、dev では Tina の壊れた画面、本番では 404 になっていた。

| 環境 | 挙動 |
|---|---|
| 開発 | `/keystatic` へ **302** |
| 本番ビルド | 管理画面は dev 専用のため**案内ページ**を表示（`noindex`） |

---

## 12. 日付欠落による表示・ビルド破壊の防止

`pubDate` が無い記事が 1 件あるだけで `/blog` のビルドが TypeError で失敗していた（`Cannot read properties of undefined (reading 'valueOf')` / EXIT=1）。

### 12-1. 共通ヘルパー（`src/utils/date.ts` 新設）

| 関数 | 仕様 |
|---|---|
| `toValidDate()` | 欠落・不正値は `null` を返す（例外を投げない） |
| `timestamp(...values)` | 最初の有効値を返す。全て無効なら `0` |
| `formatYear()` | 欠落時は**空文字**（`NaN` / `1970` を出さない） |
| `formatDate()` | 欠落時は**空文字** |

**方針**: 並び順は日付なしを**末尾**、表示は**空文字**、RSS は `<pubDate>` を出さない。

### 12-2. 修正した 13 箇所

| ファイル | 内容 |
|---|---|
| `src/pages/blog/index.astro` | `pubDate.valueOf()` の直接呼び出し、`getFullYear()` |
| `src/pages/blog/[...slug].astro` | ソート 2 箇所 |
| `src/pages/index.astro` | 記事の並び替え |
| `src/components/PortalLayout.astro` | 最新記事の解決 |
| `src/layouts/BlogPost.astro` | 最新記事の解決 |
| `src/components/Header.astro` | 最新記事の解決 |

### 12-3. 二重防御

1. Keystatic の `pubDate` は `validation: { isRequired: true }` → 編集画面から日付なし保存は不可
2. 上記ヘルパー → 手書き・外部インポートで日付落入が起きても**表示もビルドも壊れない**

---

## 13. 型チェック（`astro check`）

**37 件 → 17 件**。残存分は §13-2。

### 13-1. 解消した 20 件

| 種類 | 件数 | 内容 |
|---|---|---|
| `marked` の型宣言なし | 1 | `src/types/marked.d.ts` を新設。`@types/marked` は v6 以降の非推奨スタブのため**依存は追加しない** |
| 暗黙の any | 4 | `mdx/KarutaGrid.astro` の `(i: number)`、`pages/index.astro` に `DeckVolume` / `DeckChapter` 型を定義 |
| `unknown` 経由のプロパティアクセス | 2 | `pages/index.astro` の `o.sys` を `Record<string, unknown>` に明示キャスト |
| 日付の `Date \| undefined` | 13 | §12 の共通ヘルパー経由へ変更 |

### 13-2. 引き継ぎ事項（残存 17 件）

`astro check` は非ゼロ終了するため**現状 CI ゲートにはできない**（`npm run build` は型チェックしないため、デプロイには影響しない）。

| 種類 | 件数 | 内容 | 想定対応 |
|---|---|---|---|
| **A** union 型のナローイング不足 | 16 | `global` コレクションが `z.union([config, about])` のため `getEntry('global','config')` の戻り値が絞り込まれていない。`siteTitle` / `footerText` / `lpLogo` / `lpUrl` / `mainTitle` 等が `about` 側に無いとしてエラーになる | 呼び出し側で `_template === 'config'` による**判別（discriminant）ナローイング**を追加 |
| **F** `string \| undefined` の受け渡し | 1 | `layouts/BlogPost.astro` の `description` → `BaseHead`（`string` を期待） | `?? ''` 等で受け渡しを明確化 |

対象ファイル（A）: `components/Footer.astro`(2) / `components/Header.astro`(3) / `layouts/BaseLayout.astro`(1) / `layouts/BlogPost.astro`(2) / `pages/about.astro`(8)

**A を直す際の禁止事項**: `global` を `config` / `about` の 2 コレクションへ**分割**すると、Keystatic 設定・パス・データ移動・全参照の書き換えを伴い、デザイン回帰リスクが最大になる。ナローイング追加のみ推奨。

A を解消した後は **1 件（F のみ）** になる見込み。F まで直せば `astro check` を `scripts/pre-commit-check.sh` や CI に導入できる。

---

## 14. ワンクリック編集ランチャー

| 対象 | 内容 |
|---|---|
| `start.command` | Finder からダブルクリックするための入口（`100755`） |
| `scripts/start-editing.sh` | 実体（`100755`） |
| `package.json` | `"edit": "bash ./scripts/start-editing.sh"` を追加 |

**実行内容**

1. `.nvmrc`（Node 22.23.3）へ切替。未インストールなら `nvm install` して続行
2. `node_modules` が外部キャッシュへの symlink か確認。無ければ `npm ci` ＋ 外部化
3. 開発サーバー起動 → 応答したら**ブラウザで `http://127.0.0.1:4321/keystatic` を自動オープン**
4. 既にサーバーが起動中なら**重複起動せず**、ブラウザを開くだけで終了

- 開発サーバーはフォアグラウンドで動き、`Ctrl+C` で停止
- Finder から起動した場合は**失敗時のみ**ウィンドウを保持
- `MA_NO_OPEN=1` でブラウザ自動起動を抑止できる（動作確認用）

---

## 15. 検証結果

| 検証 | 結果 |
|---|---|
| `npm run build` | **17 ページ成功** |
| クリーン環境での `npm ci` ＋ `npm run build`（Cloudflare と同一手順） | **EXIT=0** |
| `dist` 出力（実ファイル 40 件）の SHA-256 | **変更前後で完全一致**（デザイン影響なし） |
| 日付なし記事を 1 件加えた状態でのビルド | **EXIT=0**（`NaN` / `Invalid Date` を含まない） |
| dev サーバー | `/` `/keystatic` `/blog` `/blog/{slug}` `/about` `/contact` = 200、`/admin` = 302 → `/keystatic` |
| `npm run edit` | 動作確認済み（起動・自動オープン・重複起動回避） |
| プロジェクト容量 | **32MB** |
| コミット | `ec6d5d2` |

---

## 16. 制約遵守（Step 4）

- 既存テキスト・画像の書き換え … **なし**
- `dist` 出力 … **バイト単位で不変**
- 依存 … **追加なし**（`package.json` の dependencies は不変。変更は scripts / engines のみ。`package-lock.json` は減算のみ）
- コンテンツ … **変更なし**（検証用の一時ファイルは作成後に削除済み）
- `about.astro` / `ContactForm.astro` のデザイン … **未変更**


---

## 17. ワンクリック編集ランチャーの自己修復化（デバイス変更時の再発防止）

`start.command` が「新しいデバイスで動かない」問題の原因を調査し、起動のたびに自動修復する仕組みへ変更した。

### 17-1. 原因（実測）

| # | 原因 | 症状 |
|---|---|---|
| 1 | `node_modules` の symlink が iCloud によって**リンクのまま**配送され、リンク先（`/Users/user/...`）が別デバイスに存在しない | 起動不可 |
| 2 | Finder から起動すると `PATH` が最小（`/usr/bin:/bin:/usr/sbin:/sbin`）で、`~/.local/bin` 等の `node` が見つからない | `Node: 未インストール` で停止 |
| 3 | nvm が無い環境では Hard fail する | 停止 |
| 4 | `.git/index` が欠損すると `fatal: bad object HEAD` | Git 操作が全て失敗 |
| 5 | `npm ci` は `node_modules` が symlink でも**実ディレクトリに置き換える** | 数百 MB が iCloud 同期対象のプロジェクト内へ回流 |
| 6 | `externalize-node-modules.sh --ensure-link` がキャッシュ親ディレクトリが無い状態で `mv` を実行 | 新規デバイスで外部化が失敗し 573MB が残る |

1〜6 はいずれも「プロジェクトファイル」ではなく**そのデバイスで生成された状態**。ファイルが同一でも環境が変わると再現する。

### 17-2. 修正（`scripts/start-editing.sh`）

各ステップを「検査し、壊れていれば直す」**冪等な判定**に変更。

| ステップ | 修正内容 |
|---|---|
| 0 | Finder 起動時の `PATH` 補完（`~/.local/bin` / `~/.volta/bin` / Homebrew） |
| 1 | Node 解決を nvm → volta → 既存の順に。**グローバル既定は変更しない**。`engines.node` で判定 |
| 2 | `[ -L node_modules ]` による誤判定を廃止。実体で解決できるか（`-d`）で判定し、リンク切れならこのデバイスのパスで再作成 |
| 3 | `.git/index` 欠損時に `git read-tree` で再構築 |
| — | `npm ci` の後に必ず外部化（回帰防止） |

### 17-3. 修正（`scripts/externalize-node-modules.sh`）

- `--ensure-link` に `mkdir -p "$cache_root"` を復元（新規デバイスで `mv` が失敗していた）
- キャッシュが既に存在する場合に**実体を `rm -rf` していた**不具合を修正（依存が全消去される）。キャッシュ側を正とするか、実体を移すかを見分けて処理

### 17-4. HTML 表示の自動オープン

`start.command` で Keystatic 管理画面に加え、HTML 表示（`http://127.0.0.1:4321/`）も自動オープンするようになった。

- `open_browsers()` 関数を追加し、既存の 2 箇所（起動済み時の即時オープン / 起動完了後）から呼び出す
- `MA_OPEN_SITE=0` で HTML のみ無効化できる（既定は `1`）
- `MA_NO_OPEN=1` の動作確認用モードは従来どおり両方を抑制

**`keystatic.config.ts` と `src/pages/admin.astro` は無変更**（SHA-256 で一致確認済み）。Keystatic 0.6.9 の `ui` は `brand` と `navigation` のみを受け付ける仕様で、外部リンクをサイドバーに追加する API は存在しないため、設定ファイルではなくランチャー側で実現した。

### 17-5. 検証結果

故障条件を意図的に作り、`start.command` を **Finder と同じ最小環境**（`env -i`、`PATH` 3個）で実行。

| 検証 | 故障条件 | 結果 |
|---|---|---|
| 1 | 外部キャッシュ皆無（新規デバイス） | 自動修復 → 全ルート 200/302 |
| 2 | 同上（別ディレクトリ） | 同上 |
| 3 | **リンク切れ symlink** ＋ キャッシュ皆無 | 検出 → 再作成 → `npm ci` → 全ルート 200/302 |
| 4 | **`node_modules` が 589MB 実体化** | 外部化 → **10MB** へ回収 → 全ルート 200/302 |

- 冪等性：2 回目以降は `npm ci` を実行せず起動
- ルート：`/` `/keystatic` `/blog` `/about` `/contact` = 200、`/admin` = 302
- プロジェクト容量：**1.4GB → 36MB**（依存は `~/Library/Caches` へ、 iCloud 同期外）
- `volta` の既定 runtime … **20.19.6 のまま**（22.23.3 はスクリプト内のみで使用）

---



