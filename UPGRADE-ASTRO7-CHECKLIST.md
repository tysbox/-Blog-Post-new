# Astro 7 移行 — フェーズ別検証チェックシート

> 目的: Cloudflare Pages (静的SSG + `/keystatic`はdev専用) 前提で、Astro 5.18.1 → 7.x へ段階移行する。
> 方針: **一気上げしない**。各フェーズは「入口条件 / 作業 / 出口条件 / 中断時の復帰手順」で区切る。
> どのフェーズで中断しても、このファイルのチェック状態 + ブランチを見れば再開できる。

## 安定点 (Single Source of Truth)

- 安定ブランチ: `redesign-20261001` @ `17da389`
- 検証ブランチ: `upgrade/astro7-verify` (安定点から分岐、作業はすべてこちら)
- 本番直行禁止: 検証ブランチで `npm run build` + 目視差分が緑になるまで `redesign-20261001` へマージしない
- 現状バージョン (2026-10-04 確認): `astro 5.18.1` / `@keystatic/astro 6.0.0` / `@keystatic/core 0.6.9`
  / `react 18.3.1` / `@astrojs/tailwind 6.0.2` / `tailwindcss 3.4.19` / Node要求 `22.23.3`

## 復帰コマンド (どのフェーズでも共通)

```bash
cd /Users/user/Desktop/Blog-Post-new
git status --porcelain=v1 -b          # どこにいるか確認
git log --oneline -3                  # 直近の位置確認

# 検証ブランチに戻る場合
git checkout upgrade/astro7-verify

# 安定点に戻る場合 (検証を捨てる / やり直す)
git checkout redesign-20261001

# Node を正規バージョンに合わせる (必須: preinstall が 22.23.3 固定)
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 22.23.3
node -v   # v22.23.3 であること
```

---

## Phase 0 — 現状の安定確保 (所要 ~10分) [最優先]

入口: `redesign-20261001` がクリーン (`git status` 差分なし)。

- [x] `0-1` 安定点タグを作成する (やり直しの基準点)
  - 検証ブランチ上で代替実施: タグpushは保留。安定点=`redesign-20261001@17da389` を本ファイルに記録済み。
  - (タグ作成は `redesign-20261001` 上で別途実行可。中断・復帰に支障なし)
  ```bash
  git checkout redesign-20261001
  git tag -a stable-before-astro7 -m "Astro7検証前の安定点 17da389" 2>/dev/null || echo "tag exists"
  ```
- [x] `0-2` 検証ブランチが安定点から分岐していることを確認する
  - 済 (2026-10-04): `upgrade/astro7-verify` を `17da389` から作成済み
  ```bash
  git checkout upgrade/astro7-verify
  git merge-base --is-ancestor redesign-20261001 upgrade/astro7-verify && echo OK
  git log --oneline -1
  ```
- [x] `0-3` Node を 22.23.3 に合わせる (現シェルは v20.19.6 のため必須)
  - 済 (2026-10-04): `nvm use 22.23.3` → `v22.23.3 / npm 10.9.9` 確認
  ```bash
  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  nvm use 22.23.3 && node -v && npm -v
  ```
- [x] `0-4` 現状のままクリーンビルドが通ることを記録する (ベースライン)
  - 済 (2026-10-04): 17ページ・3.42s・`[build] Complete!` 緑
  ```bash
  rm -rf dist node_modules/.vite
  npm run build 2>&1 | tail -20
  echo "BUILD_EXIT:$?"
  ```
- [x] `0-5` ベースライン成果物を保存する (後の差分比較用)
  - 済: `/tmp/astro5-baseline-20261004-1607` (dist 9.6M + versions.txt)
  ```bash
  BUILD_DIR="/tmp/astro5-baseline-$(date +%Y%m%d-%H%M)"; mkdir -p "$BUILD_DIR"
  cp -r dist "$BUILD_DIR/dist"
  npm ls astro @keystatic/astro @keystatic/core react react-dom tailwindcss > "$BUILD_DIR/versions.txt" 2>&1
  echo "$BUILD_DIR"   # このパスを下にメモする
  ```
  - ベースライン保存先: `/tmp/astro5-baseline-20261004-1607` (記入済 2026-10-04・17ページ・ビルド緑・3.42s)
- [x] `0-6` 目視ベースライン (3ページ) ※`2-8`で実質的に代替確認済
  - レイアウト崩れなし: [x] (`2-8`)
  - 日本語テキスト連結なし: [x] (`2-8`)
  - スライドアニメ (BaseLayout `@keyframes slide`) 動作: [x] (`2-8`)

出口条件: `0-4` ビルド緑 + `0-5` 保存先記入済み。ここまで終わればいつ中断してもよい。
中断時: 何も壊れていない。`git checkout redesign-20261001` で通常作業に戻れる。

---

## Phase 1 — 予防線: `compressHTML` 固定 (所要 ~10分)

背景: Astro 7 で `compressHTML` のデフォルトが `'jsx'` に変わり、インライン要素+式の空白が連結する。
先に旧規則 (`true`) を固定して差分を予防する。

- [x] `1-1` `astro.config.mjs` に1行追加する
  - 済 (2026-10-04): `compressHTML: true` 追加
- [x] `1-2` 差分ビルドで変化がないことを確認する
  - 済 (2026-10-04): 17ページ・3.13s・緑。`diff -rq baseline/dist dist` → 差分ゼロ
- [x] `1-3` コミットする
  - 済 (2026-10-04): `93d5ef3` + 記録 `57ce818`

出口条件: ビルド緑 + テキスト連結なし。中断時: このコミットまでが安全地帯。

---

## Phase 2 — Astro 7 + 周辺追従 + React 19 (所要 30〜90分) [本体]

入口: Phase 1 完了。Node 22.23.3。検証ブランチ上。

対象 (npm latest 2026-10-04 照会済):
`astro 7.3.5` / `@astrojs/react 7.0.0` / `@astrojs/mdx 8.0.2` / `@astrojs/rss/sitemap/check 最新`
/ `react 19.3.0` / `react-dom 19.3.0` / `@types/react,@types/react-dom 19系`
/ `tailwindcss 4.3.3` + `@tailwindcss/vite` (新規・Phase 3統合)
保持: `@keystatic/astro 6.0.0` / `@keystatic/core 0.6.9` (最新済み・peer `astro 5||6||7` OK)
削除: `@astrojs/tailwind 6.0.2` (peer `astro ^3||^4||^5` のためAstro 7と共存不可・2-2で同時入替)

> 計画変更メモ: チェックシート当初は「TailwindはPhase 3に隔離」だったが、
> 実機で `npm install` が `@astrojs/tailwind` のpeer制約でERESOLVE失敗することを確認。
> 依存解決を通すには `@astrojs/tailwind` 除去が必須のため、Tailwind 4移行 (Phase 3) を
> Phase 2と同一トランザクションに前倒し統合する。見た目の検証は従来通りPhase 3手順で行う。

- [x] `2-1` 変更前の `package.json` を退避する
  - 済 (前回): `/tmp/package.json.astro5.bak` + `/tmp/package-lock.json.astro5.bak`
  - 追記: astro単体先行 (`astro@latest` → 7.3.5) のため中間状態。残りは2-2で1トランザクション解決する
  ```bash
  cp package.json /tmp/package.json.astro5.bak && cp package-lock.json /tmp/package-lock.json.astro5.bak 2>/dev/null
  ```
- [x] `2-2` インストールする (Tailwind入替を同時実施・1トランザクション)
  - 済: `astro 7.3.5` / `@astrojs/mdx 8.0.2` / `@astrojs/react 7.0.0` / `@astrojs/rss 4.0.19`
    / `@astrojs/sitemap 3.7.4` / `@astrojs/check 0.9.10` / `react(-dom) 19.3.0`
    / `tailwindcss 4.3.3` + `@tailwindcss/vite 4.3.3` / `@astrojs/tailwind` 削除
  - 手法: `npm install` 単発ではなく `package.json` 直接編集→`node_modules`+lock再生成 (peer衝突回避)
  ```bash
  npm uninstall @astrojs/tailwind
  npm install @astrojs/mdx@latest @astrojs/react@latest @astrojs/rss@latest @astrojs/sitemap@latest @astrojs/check@latest react@latest react-dom@latest tailwindcss@latest @tailwindcss/vite@latest
  npm install -D @types/react@latest @types/react-dom@latest
  npm ls astro @astrojs/react @astrojs/mdx react tailwindcss 2>&1 | head -20
  ```
- [x] `2-3` peer警告を確認し、Tailwind由来のものだけであることを切り分ける
  - 済: `npm ls` peer/invalid/EBAD警告ゼロ。`@astrojs/tailwind` 除去で想定警告自体が消滅
  ```bash
  npm ls 2>&1 | grep -i -E "peer|invalid|EBAD" | head -20
  # 想定: @astrojs/tailwind@6.0.2 の astro peer 警告のみ。以��は異常として記録する
  ```
- [x] `2-4` ビルドする
  - 済: 初回は `CloudflareBeacon.astro:7` でRustコンパイラ `Unexpected token` (式内HTMLコメント)。
    コメントを `{...}` 外へ移動し再ビルド→17ページ・2.37s・緑。
    残警告はMDX `use astro:head-inject` のRolldown注意のみ (無害・既知)
  ```bash
  rm -rf dist node_modules/.vite
  npm run build 2>&1 | tee /tmp/astro7-build.log | tail -30
  ```
  - よくある失敗と対処:
    - `unexpected token` + `<!--` → 式内HTMLコメントを `{...}` の外へ移動 (該当なしのはず)
    - `astro:transitions` 内部API削除エラー → 該当コードなしのはず。あれば新イベント名へ
    - `@astrojs/db` エラー → 未使用のはず。あれば削除
- [x] `2-5` 型チェック (ベースライン差分が増えていないこと)
  - 済: `astro check` → 0 errors / 0 warnings / 228 hints (hintsは既存の未使用変数)
  ```bash
  npx astro check 2>&1 | tail -20
  ```
- [x] `2-6` 成果物差分を確認する (Phase 0 のベースラインと比較)
  - 済 (`/tmp/txtdiff.py`): blog一覧・about・contactは可視テキスト完全一致。
    `index.html`と記事1件のみ `Episode 1 Part1`→`Part 1` の空白差 (2文字)。
    原因は `compressHTML:true` 固定でAstro 5では潰れていた `{L.bundleEpisodeLabel} {idx+1}` 間の
    空白が、Astro 7では正しく保持されるようになったため=**修正方向の改善**。CSS差分は
    ハッシュ名変更+Tailwind v4出力 (`global.C0w55xoE.css`) で想定内。要目視 (2-8)
  ```bash
  for p in index.html blog/index.html "blog/2025-12-08-from-kyoto-to-the-world/index.html"; do
    echo "== $p =="; python3 -c "import re,sys,html; t=open('dist/$p',encoding='utf-8',errors='ignore').read(); t=re.sub(r'<script.*?</script>',' ',t,flags=re.S|re.I); t=re.sub(r'<style.*?</style>',' ',t,flags=re.S|re.I); t=html.unescape(re.sub(r'<[^>]+>',' ',t)); print(re.sub(r'\s+',' ',t)[:300])"
  done
  ```
- [x] `2-7` dev + Keystatic管理画面を確認する
  - 済: `astro v7.3.5 ready` / `/` →200 / `/keystatic` →200
  ```bash
  npm run dev 2>&1 | tail -10
  # http://127.0.0.1:4321/keystatic を開き、一覧・編集・Previewボタンが表示されること
  ```
- [x] `2-8` 目視チェック (ベースラインと同じ3ページ)
  - テキスト差分検証済 (2-6): 崩れではなく `Part 1` 空白の正常化のみ。CSSはTailwind v4で再生成済
  - ブラウザ目視: [x] ユーザー確認済 (2026-10-04・screen分離起動でSimple Browser表示成功)
  - `/keystatic` はpreview対象外のためdev切替時に別途確認
- [x] `2-9` コミットする
  - 済: `bf75531` (package.json/lock + astro.config + global.css + CloudflareBeacon + checklist)
  ```bash
  git add package.json package-lock.json
  git commit -m "Astro 5→7 + @astrojs/*追従 + React 19 (Tailwindは据え置き)"
  ```

出口条件: `2-4` ビルド緑 + `2-8` 目視OK。← 両方達成でPhase 2完了 (2026-10-04)

## Phase 3 — Tailwind 3→4 隔離移行 [Phase 2に統合済み]

> 統合メモ (2026-10-04): `@astrojs/tailwind` のpeer制約で依存解決が通らなかったため、
> Phase 2の `bf75531` で同時実施済み。以下は実施記録としてチェック化する。

- [x] `3-1` 現行Tailwind拡張の棚卸し
  - 済: `tailwind.config.mjs` のextend 6種 (shadow xs/2xs, radius xs, blur xs, font serif/newsreader/sans)。
    `src` での `shadow-xs/2xs・rounded-xs・backdrop-blur-xs` 直接使用はなし (config定義のみ+標準utility使用)。
    同ファイルは `@theme` 移植完了後に撤去済み
- [x] `3-2` 移行する
  - 済: `@astrojs/tailwind` 削除 / `tailwindcss 4.3.3` + `@tailwindcss/vite 4.3.3` 導入 (`bf75531`)
- [x] `3-3` `astro.config.mjs` を修正する (`tailwind()` → vite plugin)
  - 済 (`bf75531`): `plugins: [tailwindcss()]` 化
- [x] `3-4` CSSエントリに `@import "tailwindcss";` + `@theme` 移植を行う
  - 済 (`bf75531`): `src/styles/global.css` 先頭にimport+`@theme` 6種移植 (値同一)。
    移植完了に伴い `tailwind.config.mjs` は撤去済み
- [x] `3-5` ビルド + Preflight差分確認
  - 済: 17ページ・2.37s・緑。CSSは `global.C0w55xoE.css` (Tailwind v4) に再生成。可視テキスト差分は `Part 1` 空白のみ
- [x] `3-6` 全ページ目視
  - [x] ユーザー確認済 (2026-10-04・`2-8`と同時)
  - `/` : [x]  - `/blog/` : [x]  - 記事 (長文・画像グリッド・カルタ): [x]  - `/about` `/contact` : [x]
- [x] `3-7` コミットする
  - 済: `bf75531` に包含 (Phase 2と同一コミット)

出口条件: `3-5` ビルド緑 + `3-6` 目視OK。← 達成 (2026-10-04)
中断時: `bf75531` が安全地帯。このコミットまで戻れば Astro7+Tailwind4 の緑状態。

---

## Phase 4 — Cloudflare Pages 最終確認 + マージ判断 (所要 ~20分)

- [x] `4-1` 本番相当ビルド (CF_PAGES=1 で keystatic除外を確認)
  - 済: 17ページ・1.55s・緑。`dist/keystatic` なし (想定通り)
  ```bash
  CF_PAGES=1 npm run build 2>&1 | tail -10
  ls dist/keystatic 2>&1 || echo "(distにkeystatic無し=想定通り)"
  ```
- [x] `4-2` Pages設定を確認する
  - ローカル模擬検証 (2026-10-04): `dist` を静的配信 (Pages相当) で検証
    - `/` `/blog/` `/about/` `/rss.xml` `/sitemap-index.xml` → すべて **200**
    - `/keystatic` → **404** (本番ビルドで正しく除外されている=想定通り)
  - 実デプロイ前にダッシュボード側で最終確認する項目:
    - Build command: `npm run build` → `CF_PAGES` はPagesが自動設定 (`4-1`で検証済): [ ]
    - Output directory: `dist`: [ ]
    - `NODE_VERSION` = `22.23.3` (`.nvmrc` と一致・`preinstall`が完全一致検証するため**厳密一致が必須**): [ ]
  - **デプロイなしでは完全保証できない項目** (初回デプロイで確認):
    - PagesのBuild image Node 22.23.3提供有無 (なければ`NODE_VERSION`指定で代替)
    - 本番カスタムドメイン/ヘッダー/リダイレクト設定の継続
    - Pages環境変数 (`SITE_URL`, `PUBLIC_CLOUDFLARE_BEACON_TOKEN` 等) の引き継ぎ
- [ ] `4-3` マージ判断
  - **保留決定 (2026-10-04・ユーザー指示)**: サイト編集作業を完成させてからマージする
  - そのため現在は検証ブランチ `upgrade/astro7-verify` のまま保持し、`redesign-20261001` へはマージしない
  - 編集作業の場所について: `redesign-20261001` で編集するなら後でcherry-pick/マージ、
    Astro 7上で編集するならこのブランチで直接進める (その場合本ブランチが事実上の作業ブランチ化)
  - 全部緑 → `redesign-20261001` へPR/マージ: [ ]
  - 見送り → 検証ブランチ残置し、このファイルの状態で中断: [ ]

---

## 進捗ログ (中断・再開用に追記する)

| 日時 | フェーズ | 結果 | メモ |
|---|---|---|---|
| 2026-10-04 | Phase 1 | 完了 | `compressHTML:true`固定・差分ゼロ・`93d5ef3`+`57ce818` |
| 2026-10-04 | Phase 2+3 | 完了 (目視含む) | `bf75531`+目視OK。残りはPhase4のPages設定+マージ判断のみ |
| 2026-10-04 | Phase 4 | 検証まで完了・マージ保留 | 静的配信模擬 (全200/keystatic 404) 済。**編集完了後にマージ**との指示を受領 |
| 2026-10-04 | 付帯作業 | 起動スクリプト改修・Push済 | `74e26c5`: 依存バージョン升格への対応 (後述) |

---

## 付帯: 起動スクリプトの改修 (バージョン升格対応) [完了]

依存を Astro 5→7 に上げたことで `start.command` 経路に2つの実害が出たため改修した。

### 症状
1. `start-editing.sh` は `node_modules` が symlink として解決できると**そのまま起動**していたため、
   外部キャッシュに旧バージョン (astro 5.18.1) が残っていても気づかず起動した。
2. `externalize-node-modules.sh --ensure-link` は「キャッシュに中身がある場合は実体を捨てて
   キャッシュを正とする」実装だったため、`npm install` で作った**新しい実体が破棄され**、
   古いキャッシュが復活 → `@tailwindcss/vite` が見つからず起動失敗。

### 改修内容 (`74e26c5`)
| ファイル | 変更 |
|---|---|
| `scripts/start-editing.sh` | 手順2.5を追加: `npm ls --depth=0` で package.json との一致を検査し、不一致なら `npm install` + 再検証。手順4.5を追加: `/keystatic` が応答しないのに 4321 が占有されている場合は原因を表示して停止 (preview等との衝突防止) |
| `scripts/externalize-node-modules.sh` | キャッシュと実体が両方ある場合は**実体 (=直近のnpm install結果) を正**とし、キャッシュを置き換える |

### 検証 (実測)
- 不一致状態から実行 → 同期 (`added 479 packages`) → `/keystatic` **200** / `/` **200** を確認
- 2回目実行 → 「node_modules: 外部キャッシュへの symlink ✓」で即起動 (再インストール不要)
- ポート占有時に実行 → ガードが発動し `exit 1` (意図通り)

