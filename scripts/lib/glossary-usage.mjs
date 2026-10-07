// 用語集（src/content/glossary/*.json）の出現数チェックを共有するモジュール。
//
// 背景: 用語集は「記事の英語本文（contentSections[].bodyText）に実在する語」だけが
// ハイライトされる。本文に一度も出てこない語を登録しても何も起きず、
// 「登録したのに反映されない」という誤解を招く（実際に発生した）。
//
// 照合規則は src/utils/glossary.ts と一致させること。
// このモジュールは scripts/check-glossary.mjs（CLI）と
// tools/sheet（スプレッドシート型エディタ）の両方から使う。
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
export const GLOSSARY_DIR = path.join(REPO_ROOT, 'src/content/glossary');
export const BLOG_DIR = path.join(REPO_ROOT, 'src/content/blog');

const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// src/utils/glossary.ts の wordBoundarySource と同じ規則。
// 英数字で始まる/終わる語だけ単語境界を付ける（`Ma` が `Main` に誤爆しないように）。
export function wordBoundarySource(term) {
  const start = /[A-Za-z0-9]/.test(term.charAt(0)) ? '\\b' : '';
  const end = /[A-Za-z0-9]/.test(term.charAt(term.length - 1)) ? '\\b' : '';
  return `${start}${escapeRegExp(term)}${end}`;
}

// フロントマター（--- ... ---）を YAML として読む。
export function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    return parseYaml(m[1]);
  } catch {
    return null;
  }
}

// 記事の英語本文だけを集める（annotateGlossary が適用される範囲と一致させる）。
export function collectBodyText(frontmatter) {
  const sections = frontmatter?.contentSections;
  if (!Array.isArray(sections)) return '';
  return sections
    .map((s) => (typeof s?.bodyText === 'string' ? s.bodyText : ''))
    .filter(Boolean)
    .join('\n\n');
}

/** 記事ファイルを読み込み、{ file, body } の配列を返す。 */
export function loadArticles(blogDir = BLOG_DIR) {
  if (!fs.existsSync(blogDir)) return [];
  return fs
    .readdirSync(blogDir)
    .filter((f) => /\.mdx?$/.test(f))
    .map((f) => ({ file: f, body: collectBodyText(readFrontmatter(path.join(blogDir, f))) }));
}

/**
 * 用語1件の出現数を数える。
 * @returns {{ count: number, perArticle: string[] }}
 */
export function countTerm(entry, articles) {
  const term = String(entry.term ?? '').trim();
  if (!term) return { count: 0, perArticle: [] };

  const caseSensitive = entry.caseSensitive === true;
  const excludeSpellings = Array.isArray(entry.excludeSpellings)
    ? entry.excludeSpellings.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];
  const excluded = new Set(excludeSpellings.map((s) => (caseSensitive ? s : s.toLowerCase())));

  const re = new RegExp(wordBoundarySource(term), 'gi');
  let count = 0;
  const perArticle = [];
  for (const article of articles) {
    let hits = 0;
    for (const matched of article.body.matchAll(re)) {
      const key = caseSensitive ? matched[0] : matched[0].toLowerCase();
      if (excluded.has(key)) continue;
      hits++;
    }
    if (hits > 0) perArticle.push(`${article.file.replace(/\.mdx?$/, '')}(${hits})`);
    count += hits;
  }
  return { count, perArticle };
}

/**
 * 用語集ディレクトリを読み込み、各用語の出現数つきで返す。
 * 壊れた JSON は errors に積んで処理は継続する。
 */
export function analyzeGlossary({ glossaryDir = GLOSSARY_DIR, blogDir = BLOG_DIR } = {}) {
  const errors = [];
  if (!fs.existsSync(glossaryDir)) {
    return { entries: [], articles: [], totalChars: 0, errors: [`${glossaryDir} が見つかりません`] };
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
          slug: String(data.slug ?? f.replace(/\.json$/, '')),
          term: String(data.term ?? '').trim(),
          reading: String(data.reading ?? ''),
          description: String(data.description ?? ''),
          caseSensitive: data.caseSensitive === true,
          excludeSpellings: Array.isArray(data.excludeSpellings)
            ? data.excludeSpellings.map((s) => String(s ?? '').trim()).filter(Boolean)
            : [],
        };
      } catch (err) {
        errors.push(`${f} を JSON として読めません: ${err.message}`);
        return null;
      }
    })
    .filter(Boolean);

  const articles = loadArticles(blogDir);
  const totalChars = articles.reduce((n, a) => n + a.body.length, 0);

  const withCounts = entries.map((entry) => ({ ...entry, ...countTerm(entry, articles) }));
  withCounts.sort((a, b) => a.count - b.count || a.term.localeCompare(b.term));

  return { entries: withCounts, articles, totalChars, errors };
}
