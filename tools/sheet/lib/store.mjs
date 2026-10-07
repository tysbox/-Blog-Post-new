// スプレッドシート型エディタの保存層。
//
// 重要: Keystatic の編集構造を一切変えない。
//   - カルタ   : src/content/karuta/karuta.json （singleton / cards 配列）
//   - 用語集   : src/content/glossary/<slug>.json （1 用語 = 1 ファイル）
// 書き込み時は「既存ファイルの未知フィールドを保持したまま、既知フィールドだけ更新」する。
// これにより Keystatic 側のスキーマ・並び順・コメント的な運用を壊さない。
import fs from 'node:fs';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
export const GLOSSARY_DIR = path.join(REPO_ROOT, 'src/content/glossary');
export const KARUTA_FILE = path.join(REPO_ROOT, 'src/content/karuta/karuta.json');
export const BACKUP_DIR = path.join(REPO_ROOT, '.sheet-backups');
const MAX_BACKUPS = 20;

/** JSON を整形して読む。存在しなければ null。 */
export function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 一時ファイル経由で原子的に書き込む（書き込み途中の破損を防ぐ）。 */
export function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

/** 書き込み前のバックアップ（.sheet-backups/<timestamp>/ に相対パスを保って退避）。 */
export function backupFiles(files) {
  const existing = files.filter((f) => fs.existsSync(f));
  if (existing.length === 0) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(BACKUP_DIR, stamp);
  for (const file of existing) {
    const rel = path.relative(REPO_ROOT, file);
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }

  // 古いバックアップを間引く
  const dirs = fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const old of dirs.slice(0, Math.max(0, dirs.length - MAX_BACKUPS))) {
    fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true });
  }
  return dir;
}

/** スラッグをファイル名として安全な形に正規化する。 */
export function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 既知フィールドを先頭に、未知フィールドを後ろに残して並べ替える。 */
export function mergePreservingUnknown(original, known, order) {
  const out = {};
  for (const key of order) {
    if (known[key] !== undefined) out[key] = known[key];
  }
  for (const [key, value] of Object.entries(original ?? {})) {
    if (!(key in out)) out[key] = value;
  }
  return out;
}
