// カルタ / 用語集の読み書きと検証。
//
// Keystatic のスキーマ（keystatic.config.ts）と 1 対 1 で対応させる。
// フィールド順も Keystatic の定義順に合わせ、保存後の diff を最小化する。
import fs from 'node:fs';
import path from 'node:path';
import {
  GLOSSARY_DIR,
  KARUTA_FILE,
  backupFiles,
  mergePreservingUnknown,
  normalizeSlug,
  readJson,
  writeJsonAtomic,
} from './store.mjs';

// --- カルタ ---------------------------------------------------------------

export const KARUTA_CARD_FIELDS = [
  'number',
  'kanjiNum',
  'tag',
  'romaji',
  'titleJp',
  'titleEn',
  'image',
  'alt',
  'folioId',
  'category',
  'icon',
  'bodyJp',
  'bodyEn',
];

export const KARUTA_CARD_LABELS = {
  number: '番号',
  kanjiNum: '漢数字',
  tag: 'タグ',
  romaji: 'ローマ字',
  titleJp: '日本語タイトル',
  titleEn: '英語タイトル',
  image: '画像',
  alt: '代替テキスト',
  folioId: 'Folio ID',
  category: 'カテゴリ',
  icon: 'アイコン',
  bodyJp: '本文（日本語）',
  bodyEn: '本文（英語）',
};

export const KARUTA_MULTILINE_FIELDS = new Set(['bodyJp', 'bodyEn']);

export function loadKaruta() {
  const data = readJson(KARUTA_FILE);
  if (!data) return { perPage: 3, max: 100, cards: [] };
  return {
    perPage: Number(data.perPage) > 0 ? Number(data.perPage) : 3,
    max: Number(data.max) > 0 ? Number(data.max) : 100,
    cards: Array.isArray(data.cards) ? data.cards : [],
  };
}

/** カルタカードを検証する。errors があれば保存しない。 */
export function validateKaruta(cards, { max = 100 } = {}) {
  const errors = [];
  const warnings = [];
  const seenNumbers = new Map();

  cards.forEach((card, i) => {
    const row = i + 1;
    const number = String(card.number ?? '').trim();
    const titleJp = String(card.titleJp ?? '').trim();
    const titleEn = String(card.titleEn ?? '').trim();
    const image = String(card.image ?? '').trim();

    if (!number) errors.push(`${row} 行目: 番号 (number) は必須です`);
    if (!titleJp && !titleEn) {
      errors.push(`${row} 行目: 日本語タイトルか英語タイトルのどちらかは必須です`);
    }
    if (!image) warnings.push(`${row} 行目: 画像が未設定です（カードが表示されない可能性があります）`);

    if (number) {
      if (seenNumbers.has(number)) {
        warnings.push(`${row} 行目: 番号 "${number}" が ${seenNumbers.get(number)} 行目と重複しています`);
      } else {
        seenNumbers.set(number, row);
      }
    }

    if (image && !image.startsWith('/')) {
      warnings.push(`${row} 行目: 画像パスは "/images/..." のように / から始めてください`);
    }
  });

  if (cards.length > max) {
    errors.push(`カードが ${cards.length} 枚あります。上限は ${max} 枚です`);
  }

  return { errors, warnings };
}

/** カルタを保存する（未知フィールドは保持）。 */
export function saveKaruta({ perPage, max, cards }) {
  const original = readJson(KARUTA_FILE) ?? {};
  const next = mergePreservingUnknown(
    original,
    {
      perPage: Number(perPage) > 0 ? Number(perPage) : 3,
      max: Number(max) > 0 ? Number(max) : 100,
      cards: cards.map((card) => {
        const known = {};
        for (const field of KARUTA_CARD_FIELDS) {
          const value = card[field];
          known[field] = typeof value === 'string' ? value : value == null ? '' : String(value);
        }
        return mergePreservingUnknown(card, known, KARUTA_CARD_FIELDS);
      }),
    },
    ['perPage', 'max', 'cards'],
  );

  const backup = backupFiles([KARUTA_FILE]);
  writeJsonAtomic(KARUTA_FILE, next);
  return { written: [path.relative(process.cwd(), KARUTA_FILE)], removed: [], backup };
}

// --- 用語集 ---------------------------------------------------------------

export const GLOSSARY_FIELDS = [
  'slug',
  'term',
  'reading',
  'description',
  'caseSensitive',
  'excludeSpellings',
];

export const GLOSSARY_LABELS = {
  slug: 'スラッグ',
  term: '用語',
  reading: '読み',
  description: '説明',
  caseSensitive: '大小文字を区別',
  excludeSpellings: '除外表記',
};

export function loadGlossary() {
  if (!fs.existsSync(GLOSSARY_DIR)) return [];
  return fs
    .readdirSync(GLOSSARY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const data = readJson(path.join(GLOSSARY_DIR, file)) ?? {};
      return {
        file,
        slug: String(data.slug ?? file.replace(/\.json$/, '')),
        term: String(data.term ?? ''),
        reading: String(data.reading ?? ''),
        description: String(data.description ?? ''),
        caseSensitive: data.caseSensitive === true,
        excludeSpellings: Array.isArray(data.excludeSpellings)
          ? data.excludeSpellings.map((s) => String(s ?? ''))
          : [],
        _original: data,
      };
    });
}

/** 用語集を検証する。errors があれば保存しない。 */
export function validateGlossary(entries) {
  const errors = [];
  const warnings = [];
  const seenSlugs = new Map();
  const seenTerms = new Map();

  entries.forEach((entry, i) => {
    const row = i + 1;
    const term = String(entry.term ?? '').trim();
    const slug = normalizeSlug(entry.slug || entry.term);

    if (!term) errors.push(`${row} 行目: 用語 (term) は必須です`);
    if (!slug) errors.push(`${row} 行目: スラッグを生成できません。半角英数字で入力してください`);

    if (slug) {
      if (seenSlugs.has(slug)) {
        errors.push(`${row} 行目: スラッグ "${slug}" が ${seenSlugs.get(slug)} 行目と重複しています`);
      } else {
        seenSlugs.set(slug, row);
      }
    }

    const termKey = entry.caseSensitive ? term : term.toLowerCase();
    if (term) {
      if (seenTerms.has(termKey)) {
        warnings.push(`${row} 行目: 用語 "${term}" が ${seenTerms.get(termKey)} 行目と重複しています`);
      } else {
        seenTerms.set(termKey, row);
      }
    }

    if (!String(entry.description ?? '').trim()) {
      warnings.push(`${row} 行目: 説明が空です（POPUP に読みだけが表示されます）`);
    }
  });

  return { errors, warnings };
}

/**
 * 用語集を保存する。
 * - slug 変更時はファイル名も変更する（Keystatic の slugField と同じ挙動）
 * - 削除された用語のファイルは削除する
 * - 未知フィールドは保持する
 */
export function saveGlossary(entries) {
  const existing = loadGlossary();
  const existingByFile = new Map(existing.map((e) => [e.file, e]));

  const touched = new Set();
  const renames = [];
  const writes = [];

  for (const entry of entries) {
    const slug = normalizeSlug(entry.slug || entry.term);
    const targetFile = `${slug}.json`;
    const targetPath = path.join(GLOSSARY_DIR, targetFile);

    // 同じ内容の元ファイルを特定する（file が来ていればそれを優先）
    const source = entry.file ? existingByFile.get(entry.file) : undefined;
    const original = source?._original ?? readJson(targetPath) ?? {};

    const known = {
      slug,
      term: String(entry.term ?? '').trim(),
      reading: String(entry.reading ?? ''),
      description: String(entry.description ?? ''),
      caseSensitive: entry.caseSensitive === true,
      excludeSpellings: Array.isArray(entry.excludeSpellings)
        ? entry.excludeSpellings.map((s) => String(s ?? '').trim()).filter(Boolean)
        : [],
    };

    const next = mergePreservingUnknown(original, known, GLOSSARY_FIELDS);
    writes.push({ path: targetPath, data: next });
    touched.add(targetFile);

    if (source && source.file !== targetFile) {
      renames.push({ from: path.join(GLOSSARY_DIR, source.file), to: targetPath });
    }
  }

  const removals = existing
    .filter((e) => !touched.has(e.file))
    .map((e) => path.join(GLOSSARY_DIR, e.file));

  const backup = backupFiles([
    ...writes.map((w) => w.path),
    ...renames.map((r) => r.from),
    ...removals,
  ]);

  for (const { path: file, data } of writes) writeJsonAtomic(file, data);
  for (const { from } of renames) {
    if (fs.existsSync(from) && !writes.some((w) => w.path === from)) fs.rmSync(from);
  }
  for (const file of removals) fs.rmSync(file, { force: true });

  return {
    written: writes.map((w) => path.relative(process.cwd(), w.path)),
    removed: removals.map((f) => path.relative(process.cwd(), f)),
    backup,
  };
}
