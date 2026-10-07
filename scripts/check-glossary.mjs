// 用語集（src/content/glossary/*.json）の健全性チェック。
//
// 背景: 用語集は「記事の英語本文（contentSections[].bodyText）に実在する語」だけが
// ハイライトされる。本文に一度も出てこない語を登録しても何も起きず、
// 「登録したのに反映されない」という誤解を招く（実際に発生した）。
//
// このスクリプトは src/utils/glossary.ts と同じ照合規則で出現数を数え、
// 0 件の用語を警告する。CI / pre-commit 用に終了コード 1 を返す。
//
// 照合ロジックは scripts/lib/glossary-usage.mjs に集約している
// （tools/sheet のスプレッドシート型エディタと同じ実装を共有するため）。
//
// 使い方:
//   node scripts/check-glossary.mjs          # 警告があれば exit 1
//   node scripts/check-glossary.mjs --quiet  # 0 件の用語だけ表示
import { analyzeGlossary } from './lib/glossary-usage.mjs';

const quiet = process.argv.includes('--quiet');

const { entries, articles, totalChars, errors } = analyzeGlossary();

for (const err of errors) console.log(`FAIL: ${err}`);
if (errors.length > 0) process.exit(1);

if (totalChars === 0) {
  console.log('FAIL: 記事本文（contentSections[].bodyText）を1文字も取得できませんでした');
  process.exit(1);
}

const unused = entries.filter((r) => r.count === 0);

if (!quiet) {
  console.log(`用語集 ${entries.length} 件 / 記事 ${articles.length} 件（本文 ${totalChars} 文字）\n`);
  for (const r of entries) {
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
