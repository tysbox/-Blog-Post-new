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
- [ ] `0-6` 目視ベースライン (3ページ): `/` , `/blog/` , 記事1件
  - レイアウト崩れなし: [ ]
  - 日本語テキスト連結なし: [ ]
  - スライドアニメ (BaseLayout `@keyframes slide`) 動作: [ ]

出口条件: `0-4` ビルド緑 + `0-5` 保存先記入済み。ここまで終わればいつ中断してもよい。
中断時: 何も壊れていない。`git checkout redesign-20261001` で通常作業に戻れる。

---

## Phase 1 — 予防線: `compressHTML` 固定 (所要 ~10分)

背景: Astro 7 で `compressHTML` のデフォルトが `'jsx'` に変わり、インライン要素+式の空白が連結する。
先に旧規則 (`true`) を固定して差分を予防する。

- [x] `1-1` `astro.config.mjs` に1行追加する
  - 済 (2026-10-04): `compressHTML: true` 追加
  ```diff
   export default defineConfig({
  +    compressHTML: true, // Astro7予防: v6までのHTML空白規則を維持
       site: ...
  ```
- [ ] `1-3` コミットする
  ```bash
  git add astro.config.mjs UPGRADE-ASTRO7-CHECKLIST.md
  git commit -m "Astro7準備: compressHTML:true を固定 (jsx空白連結の予防)"
  ```

出口条件: ビルド緑 + テキスト連結なし。中断時: このコミットまでが安全地帯。

---

## Phase 2 — Astro 7 + 周辺追従 + React 19 (所要 30〜90分) [本体]

入口: Phase 1 完了。Node 22.23.3。検証ブランチ上。

対象 (npm latest 2026-10-04 照会済):
`astro 7.3.5` / `@astrojs/react 7.0.0` / `@astrojs/mdx 8.0.2` / `@astrojs/rss/sitemap/check 最新`
/ `react 19.3.0` / `react-dom 19.3.0` / `@types/react,@types/react-dom 19系`
保持: `@keystatic/astro 6.0.0` / `@keystatic/core 0.6.9` (最新済み・peer `astro 5||6||7` OK)
触らない: Tailwind一式 (Phase 3 に隔離)

- [ ] `2-1` 変更前の `package.json` を退避する
  ```bash
  cp package.json /tmp/package.json.astro5.bak && cp package-lock.json /tmp/package-lock.json.astro5.bak 2>/dev/null
  ```
- [ ] `2-2` インストールする
  ```bash
  npm install astro@latest @astrojs/react@latest @astrojs/mdx@latest @astrojs/rss@latest @astrojs/sitemap@latest @astrojs/check@latest react@latest react-dom@latest
  npm install -D @types/react@latest @types/react-dom@latest
  npm ls astro @astrojs/react @astrojs/mdx react 2>&1 | head -20
  ```
- [ ] `2-3` peer警告を確認し、Tailwind由来のものだけであることを切り分ける
  ```bash
  npm ls 2>&1 | grep -i -E "peer|invalid|EBAD" | head -20
  # 想定: @astrojs/tailwind@6.0.2 の astro peer 警告のみ。以��は異常として記録する
  ```
- [ ] `2-4` ビルドする
  ```bash
  rm -rf dist node_modules/.vite
  npm run build 2>&1 | tee /tmp/astro7-build.log | tail -30
  ```
  - よくある失敗と対処:
    - `unexpected token` + `<!--` → 式内HTMLコメントを `{...}` の外へ移動 (該当なしのはず)
    - `astro:transitions` 内部API削除エラー → 該当コードなしのはず。あれば新イベント名へ
    - `@astrojs/db` エラー → 未使用のはず。あれば削除
- [ ] `2-5` 型チェック (ベースライン差分が増えていないこと)
  ```bash
  npx astro check 2>&1 | tail -20
  ```
- [ ] `2-6` 成果物差分を確認する (Phase 0 のベースラインと比較)
  ```bash
  for p in index.html blog/index.html "blog/2025-12-08-from-kyoto-to-the-world/index.html"; do
    echo "== $p =="; python3 -c "import re,sys,html; t=open('dist/$p',encoding='utf-8',errors='ignore').read(); t=re.sub(r'<script.*?</script>',' ',t,flags=re.S|re.I); t=re.sub(r'<style.*?</style>',' ',t,flags=re.S|re.I); t=html.unescape(re.sub(r'<[^>]+>',' ',t)); print(re.sub(r'\s+',' ',t)[:300])"
  done
  ```
- [ ] `2-7` dev + Keystatic管理画面を確認する
  ```bash
  npm run dev 2>&1 | tail -10
  # http://127.0.0.1:4321/keystatic を開き、一覧・編集・Previewボタンが表示されること
  ```
- [ ] `2-8` 目視チェック (ベースラインと同じ3ページ)
  - レイアウト崩れなし: [ ]
  - テキスト連結なし: [ ]
  - スライドアニメ動作: [ ]
  - `/keystatic` 動作: [ ]
- [ ] `2-9` コミットする
  ```bash
  git add package.json package-lock.json
  git commit -m "Astro 5→7 + @astrojs/*追従 + React 19 (Tailwindは据え置き)"

## Phase 3 — Tailwind 3→4 隔離移行 (所要 60〜180分) [最大リスク]

背景: `@astrojs/tailwind@6.0.2` のpeerは `astro ^3||^4||^5` のため Astro 7 と非互換。
公式方針は `@astrojs/tailwind` 廃止 → `@tailwindcss/vite` プラグイン + CSS `@theme` 定義へ移行。
`tailwind.config.mjs` の独自拡張 (boxShadow xs/2xs, borderRadius xs, backdropBlur xs,
fontFamily serif/newsreader/sans) はCSSへ移植が必要。

- [ ] `3-1` 現行Tailwind拡張の棚卸し
  ```bash
  cat tailwind.config.mjs
  grep -rho -E "(shadow-(xs|2xs)|rounded-xs|backdrop-blur-xs|font-(serif|newsreader|sans))" src | sort | uniq -c
  ```
- [ ] `3-2` 移行する
  ```bash
  npm uninstall @astrojs/tailwind
  npm install tailwindcss@latest @tailwindcss/vite@latest
  ```
- [ ] `3-3` `astro.config.mjs` を修正する (`tailwind()` → vite plugin)
  ```diff
  - import tailwind from '@astrojs/tailwind';
  + import tailwindcss from '@tailwindcss/vite';
    integrations: [
      mdx(), sitemap({...}), react(),
  -    tailwind(),
      ...(isDev ? [keystatic()] : []),
    ],
    vite: {
  +    plugins: [tailwindcss()],
        optimizeDeps: {...}, server: {...},
    }
  ```
- [ ] `3-4` CSSエントリに `@import "tailwindcss";` + `@theme` 移植を行う
  - `src/styles/global.css` (または該当エントリ) に追加
  - 独自値を `@theme` へ移す
  - `tailwind.config.mjs` は参照用に残置する
- [ ] `3-5` ビルド + Preflight差分確認
  ```bash
  rm -rf dist node_modules/.vite
  npm run build 2>&1 | tail -20
  ```
- [ ] `3-6` 全ページ目視 (Preflight v4差分は全体に影響するため3ページでは足りない)
  - `/` : [ ]  - `/blog/` : [ ]  - 記事 (長文・画像グリッド・カルタ): [ ]  - `/about` `/contact` : [ ]
- [ ] `3-7` コミットする
  ```bash
  git add -A && git status --short
  git commit -m "Tailwind 3→4: @astrojs/tailwind廃止→@tailwindcss/vite移行"
  ```

出口条件: `3-5` ビルド緑 + `3-6` 目視OK。
中断時: Phase 2コミットまで `git reset --hard` で戻れる。Tailwindは単独フェーズなのでAstro 7自体は維持できる。

---

## Phase 4 — Cloudflare Pages 最終確認 + マージ判断 (所要 ~20分)

- [ ] `4-1` 本番相当ビルド (CF_PAGES=1 で keystatic除外を確認)
  ```bash
  CF_PAGES=1 npm run build 2>&1 | tail -10
  ls dist/keystatic 2>&1 || echo "(distにkeystatic無し=想定通り)"
  ```
- [ ] `4-2` Pages設定を確認する (ダッシュボード)
  - Build command: `npm run build`: [ ]
  - Output: `dist`: [ ]
  - `NODE_VERSION` = `22.23.3` (Astro 7要求 `>=22.12.0` を満たす): [ ]
  - 本番で keystatic が除外されること: [ ]
- [ ] `4-3` マージ判断
  - 全部緑 → `redesign-20261001` へPR/マージ: [ ]
  - TailwindのみNG → Phase 2までを先にマージし Phase 3は別PR化も可: [ ]
  - 見送り → 検証ブランチ残置し、このファイルの状態で中断: [ ]

---

## 進捗ログ (中断・再開用に追記する)

| 日時 | フェーズ | 結果 | メモ |
|---|---|---|---|
| 2026-10-04 | 開始 | 検証ブランチ `upgrade/astro7-verify` 作成 | 安定点 `redesign-20261001@17da389` から分岐 |
| | | | |


  ```

出口条件: `2-4` ビルド緑 + `2-8` 目視OK。
中断時: `2-1` の退避から戻せる: `cp /tmp/package.json.astro5.bak package.json && npm install`。
失敗がTailwind由来と確定したら Phase 3 へ進まず記録して中断可。


- [x] `1-2` 差分ビルドで変化がないことを確認する
  - 済 (2026-10-04): 17ページ・3.13s・緑。`diff -rq baseline/dist dist` → 差分ゼロ。`index.html` バイト同一確認
  ```bash
  npm run build 2>&1 | tail -10
  ```
- [ ] `1-3` コミットする
  ```bash
  git add astro.config.mjs UPGRADE-ASTRO7-CHECKLIST.md
  git commit -m "Astro7準備: compressHTML:true を固定 (jsx空白連結の予防)"
  ```

出口条件: ビルド緑 + テキスト連結なし。中断時: このコミットまでが安全地帯。

---
