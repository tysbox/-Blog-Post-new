// RFC 4180 準拠の最小 CSV パーサ / シリアライザ。
// スプレッドシート（Excel / Google スプレッドシート / Numbers）との
// コピー＆ペーストとファイル入出力に使う。
// 先頭 BOM と CRLF を許容する。

/** CSV 文字列を行×列の配列に変換する。 */
export function parseCsv(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // CRLF / CR は行区切りとして扱う
      if (src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 末尾の空行を落とす
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) rows.pop();
  return rows;
}

/** 行×列の配列を CSV 文字列に変換する。 */
export function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? '' : String(cell);
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
}

/**
 * タブ区切り（スプレッドシートからの貼り付け）を検出して解析する。
 * タブが含まれていれば TSV、そうでなければ CSV として扱う。
 */
export function parseDelimited(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  if (src.includes('\t')) {
    return src
      .split(/\r?\n/)
      .filter((line, i, arr) => !(i === arr.length - 1 && line === ''))
      .map((line) => line.split('\t'));
  }
  return parseCsv(src);
}
