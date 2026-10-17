// 通読時間（N min read）の計算が1箇所に集約されているかのガード。
//
// 背景: ブログ一覧が独自に description 基準で計算していたため、
// 記事上部・Folio カード（本文基準）と値がずれた（全記事 1 min 問題）。
// src/utils/readTime.ts の readMinutesOf() に一本化したので、
// src 配下に計算式の重複（`/ 700` や description 基準の自前計算）が
// 復活していないかを検証する。CI / pre-commit 用に終了コード 1 を返す。
//
// 使い方:
//   node scripts/check-read-time.mjs
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src');
const CANONICAL = path.join(SRC_DIR, 'utils', 'readTime.ts');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(astro|ts|tsx|js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const failures = [];

// 1) 通読時間の除数（700）が正規ファイル以外に存在しないこと
for (const file of walk(SRC_DIR)) {
  if (file === CANONICAL) continue;
  const text = fs.readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/\/\s*700/.test(line) && /Math\.(round|ceil|floor|max)/.test(line)) {
      failures.push(`${path.relative(REPO_ROOT, file)}:${i + 1}: 通読時間の独自計算があります → readMinutesOf() を使ってください: ${line.trim()}`);
    }
  });
}

// 2) 3つの表示箇所がすべて readMinutesOf() を使っていること
const expectedUsers = [
  path.join(SRC_DIR, 'pages', 'blog', '[...slug].astro'),
  path.join(SRC_DIR, 'pages', 'blog', 'index.astro'),
  path.join(SRC_DIR, 'pages', 'index.astro'),
];
for (const file of expectedUsers) {
  if (!fs.existsSync(file)) {
    failures.push(`${path.relative(REPO_ROOT, file)} が見つかりません`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('readMinutesOf')) {
    failures.push(`${path.relative(REPO_ROOT, file)} が readMinutesOf() を使っていません`);
  }
}

if (failures.length > 0) {
  console.log(`FAIL: 通読時間の計算が分散しています（${failures.length} 件）:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('ok: 通読時間は readTime.ts の readMinutesOf() に集約されています');
