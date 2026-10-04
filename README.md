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
| `npm run build` | 静的ビルド（出力: `dist/`） |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run astro -- check` | 型チェック（`@astrojs/check`） |
| `npm run check:node-version` | `.nvmrc` と現在の Node の一致を検証 |
| `npm run deps:check` | `node_modules` 内の重複フォルダ（`* 2`）を検出 |
| `npm run deps:externalize` | `node_modules` をキャッシュ（リポジトリ外）へ移動し symlink 化 |
| `npm run deps:localize` | 外部化した `node_modules` をリポジトリ内に戻す |
| `npm run images:convert` | 画像変換（`scripts/convert-images.cjs`） |
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
| フロントページ（FUSUMA / Prologue / 注目記事 / Bundle / ニュースレター） | `src/content/portal/home.json` |
| Folio（デッキ＋カード） | `src/content/folio/folio.json` |
| Karuta（空間語彙のカルタ） | `src/content/karuta/karuta.json` |
| About & Contact | `src/content/global/about.json` |
| ヘッダー / フッター（サイト名・ロゴ・SNS・著作権） | `src/content/global/config.json` |
| SEO / ナビ（既定タイトル / 説明 / OG画像 / Archive / ナビ / SNS） | `src/content/config/config.json` |

サイト全体の設定値（レイアウトが直接読み込む静的 JSON）は `src/content/settings/site.json` です。

編集の全体像（ルーティング、ファイル命名、Index 番号の決まり方、Folio／日本語版の扱いなど）は
**[MANUAL.md](MANUAL.md)** にまとめています。

## ディレクトリ構成

```text
.
├── astro.config.mjs        # Astro 設定（Keystatic は dev 時のみ有効）
├── keystatic.config.ts     # Keystatic のコレクション定義
├── tailwind.config.mjs
├── public/                 # 静的アセット（images / scripts）
├── scripts/                # 運用・移行・検証スクリプト
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

## クレジット

テーマの原型は [Bear Blog](https://github.com/HermanMartinus/bearblog/) です。
