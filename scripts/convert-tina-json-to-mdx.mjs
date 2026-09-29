#!/usr/bin/env node
/**
 * Tina CMS の JSON 記事を Astro 標準の MDX 記事へ一括変換する移行スクリプト。
 *
 *   入力 : src/content/pages/*.json   (Tina `contentPage` コレクション)
 *   出力 : src/content/blog/*.mdx     (Astro `blog` コレクション)
 *   退避 : backup/tina-json-original/ (元JSONは削除せずそのまま保存)
 *
 * 特徴:
 *   - 元JSONは一切変更しない (読み取り専用)
 *   - テキスト/マークダウンは1バイトも改変せずそのままMDX本文へ転記する
 *   - imageGrid テンプレートは <ImageGrid /> MDXコンポーネントへ変換する
 *   - 冪等: 既に同名MDXがある場合はスキップする(上書きしない)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SRC_DIR = path.join(ROOT, 'src', 'content', 'pages');
const OUT_DIR = path.join(ROOT, 'src', 'content', 'blog');
const BACKUP_DIR = path.join(ROOT, 'backup', 'tina-json-original');

/** YAML フロントマターのキー定義順（Astro での利用用途に合わせる） */
function buildFrontmatter(data) {
  const hero = data.hero || {};
  const fm = {};

  fm.title = data.title ?? '';
  fm.description = firstLine(hero.subtitle || '') || data.title || '';
  fm.pubDate = toDateOnly(data.pubDate);
  if (data.updatedDate) fm.updatedDate = toDateOnly(data.updatedDate);
  fm.heroImage = hero.image1 || '';
  fm.heroTitle = hero.title || '';
  fm.heroSubtitle = hero.subtitle || '';
  // 日本語版フルテキスト（アコーディオン表示用）。元JSONの文字列をそのまま保持する。
  fm.japaneseText = data.japaneseText ?? '';

  // Tina の管理メタは保持しつつ Astro 側では未使用
  if (data.about) fm.about = data.about;

  return fm;
}

function firstLine(value) {
  if (typeof value !== 'string') return '';
  const line = value.split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return line || '';
}

function toDateOnly(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** contentSections を Markdown/MDX 本文へ変換する */
function renderBody(sections) {
  const chunks = [];

  for (const section of sections || []) {
    if (section._template === 'textBlock') {
      // マークダウンは原文をそのまま転記する（改変なし）
      if (section.bodyText) chunks.push(String(section.bodyText).trim());
      continue;
    }

    if (section._template === 'imageGrid') {
      const images = (section.images || [])
        .filter((img) => img && img.src)
        .map((img) => ({
          src: img.src,
          ...(img.label ? { label: img.label } : {}),
          ...(img.caption ? { caption: img.caption } : {}),
        }));
      if (images.length > 0) {
        chunks.push(`<ImageGrid images={${JSON.stringify(images)}} />`);
      }
      continue;
    }

    // 未知のテンプレートは安全にスキップ（ログのみ）
    if (section && section._template) {
      console.warn(`  ! unknown template: ${section._template}`);
    }
  }

  return chunks.join('\n\n');
}

function buildMdx(data) {
  const frontmatter = yaml.dump(buildFrontmatter(data), {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });

  const body = renderBody(data.contentSections);

  // Keystatic は MDX 内の import 文を静的に解析できないため、
  // コンポーネントは MDX ではなくレンダリング側（Astro）で注入する。
  return `---\n${frontmatter}---\n\n${body}\n`;
}

/**
 * 生成された MDX が元の JSON と完全に整合しているか検証する。
 * 1文字でも欠損・改変があれば検出する。
 */
function verifyMdx(mdxPath, data) {
  const errors = [];
  const content = fs.readFileSync(mdxPath, 'utf8');

  // --- フロントマターと本文を分離 ---
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  if (!match) {
    errors.push('frontmatter could not be parsed');
    return errors;
  }
  const fmRaw = match[1];
  const body = match[2];

  let fm;
  try {
    fm = yaml.load(fmRaw);
  } catch (err) {
    errors.push(`frontmatter YAML invalid: ${err.message}`);
    return errors;
  }

  // --- フロントマターの値検証 ---
  const expected = buildFrontmatter(data);
  for (const [key, value] of Object.entries(expected)) {
    const actual = fm[key];
    const expectedStr = typeof value === 'string' ? value : String(value ?? '');
    const actualStr = typeof actual === 'string' ? actual : String(actual ?? '');
    if (expectedStr !== actualStr) {
      errors.push(
        `frontmatter "${key}" mismatch: expected ${expectedStr.length} chars, got ${actualStr.length} chars`,
      );
    }
  }

  // --- 本文の完全性検証 ---
  // textBlock の bodyText が1文字も改変されずに転記されているか
  for (const section of data.contentSections || []) {
    if (section._template === 'textBlock' && section.bodyText) {
      const text = String(section.bodyText).trim();
      if (!body.includes(text)) {
        errors.push(
          `bodyText missing in body (${text.length} chars): "${text.slice(0, 40)}..."`,
        );
      }
    }

    if (section._template === 'imageGrid') {
      for (const img of section.images || []) {
        if (img?.src && !body.includes(img.src)) {
          errors.push(`image src missing in body: ${img.src}`);
        }
        if (img?.caption && !body.includes(img.caption)) {
          errors.push(`image caption missing in body: ${img.caption.slice(0, 30)}`);
        }
      }
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[ERROR] source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const files = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.warn('[WARN] no JSON files found');
    return;
  }

  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    const base = file.replace(/\.json$/, '');
    const srcPath = path.join(SRC_DIR, file);
    const outPath = path.join(OUT_DIR, `${base}.mdx`);

    // 1) まず元JSONを退避（読み取りのみ。元の場所には残す）
    const backupPath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(srcPath, backupPath);
    }

    // 2) 変換
    if (fs.existsSync(outPath)) {
      console.log(`[SKIP] ${base}.mdx already exists (not overwritten)`);
      skipped += 1;
      continue;
    }

    const raw = fs.readFileSync(srcPath, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`[ERROR] invalid JSON: ${file} -> ${err.message}`);
      process.exitCode = 1;
      continue;
    }

    fs.writeFileSync(outPath, buildMdx(data), 'utf8');

    // 3) 生成物の完全性検証（テキストが1バイトも欠損していないか）
    const verifyErrors = verifyMdx(outPath, data);
    if (verifyErrors.length > 0) {
      console.error(`[FAIL] ${base}.mdx verification failed:`);
      verifyErrors.forEach((e) => console.error(`       - ${e}`));
      process.exitCode = 1;
      continue;
    }

    console.log(`[OK]   ${file}  ->  src/content/blog/${base}.mdx`);
    converted += 1;
  }

  console.log('');
  console.log(`converted: ${converted}, skipped: ${skipped}`);
  console.log(`backup:    ${path.relative(ROOT, BACKUP_DIR)}/`);
}

main();
