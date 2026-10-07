// スプレッドシート型エディタのローカルサーバー。
//
//   npm run sheet
//
// 依存パッケージを増やさないため Node 標準の http のみで実装している。
// 127.0.0.1 のみで待ち受け、外部からはアクセスできない。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { analyzeGlossary } from '../../../scripts/lib/glossary-usage.mjs';
import { parseDelimited, toCsv } from './csv.mjs';
import {
  GLOSSARY_FIELDS,
  GLOSSARY_LABELS,
  KARUTA_CARD_FIELDS,
  KARUTA_CARD_LABELS,
  KARUTA_MULTILINE_FIELDS,
  loadGlossary,
  loadKaruta,
  saveGlossary,
  saveKaruta,
  validateGlossary,
  validateKaruta,
} from './data.mjs';
import { BACKUP_DIR, GLOSSARY_DIR, REPO_ROOT, backupFiles, readJson, writeJsonAtomic } from './store.mjs';

const PORT = Number(process.env.SHEET_PORT) > 0 ? Number(process.env.SHEET_PORT) : 4322;
const HOST = '127.0.0.1';
const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
const MAX_BODY = 8 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('リクエストが大きすぎます'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

/** 用語集の出現数（記事本文との突き合わせ）を返す。 */
function usagePayload() {
  const { entries, articles, totalChars, errors } = analyzeGlossary();
  const bySlug = new Map();
  for (const entry of entries) {
    bySlug.set(entry.slug, { count: entry.count, perArticle: entry.perArticle });
  }
  return {
    bySlug: Object.fromEntries(bySlug),
    articleCount: articles.length,
    totalChars,
    errors,
  };
}

function statePayload() {
  return {
    karuta: loadKaruta(),
    glossary: loadGlossary().map(({ _original, ...rest }) => rest),
    usage: usagePayload(),
    meta: {
      repoRoot: REPO_ROOT,
      karutaFields: KARUTA_CARD_FIELDS,
      karutaLabels: KARUTA_CARD_LABELS,
      karutaMultiline: [...KARUTA_MULTILINE_FIELDS],
      glossaryFields: GLOSSARY_FIELDS,
      glossaryLabels: GLOSSARY_LABELS,
    },
  };
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(BACKUP_DIR, d.name);
      const files = [];
      const walk = (current) => {
        for (const item of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, item.name);
          if (item.isDirectory()) walk(full);
          else files.push(path.relative(dir, full));
        }
      };
      walk(dir);
      return { id: d.name, files };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

function restoreBackup(id) {
  const dir = path.join(BACKUP_DIR, String(id));
  if (!dir.startsWith(BACKUP_DIR) || !fs.existsSync(dir)) {
    throw new Error('指定されたバックアップが見つかりません');
  }
  const restored = [];
  const backedUp = new Set();
  const walk = (current) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = path.relative(dir, full);
      backedUp.add(rel);
      const target = path.join(REPO_ROOT, rel);
      if (!target.startsWith(REPO_ROOT)) continue;
      backupFiles([target]);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(full, target);
      restored.push(rel);
    }
  };
  walk(dir);

  // バックアップ後に追加された用語集ファイルは「その時点に存在しなかった」ので取り除く。
  // （残すと復元後に同じ用語が二重登録される）
  const removed = [];
  const glossaryRel = path.relative(REPO_ROOT, GLOSSARY_DIR);
  const hasGlossarySnapshot = [...backedUp].some((rel) => rel.startsWith(`${glossaryRel}${path.sep}`));
  if (hasGlossarySnapshot && fs.existsSync(GLOSSARY_DIR)) {
    for (const file of fs.readdirSync(GLOSSARY_DIR)) {
      if (!file.endsWith('.json')) continue;
      const rel = path.join(glossaryRel, file);
      if (backedUp.has(rel)) continue;
      backupFiles([path.join(GLOSSARY_DIR, file)]);
      fs.rmSync(path.join(GLOSSARY_DIR, file), { force: true });
      removed.push(rel);
    }
  }

  return { restored, removed };
}

function exportCsv(type) {
  if (type === 'karuta') {
    const { cards } = loadKaruta();
    const rows = [KARUTA_CARD_FIELDS.map((f) => KARUTA_CARD_LABELS[f])];
    for (const card of cards) {
      rows.push(KARUTA_CARD_FIELDS.map((f) => String(card[f] ?? '')));
    }
    return { filename: 'karuta.csv', csv: toCsv(rows) };
  }

  const entries = loadGlossary();
  const rows = [GLOSSARY_FIELDS.map((f) => GLOSSARY_LABELS[f])];
  for (const entry of entries) {
    rows.push(
      GLOSSARY_FIELDS.map((f) => {
        if (f === 'caseSensitive') return entry.caseSensitive ? 'TRUE' : 'FALSE';
        if (f === 'excludeSpellings') return entry.excludeSpellings.join(' | ');
        return String(entry[f] ?? '');
      }),
    );
  }
  return { filename: 'glossary.csv', csv: toCsv(rows) };
}

/** CSV/TSV を取り込み、ヘッダー名からフィールドを推定して行データを返す。 */
function importRows(type, text) {
  const table = parseDelimited(text);
  if (table.length === 0) return { rows: [], unknownHeaders: [] };

  const fields = type === 'karuta' ? KARUTA_CARD_FIELDS : GLOSSARY_FIELDS;
  const labels = type === 'karuta' ? KARUTA_CARD_LABELS : GLOSSARY_LABELS;
  const header = table[0].map((h) => String(h ?? '').trim());

  // ヘッダーは「ラベル（日本語）」「フィールド名（英語）」「ラベル (field)」のいずれも許容する
  const indexToField = header.map((h) => {
    const bare = h.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const paren = h.match(/\(([^)]*)\)\s*$/)?.[1]?.trim();
    return (
      fields.find((f) => f === h) ??
      fields.find((f) => f === paren) ??
      fields.find((f) => labels[f] === bare) ??
      null
    );
  });

  const unknownHeaders = header.filter((h, i) => h !== '' && indexToField[i] === null);

  const rows = table.slice(1).map((cells) => {
    const row = {};
    indexToField.forEach((field, i) => {
      if (!field) return;
      const value = String(cells[i] ?? '').trim();
      if (field === 'caseSensitive') {
        row[field] = /^(true|1|on|yes|はい|○|✓)$/i.test(value);
      } else if (field === 'excludeSpellings') {
        row[field] = value
          .split(/\s*[|｜]\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        row[field] = value;
      }
    });
    return row;
  });

  return { rows, unknownHeaders };
}

const routes = {
  'GET /api/state': async () => ({ status: 200, body: statePayload() }),

  'GET /api/usage': async () => ({ status: 200, body: usagePayload() }),

  'GET /api/backups': async () => ({ status: 200, body: { backups: listBackups() } }),

  'POST /api/karuta': async (req) => {
    const body = await readJsonBody(req);
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const max = Number(body.max) > 0 ? Number(body.max) : 100;
    const { errors, warnings } = validateKaruta(cards, { max });
    if (errors.length > 0) return { status: 400, body: { ok: false, errors, warnings } };

    const result = saveKaruta({ perPage: body.perPage, max, cards });
    return { status: 200, body: { ok: true, warnings, ...result, state: statePayload() } };
  },

  'POST /api/glossary': async (req) => {
    const body = await readJsonBody(req);
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const { errors, warnings } = validateGlossary(entries);
    if (errors.length > 0) return { status: 400, body: { ok: false, errors, warnings } };

    const result = saveGlossary(entries);
    return { status: 200, body: { ok: true, warnings, ...result, state: statePayload() } };
  },

  'POST /api/import': async (req) => {
    const body = await readJsonBody(req);
    const type = body.type === 'karuta' ? 'karuta' : 'glossary';
    const { rows, unknownHeaders } = importRows(type, body.text ?? '');
    return { status: 200, body: { ok: true, rows, unknownHeaders } };
  },

  'POST /api/restore': async (req) => {
    const body = await readJsonBody(req);
    const result = restoreBackup(body.id);
    return { status: 200, body: { ok: true, ...result, state: statePayload() } };
  },
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  // アプリ自身のアセット → リポジトリの public/（画像プレビュー用）の順に探す
  const candidates = [path.join(PUBLIC_DIR, rel), path.join(REPO_ROOT, 'public', rel)];
  const file = candidates.find(
    (candidate) =>
      candidate.startsWith(PUBLIC_DIR) || candidate.startsWith(path.join(REPO_ROOT, 'public'))
        ? fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory()
        : false,
  );

  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const key = `${req.method} ${url.pathname}`;

  if (key === 'GET /api/export') {
    const type = url.searchParams.get('type') === 'karuta' ? 'karuta' : 'glossary';
    const { filename, csv } = exportCsv(type);
    res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    });
    res.end(`\uFEFF${csv}`);
    return;
  }

  const handler = routes[key];
  if (handler) {
    try {
      const { status, body } = await handler(req);
      sendJson(res, status, body);
    } catch (err) {
      sendJson(res, 500, { ok: false, errors: [err.message] });
    }
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJson(res, 404, { ok: false, errors: ['Not found'] });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log('スプレッドシート型エディタを起動しました');
  console.log(`  ${url}`);
  console.log(`  対象: src/content/karuta/karuta.json / src/content/glossary/*.json`);
  console.log('  終了: Ctrl+C');

  if (process.platform === 'darwin' && process.env.SHEET_NO_OPEN !== '1') {
    execFile('open', [url], () => {});
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`ポート ${PORT} は使用中です。SHEET_PORT=4323 npm run sheet のように変更してください。`);
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
