// 用語集（src/content/glossary/*.json）の健全性チェック。
//
// 背景: 用語集は「記事の英語本文（contentSections[].bodyText）に実在する語」だけが
// ハイライトされる。本文に一度も出てこない語を登録しても何も起きず、
// 「登録したのに反映されない」という誤解を招く（実際に発生した）。
//
// このスクリプトは src/utils/glossary.ts と同じ照合規則で出現数を数え、
// 0 件の用語を警告する。CI / pre-commit 用に終了コード 1 を返す。
//
// 使い方:
//   node scripts/check-glossary.mjs          # 警告があれば exit 1
//   node scripts/check-glossary.mjs --quiet  # 0 件の用語だけ表示
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = path.resolve(import.meta.dirname, '..');
const glossaryDir = path.join(root, 'src/content/glossary');
const blogDir = path.join(root, 'src/content/blog');
const quiet = process.argv.includes('--quiet');

const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// src/utils/glossary.ts の wordBoundarySource と同じ規則。
// 英数字で始まる/終わる語だけ単語境界を付ける（`Ma` が `Main` に誤爆しないように）。
function wordBoundarySource(term) {
  const start = /[A-Za-z0-9]/.test(term.charAt(0)) ? '\\b' : '';
  const end = /[A-Za-z0-9]/.test(term.charAt(term.length - 1)) ? '\\b' : '';
  return `${start}${escapeRegExp(term)}${end}`;
}

// フロントマター（--- ... ---）を YAML として読む。
function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return parseYaml(m[1]);
  } catch (err) {
    console.log(`WARN: ${path.basename(file)} のフロントマターを解析できません: ${err.message}`);
    return null;
  }
}

// 記事の英語本文だけを集める（annotateGlossary が適用される範囲と一致させる）。
function collectBodyText(frontmatter) {
  const sections = frontmatter?.contentSections;
  if (!Array.isArray(sections)) return '';
  return sections
    .map((s) => (typeof s?.bodyText === 'string' ? s.bodyText : ''))
    .filter(Boolean)
    .join('\n\n');
}

// --- 用語集を読み込む ---
if (!fs.existsSync(glossaryDir)) {
  console.log(`FAIL: ${path.relative(root, glossaryDir)} が見つかりません`);
  process.exit(1);
}

const entries = fs
  .readdirSync(glossaryDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const file = path.join(glossaryDir, f);
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return {
        file: f,
        term: String(data.term ?? '').trim(),
        caseSensitive: data.caseSensitive === true,
        excludeSpellings: Array.isArray(data.excludeSpellings)
          ? data.excludeSpellings.map((s) => String(s ?? '').trim()).filter(Boolean)
          : [],
      };
    } catch (err) {
      console.log(`FAIL: ${f} を JSON として読めません: ${err.message}`);
      return null;
    }
  })
  .filter(Boolean);

// --- 記事本文を読み込む ---
const articles = fs
  .readdirSync(blogDir)
  .filter((f) => /\.mdx?$/.test(f))
  .map((f) => ({ file: f, body: collectBodyText(readFrontmatter(path.join(blogDir, f))) }));

const totalChars = articles.reduce((n, a) => n + a.body.length, 0);
if (totalChars === 0) {
  console.log('FAIL: 記事本文（contentSections[].bodyText）を1文字も取得できませんでした');
  process.exit(1);
}

// --- 出現数を数える ---
const results = entries.map((entry) => {
  const excluded = new Set(
    entry.excludeSpellings.map((s) => (entry.caseSensitive ? s : s.toLowerCase())),
  );
  const re = new RegExp(wordBoundarySource(entry.term), 'gi');
  let count = 0;
  const perArticle = [];
  for (const article of articles) {
    let hits = 0;
    for (const matched of article.body.matchAll(re)) {
      const key = entry.caseSensitive ? matched[0] : matched[0].toLowerCase();
      if (excluded.has(key)) continue;
      hits++;
    }
    if (hits > 0) perArticle.push(`${article.file.replace(/\.mdx?$/, '')}(${hits})`);
    count += hits;
  }
  return { ...entry, count, perArticle };
});

results.sort((a, b) => a.count - b.count || a.term.localeCompare(b.term));

const unused = results.filter((r) => r.count === 0);

if (!quiet) {
  console.log(`用語集 ${results.length} 件 / 記事 ${articles.length} 件（本文 ${totalChars} 文字）\n`);
  for (const r of results) {
    const mark = r.count === 0 ? 'NG  ' : 'ok  ';
    const where = r.count === 0 ? '本文に出現なし → ハイライトされません' : r.perArticle.join(', ');
    console.log(`${mark}${r.term.padEnd(14)} ${String(r.count).padStart(3)} 回  ${where}`);
  }
  console.log('');
}

if (unused.length > 0) {
  console.log(`FAIL: 本文に一度も出現しない用語が ${unused.length} 件あります:`);
  for (const r of unused) console.log(`  - ${r.term}  (${r.file})`);
  console.log('\n対処: 記事本文に実在する語に直すか、不要なら src/content/glossary/ から削除してください。');
  process.exit(1);
}

console.log('ok: すべての用語が本文に出現します');
