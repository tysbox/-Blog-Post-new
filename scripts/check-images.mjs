// 画像パス（/images/...）の健全性チェック。
//
// 背景: Keystatic / スプレッドシート型エディタで画像パスを手入力するため、
// 次のような「気づきにくい壊れ方」が実際に発生した。
//
//   1. 末尾に引用符が混入する（例: `/images/foo.webp'`）
//      → ファイル名が一致せず画像が表示されない。エラーも出ないため
//        「編集したのに反映されない」という誤解を招く。
//   2. 画像をリネームしたのに参照側を直し忘れる
//      → 同上。
//   3. 全角スペースや連続スペースが混入する
//      → URL エンコードの差異で一致しなくなる。
//
// このスクリプトは src/content 配下の全ファイルから画像参照を集め、
//   ・参照先ファイルが実在するか
//   ・パスに異常な文字（引用符・末尾空白・連続空白）が無いか
// を検証する。CI / pre-commit 用に終了コード 1 を返す。
//
// 使い方:
//   node scripts/check-images.mjs          # 問題があれば exit 1
//   node scripts/check-images.mjs --quiet  # 問題のみ表示
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');

const quiet = process.argv.includes('--quiet');

/** src/content 配下の全ファイルを再帰的に列挙する。 */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// 画像参照を拾う。パスは `/images/...` で始まり、拡張子で終わる。
// 末尾の引用符や空白も「参照の一部」として拾いたいので、あえて緩く取る。
const REF_RE = /\/images\/[^"'\n]*?\.(?:webp|png|jpg|jpeg|gif|avif|svg)/gi;
// パスとして不正な文字（引用符・末尾空白・連続空白・全角スペース）
const BAD_CHARS_RE = /["']|\s$|\s{2,}|\u3000/;

const refs = [];
for (const file of walk(CONTENT_DIR)) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(REF_RE)) {
      refs.push({
        ref: m[0],
        file: path.relative(REPO_ROOT, file),
        line: i + 1,
      });
    }
  });
}

const missing = [];
const malformed = [];
const nfd = [];

for (const r of refs) {
  if (BAD_CHARS_RE.test(r.ref)) {
    malformed.push(r);
    continue;
  }
  const abs = path.join(PUBLIC_DIR, r.ref);
  if (!fs.existsSync(abs)) {
    missing.push(r);
    continue;
  }
  // macOS は日本語ファイル名を NFD（分解形式）で保存することがある。
  // 参照側が NFC（合成形式）だと、見た目は同じでもバイト列が違い
  // 404 になる（実際に発生した）。ここで検出して正規化を促す。
  const base = path.basename(r.ref);
  if (!base.normalize('NFC').split('/').every((seg) => seg === seg.normalize('NFC'))) {
    nfd.push(r);
  }
}

// public/images 配下のファイル名そのものも検査する（参照が無くても 404 の原因になる）
const nfdFiles = [];
for (const f of fs.readdirSync(path.join(PUBLIC_DIR, 'images'))) {
  if (f.startsWith('.')) continue;
  if (f !== f.normalize('NFC')) nfdFiles.push(f);
}

if (!quiet) {
  console.log(`画像参照 ${refs.length} 件を検査しました\n`);
}

let failed = false;

if (malformed.length > 0) {
  failed = true;
  console.log(`FAIL: 画像パスに不正な文字が含まれています（${malformed.length} 件）:`);
  for (const r of malformed) {
    console.log(`  - ${JSON.stringify(r.ref)}`);
    console.log(`      ${r.file}:${r.line}`);
  }
  console.log('\n対処: 引用符・余分な空白を削除し、`/images/ファイル名.webp` の形にしてください。');
  console.log('      （Keystatic の該当欄、または `npm run sheet` の画像欄で修正できます）\n');
}

if (missing.length > 0) {
  failed = true;
  console.log(`FAIL: 参照先の画像ファイルが存在しません（${missing.length} 件）:`);
  for (const r of missing) {
    console.log(`  - ${r.ref}`);
    console.log(`      ${r.file}:${r.line}`);
  }
  console.log('\n対処: 画像を public/images/ に置くか、参照を実在するファイル名に直してください。');
  console.log('      画像をリネームした場合は、参照側も同じ名前に更新が必要です。\n');
}

if (nfdFiles.length > 0) {
  failed = true;
  console.log(`FAIL: ファイル名が NFD（分解形式）です（${nfdFiles.length} 件）:`);
  for (const f of nfdFiles) {
    console.log(`  - ${f}`);
    console.log(`      → NFC に正規化してください: ${f.normalize('NFC')}`);
  }
  console.log('\n対処: macOS は日本語ファイル名を NFD で保存することがあります。');
  console.log('      見た目が同じでもバイト列が違うため、NFC の参照と一致せず 404 になります。');
  console.log('      次で正規化できます:');
  console.log("        node -e \"const fs=require('fs');for(const f of fs.readdirSync('public/images')){const n=f.normalize('NFC');if(n!==f)fs.renameSync('public/images/'+f,'public/images/'+n)}\"\n");
}

if (nfd.length > 0) {
  failed = true;
  console.log(`FAIL: 参照パスが NFD（分解形式）です（${nfd.length} 件）:`);
  for (const r of nfd) {
    console.log(`  - ${r.ref}`);
    console.log(`      ${r.file}:${r.line}`);
  }
  console.log('\n対処: 参照側を NFC に正規化してください。\n');
}

if (failed) process.exit(1);

console.log('ok: すべての画像参照が実在し、パスも正常です');
