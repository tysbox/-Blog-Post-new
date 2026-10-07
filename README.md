# 間　MA (Vide Signifiant) — Blog / Portal

Astro 7 による日本語・英語のブログ＋ポータルサイト。**Keystatic** でコンテンツを編集し、
静的生成（`astro build`）した成果物を Cloudflare Pages に配信します。

> CMS は Tina CMS から **Keystatic へ完全移行済み**です（Tina 関連の設定・スクリプトは削除済み）。
> 移行の経緯は [WALKTHROUGH.md](WALKTHROUGH.md) を参照してください。

## 技術スタック

| 領域 | 採用 |
| --- | --- |
| フレームワーク | Astro 7.3 |
| CMS | **Keystatic** (`@keystatic/astro` / `@keystatic/core`) |
| スタイル | Tailwind CSS 4.3（`@tailwindcss/vite`） |
| 統合 | `@astrojs/mdx` / `@astrojs/react` / `@astrojs/sitemap` / `@astrojs/rss` |
| ランタイム | **Node.js 22.23.3**（`.nvmrc` / `.node-version` で固定） |

## セットアップ

```sh
nvm use                 # .nvmrc (22.23.3) に切り替え。preinstall が完全一致を要求します
npm ci                  # 依存をインストール（package-lock.json から再現）
npm run dev             # 開発サーバー起動
```

> `npm install` / `npm ci` は `preinstall` フックで **Node のバージョンを厳密に検証**します。
> `.nvmrc` と一致しない場合はすぐに失敗します（`.npmrc` の `engine-strict=true` と併用）。

## ワンクリックで編集を始める

毎回ターミナルでコマンドを手打ちしなくてよいよう、ランチャーを用意しています。

| 方法 | 操作 |
| --- | --- |
| **Finder から** | リポジトリ直下の **`start.command`** をダブルクリック |
| **ターミナルから** | `npm run edit` |

どちらの場合でも、以下を自動的に順番に処理します。

1. `.nvmrc`（Node 22.23.3）へ切り替える。未インストールなら `nvm install` して続行
2. `node_modules` が外部キャッシュへの symlink であることを保証する（無ければ `npm ci`）
3. **依存バージョンの同期**：`npm ls --depth=0` で `package.json` との一致を検査し、不一致なら
   `npm install` を実行してから続行（依存をバージョンアップした直後でも古いまま起動しません）
4. 開発サーバーを起動し、応答したら **ブラウザで管理画面 `/keystatic` を自動で開く**
5. 既にサーバーが起動中の場合は、重複起動せずブラウザを開くだけで終了
6. ポート 4321 が別プロセス（例: `npm run preview`）に使われている場合は、その旨を表示して停止

開発サーバーはフォアグラウンドで動き続けるので、ログ確認や `Ctrl+C` による停止操作はそのままできます。
Finder から起動した場合は、失敗時のみウィンドウが保持されます（メッセージを読んで Enter で閉じる）。

> 実体は `scripts/start-editing.sh` です。`start.command` はそのラッパーなので、
> 挙動を変えたいときは `scripts/start-editing.sh` を編集してください。
> `Dock` に `start.command` のエイリアスを作っておくと、そこから直接起動できます。

### 別デバイスで編集を始める / 最新状態に追いつく

**他のデバイスで最新の状態にするときも、`start.command` を実行するだけで完了します。**
Node の切り替え・依存の再インストール・外部キャッシュの更新・管理画面の表示まで自動です。

```sh
git pull                      # または git clone → git checkout <作業ブランチ>
./start.command               # Finder ならダブルクリック
#   → Node 22.23.3 を解決 → 依存を package.json と同期 → /keystatic が開く
```

- 依存を更新した直後（`package.json` / `package-lock.json` が更新された後）でも、
  上記「3. 依存バージョンの同期」が差分を検出して `npm install` を実行するため、
  **手動での `npm install` は不要**です。
- 外部キャッシュ（`~/Library/Caches/com.tystudio/<repo>/node_modules`）が古い場合は、
  新しいインストール結果でキャッシュ側を置き換えます（旧バージョンが残ったままの起動を防ぎます）。
- ターミナルから実行したい場合は `npm run edit` でも同じ処理になります。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run edit` | **編集セッションをワンクリック開始**（Node切替 → 依存確認 → サーバー起動 → 管理画面を開く） |
| `npm run dev` | 開発サーバー起動（`http://127.0.0.1:4321`）／Keystatic 管理画面つき |
| `npm run dev:keystatic` | `dev` と同義（明示用エイリアス） |
| `npm run sheet` | **カルタ / 用語集のスプレッドシート型エディタ**（`http://127.0.0.1:4322`） |
| `npm run build` | 静的ビルド（出力: `dist/`） |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run astro -- check` | 型チェック（`@astrojs/check`） |
| `npm run check:node-version` | `.nvmrc` と現在の Node の一致を検証 |
| `npm run check:glossary` | 用語集の語が記事本文に実在するか検証（0件の語を検出） |
| `npm run deps:check` | `node_modules` 内の重複フォルダ（`* 2`）を検出 |
| `npm run deps:externalize` | `node_modules` をキャッシュ（リポジトリ外）へ移動し symlink 化 |
| `npm run deps:localize` | 外部化した `node_modules` をリポジトリ内に戻す |
| `npm run clean:caches` | Vite キャッシュ削除（`node_modules/.vite`） |
| `npm run backup:icloud` | ソースのみをバックアップ先へ同期（`node_modules`/`dist` 等は除外） |

## コンテンツ編集（Keystatic）

```sh
npm run dev
# → 管理画面: http://127.0.0.1:4321/keystatic
```

Keystatic の管理画面は **ローカル開発時のみ**利用できます（`astro.config.mjs` で dev 時のみ有効化）。
本番環境では管理画面は公開されません。`/admin` は旧 Tina の入口だったため、現在は開発時に
`/keystatic` へリダイレクトします。

| 対象 | パス |
| --- | --- |
| ブログ記事（本文ブロック含む） | `src/content/blog/*.mdx` |
| **用語集（Glossary）** | `src/content/glossary/*.json` |
| フロントページ（FUSUMA / Prologue / 注目記事 / Bundle / ニュースレター） | `src/content/portal/home.json` |
| Folio（デッキ＋カード） | `src/content/folio/folio.json` |
| Karuta（空間語彙のカルタ） | `src/content/karuta/karuta.json` |
| About & Contact | `src/content/global/about.json` |
| ヘッダー / フッター（サイト名・ロゴ・SNS・著作権） | `src/content/global/config.json` |
| SEO / ナビ（既定タイトル / 説明 / OG画像 / Archive / ナビ / SNS） | `src/content/config/config.json` |

サイト全体の設定値（レイアウトが直接読み込む静的 JSON）は `src/content/settings/site.json` です。

### 用語集（Glossary）を追加するときの注意

用語集は「記事の英語本文に実在する語」を登録すると、その語がハイライトされ、
タップで注釈が POPUP します。登録時に次の 2 点に注意してください。

1. **「スラッグ (slug)」欄に入力すると、下の「Slug」が自動生成されます。**
   「用語 (term)」欄だけでは自動生成されません。Slug が空のまま Create すると
   `Slug must not be empty` で失敗します。
2. **本文に出てこない語はハイライトされません。** 登録前に
   `npm run check:glossary` で本文中の出現を確認できます（0 件の語を検出して終了コード 1）。

編集の全体像（ルーティング、ファイル命名、Index 番号の決まり方、Folio／日本語版の扱いなど）は
**[MANUAL.md](MANUAL.md)** にまとめています。

### カルタ / 用語集をまとめて編集する（スプレッドシート型エディタ）

カルタと用語集は件数が多く、1 件ずつ管理画面を開くより表で見渡したいことがあります。
その場合は Keystatic とは別に、同じ JSON を直接読み書きするローカルアプリを使えます。

```sh
npm run sheet
# → http://127.0.0.1:4322/ が開きます
```

- **Keystatic の編集構造は変わりません。** 書き込むファイルは
  `src/content/karuta/karuta.json` と `src/content/glossary/*.json` のままで、
  スキーマ・フィールド順・ファイル配置も維持されます。Keystatic での個別修正も従来どおり可能です。
- 表のセルを直接編集し、**保存**（`Cmd/Ctrl + S` でも可）でファイルに反映します。
- 用語集の「本文での出現」列は `npm run check:glossary` と同じ判定で、記事本文に実在する回数を表示します。
- **CSV 出力 / CSV 取込**で表計算ソフトと受け渡しできます（タブ区切りにも対応）。
- 保存のたびに `.sheet-backups/<日時>/` へ退避し、**バックアップ**から復元できます（最大 20 世代）。
- ポートを変えたい場合は `SHEET_PORT=4400 npm run sheet`、ブラウザを自動で開かない場合は
  `SHEET_NO_OPEN=1 npm run sheet` を使います。

> 保存時は既知のフィールドだけを更新し、Keystatic 側で追加された未知のフィールドは元の位置のまま保持します。
> 内容が変わらない保存ではファイルの差分は発生しません。

## アニメーション / エフェクト一覧

サイト内で動くものの全一覧です。実装は **CSS（`src/styles/global.css`）** と
**JS（`public/scripts/fusuma-hero.js` / 各コンポーネントの `<script>`）** の2系統に分かれます。

### 1. FUSUMA（襖）ヒーロー — トップページ

画像とメッセージを**直列**に巡回させる 14 秒 1 サイクルの演出です。
テキストとイメージが同時に動く瞬間を作らないことで、明るい写真にテキストが重なったときの
「光って見える」現象を避けています。

#### 1-a. オープニング（襖が開いた瞬間）

襖が開いた直後は**画像を一切出さず**、暗転の上に固定テキスト
（`data-opening-json` = `fusumaTexts` の1件目「Traces of the Invisible」）だけを表示します。
初回表示と `間` ボタンによる再表示のどちらでも同じ演出になります。

| 時刻 | フェーズ | 実装 |
| --- | --- | --- |
| 0.0s | 襖が開き始める（2.25s） | `.fusuma-open` |
| 1.0s | 固定テキスト フェードイン開始（1s） | `OPENING_TEXT_IN_AT = 1000` |
| 4.0s | 固定テキスト フェードアウト開始（1s） | `OPENING_TEXT_OUT_AT = 4000` |
| 5.0s | テキスト完全消滅 → 画像0 のフェードインへ | `OPENING_END = 5000` |

オープニング終了時点では表示中の画像が1枚も無いため、通常の `step()` をそのまま呼ぶと
「消す対象が無いのに 3 秒待ってから次のテキストが出る」＝**テキストが連続する**状態になります。
これを避けるため `prelude()` を挟み、フェードアウトを省いていきなり画像0をフェードインさせます。
結果として **テキスト → 画像 → テキスト → 画像 …** と必ず交互に巡ります。

#### 1-b. 通常サイクル（14s）

| 時刻 | フェーズ | 実装 |
| --- | --- | --- |
| 0.0s | 前イメージ フェードアウト開始（3s） | `.hero-slide` `transition: opacity 3s` |
| 3.0s | メッセージ フェードイン開始（1s） | `.hero-text-block` `transition: opacity 1s` |
| 4.0s | 暗転（2s）— メッセージ全表示 | `fusuma-hero.js` の `BLACK` |
| 6.0s | メッセージ フェードアウト開始（1s） | 同上 |
| 7.0s | 次イメージ フェードイン開始（3s） | `.hero-slide` |
| 10.0s | ハイライト（4s） | `.hero-slide.highlight` `filter: contrast(1.08) brightness(1.04)` |
| 14.0s | 次のサイクルへ | `STEP = 14000` |

- **襖の開閉**：`.fusuma-panel` が `transform: translateX(±100%)` で左右へ開く
  （`transition: transform 2.25s cubic-bezier(0.25, 1, 0.5, 1)`）。`.fusuma-open` の付け外しで制御。
- **スモーク風ハロー**：`.hero-title` / `.hero-subtitle` の多重 `text-shadow`。
  グロー要素（`filter: blur`）は撤去済み — `filter` は合成レイヤーを作るため、
  フェード開始時の再ラスタライズで一瞬光るフリッカーを起こすためです。
- **`間` トリガーボタン**：`#ma-trigger-btn` がホバーで `scale(1.04)`、押下で `scale(0.96)`。
  クリックすると扉を閉じ（2.25s）→ 開き直し、**オープニング演出から再スタート**します。
- **`prefers-reduced-motion`**：`fusuma-hero.js` が `matchMedia` で検出し、CSS 側も
  `transition/animation: none !important` で停止します（オープニングは行わず画像0を静的表示）。

### 2. Book stack deck（フォリオ） — トップページ

カードが重なった束を、ホバーで扇状に展開する演出です。

- **束の展開**：`.book-deck-container:hover` で高さ `570px → 790px`
  （`transition: height 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)`）。
  各カードが `translateY(95/190/285px)` と `translateX(-4/-8/-12px)` で段階的にずれます。
- **タイトルの退避**：`.book-card-title` が展開時に `translateY(12px)` だけ下がり、
  手前のカードに隠れるのを防ぎます（カード寸法・重なり量は変えません）。
- **2段階ホバー**：
  1. カード本体（下部タイトル）へホバー → `z-index: 50` で最前面へ浮上
  2. 上部イメージ `.book-card-hero` へホバー → `.book-card-preview` が `opacity: 0 → 1`（0.3s）
- 要約を `.book-card-hero` の**子**に置くことで、要約上へポインタが移ってもホバーが途切れず、
  要約内リンクも操作できます（判定のちらつき防止）。

### 3. 用語集（Glossary）注釈 — 記事ページ

英語本文中の用語をタップすると注釈が POPUP する仕組みです。

- **対象範囲**：`src/pages/blog/[...slug].astro` の `section.bodyText` のみ。
  CSS が `.article-body .gloss` にスコープされているため、ヒーロー・`<title>`・OGP・
  画像 `alt`・カルタ・日本語本文は自動的に除外されます。
- **見た目**：本文インク `#1b1c1a` → パープリッシュナイトブルー `#3d3a6b`、
  控えめな点下線（`underline dotted #8f8bb8 1px`）。ホバー / フォーカスで実線化。
- **POPUP の開閉**：`aria-expanded` の切り替えのみで、CSS が `display: block` にします。
  外側クリック・`Escape` で閉じます。
- **画面端の補正**：開いた瞬間に POPUP の実寸を測り、左右端から 8px 内側に収まるよう
  `--gloss-shift` を設定します。上に余白が無い場合は `data-gloss-flip="1"` で下側に開きます。
  ウィンドウリサイズ時も再補正します。
- **ビュートランジション対応**：`ClientRouter` 遷移直後にも確実にバインドするため、
  即時と `astro:page-load` の両方で初期化します（`data-gloss-bound` ガードで二重バインドを防止）。

> 用語集の語は**記事の英語本文に実在する必要があります**。本文に出てこない語は
> ハイライトされません。`npm run check:glossary` で検出できます。

### 4. Karuta（空間語彙のカルタ） — 記事ページ

- **カードのホバー**：イメージが `scale(1.10)`（0.7s）、
  下部グラデーションが `opacity: 0.2` へ、白いオーバーレイ `.karuta-overlay` が
  `opacity: 0 → 1`（0.3s）で内容を表示。
- **内容のせり上がり**：`.karuta-content` が `translateY(2px) → 0`（0.3s）。
- **タップ固定**：カードをクリックすると `.active` がトグルされ、
  ホバーが外れても内容が開いたままになります（`.group.active` の `!important` ルール）。
- **カルーセル**：前/次ボタンとドットでページ切り替え。ドットは `transition-colors` で
  現在位置を `#6f4229` に変えます。

### 5. マイクロインタラクション

| 対象 | 効果 |
| --- | --- |
| ヘッダー / フッターのリンク | `transition-colors` でホバー時に `#A36A4F` へ |
| ヘッダーのロゴ | `transition-transform hover:scale-105` |
| ポータルシェルフのカード | `hover:shadow-lg`、イメージ `group-hover:scale-105`（0.5s）、要約オーバーレイ `opacity 0 → 1`（0.3s） |
| お問い合わせフォーム | 入力欄の `transition-colors duration-300`、送信ボタンのホバー |
| 記事の目次 / 言語ドロワー | `.animate-fade-in`（`maFadeIn` 0.25s：`opacity 0→1` + `translateY(-4px)→0`） |
| 言語ドロワーのシェブロン | `style.transform` を `rotate(0deg)` ⇄ `rotate(180deg)` |
| ブックマークボタン | アイコンが `bookmark_border` ⇄ `bookmark`、色が `#6f4229` に |
| トースト | 3 秒表示して自動で `hidden` |
| 「もっと見る」バッジ | Tailwind `animate-bounce` |
| ページ遷移 | `ClientRouter`（`astro:transitions`）によるビュートランジション |
| スクロール | `html { scroll-behavior: smooth }` |

### 6. モーション設定の尊重

`@media (prefers-reduced-motion: reduce)` で以下を停止します。

- `html { scroll-behavior: auto }`
- `.fusuma-panel` / `.hero-slide` / `.hero-text-block` / `.book-page-card` /
  `.book-card-title` / `.book-card-preview` / `.animate-fade-in` の
  `transition` と `animation` を `none !important`
- `fusuma-hero.js` は `matchMedia('(prefers-reduced-motion: reduce)')` を検出して
  巡回を停止します

## ディレクトリ構成

```text
.
├── astro.config.mjs        # Astro 設定（Keystatic は dev 時のみ有効）
├── keystatic.config.ts     # Keystatic のコレクション定義
├── public/                 # 静的アセット（images / scripts）
├── scripts/                # 運用・移行・検証スクリプト
├── tools/sheet/            # カルタ / 用語集のスプレッドシート型エディタ（npm run sheet）
└── src
    ├── components/         # Astro/React コンポーネント（mdx/ 配下に画像グリッド等）
    ├── content/            # Keystatic の編集対象（上表）
    ├── content.config.ts   # Astro の Content Collections 定義
    ├── layouts/            # BaseLayout / PortalLayout / BlogPost など
    ├── pages/              # ルーティング（/ , /blog/[slug] , /about , /contact , /rss.xml）
    ├── styles/             # global.css（FUSUMA / book-deck / Karuta 等のユーティリティ）
    └── utils/              # toc 抽出・richText 変換など
```

## Node バージョンと依存の運用

- Node は **22.23.3** に統一しています（`.nvmrc` / `.node-version` / `package.json` の `engines`）。
- Astro 7 系は **Node 22.12.0 以上**を要求します（`package.json` の `engines` は `>=22.19.0`）。
  そのため Node 20 系では `npm ci` が `EBADENGINE` で失敗します。
- 依存のバージョンを更新して `package.json` / `package-lock.json` が変わった場合は、
  `start.command`（`npm run edit`）が起動時に差分を検出して自動で同期します。
  手動で揃えたい場合のみ `npm install` を実行してください。
- Cloudflare Pages は `.nvmrc` を読み取って Node 22.23.3 を使用します。
  ダッシュボードに `NODE_VERSION` 環境変数が設定されている場合は、そちらが優先される点に注意してください
  （`22.19.0` 以上に設定してください）。

## iCloud / バックアップ運用

`node_modules` は iCloud 同期フォルダ内に置くと肥大化・重複（`* 2` フォルダ）の原因になるため、
**リポジトリ外のキャッシュ**に置いて symlink で参照します。

```sh
npm run deps:externalize   # ~/Library/Caches/com.tystudio/<repo>/node_modules へ移動
npm run deps:localize      # リポジトリ内に戻す
npm run backup:icloud      # ソースのみを $HOME/Desktop/Blog-Post-backup へ同期
```

> `npm ci` は `node_modules` を削除して作り直すため、symlink が実ディレクトリに置き換わります。
> 実行後は外部キャッシュを整理してから `npm run deps:externalize` を再実行してください（下記「トラブルシューティング」参照）。

## トラブルシューティング

`node_modules` 内に重複フォルダ（`@astro 2` など）ができた場合や、`package-lock.json` と実体を
完全に一致させたい場合は、依存をすべて作り直します。

```sh
nvm use                                                             # Node 22.23.3
rm -rf node_modules .astro dist                                     # symlink を削除
rm -rf "$HOME/Library/Caches/com.tystudio/Blog-Post-new/node_modules"  # 外部キャッシュも削除
npm ci                                                              # lock から再現インストール
npm run deps:externalize                                            # キャッシュへ移動して symlink 化
```

> **まず `start.command` を試してください。** 依存の不一致（バージョン更新後の旧残り）や
> symlink のリンク切れ、外部キャッシュの陳腐化は、起動時に自動で検出・修復されます。
> 上記の手順は、それでも解消しない（キャッシュ自体が壊れている等）場合の最終手段です。

> 外部キャッシュを残したまま `npm ci` すると、プロジェクト内に実ディレクトリの `node_modules` ができ、
> `deps:externalize` が「外部ターゲットが既に存在する」として失敗します。その場合は上記のように
> キャッシュを先に削除してください。

### Keystatic の管理画面が真っ白（何も表示されない）

`/keystatic` は HTTP 200 を返すのに画面が空、という症状です。ブラウザのコンソールに
`504 (Outdated Optimize Dep)` や `Failed to fetch dynamically imported module` が出ていれば
これに該当します。

**原因**：Vite の依存最適化（dep optimizer）が開発サーバー起動後に再実行され、
`browserHash` が変わると、既に配信済みの `keystatic-page.js` が古い `?v=` を参照し続けて
504 になります。アイランドのハイドレーションが失敗するため画面が空になります。

**対処**：`astro.config.mjs` の `optimizeDeps.include` に `@keystatic/core` を入れて
起動時に事前バンドルさせ、再最適化を起こさないようにしています（設定済み）。
それでも発生した場合は Vite キャッシュを消して再起動してください。

```sh
npm run clean:caches   # node_modules/.vite を削除
npm run dev
```

> `@keystatic/core` を `exclude` にしてはいけません。`lodash` などの CJS 依存の
> interop が壊れ、`does not provide an export named 'default'` で同じく真っ白になります。

### 用語集の語がハイライトされない

| 症状 | 原因 / 対処 |
| --- | --- |
| Keystatic の一覧には出るが本文でハイライトされない | その語が**記事の英語本文に存在しない**。`npm run check:glossary` で確認 |
| 登録直後に反映されない | 開発サーバーのコンテンツ監視が新規 JSON を拾わないことがあります。`npm run dev` を再起動 |
| Create で `Slug must not be empty` | 「スラッグ (slug)」欄が空。ここに入力すると下の「Slug」が自動生成されます |
| 一覧に追加した項目が見えない | Keystatic のテーブルは仮想スクロールです。下へスクロールしてください |
| ヒーローや日本語本文でハイライトされない | 仕様です。注釈は記事の英語本文（`.article-body`）のみが対象です |

## クレジット

テーマの原型は [Bear Blog](https://github.com/HermanMartinus/bearblog/) です。
