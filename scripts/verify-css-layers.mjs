// Astro 7 / Tailwind 4 移行後の CSS 検証:
// - レイヤー外(unlayered)に要素セレクタの font-size が残っていないか
//   (レイヤー外は @layer utilities より常に優先されるため、text-* を打ち消す)
// - /about /contact が stylesheet を読んでいるか
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const cssFiles = fs.readdirSync(path.join(dist, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => path.join(dist, '_astro', f));

let failed = false;
const fail = (msg) => { failed = true; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok:   ${msg}`);

for (const file of cssFiles) {
  const s = fs.readFileSync(file, 'utf8');
  console.log(`--- ${path.basename(file)} (${s.length} bytes)`);

  // @layer X { ... } の範囲を収集
  const spans = [];
  const re = /@layer\s+(\w+)\s*\{/g;
  let m;
  while ((m = re.exec(s))) {
    let depth = 0;
    for (let j = m.index; j < s.length; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') {
        depth--;
        if (depth === 0) { spans.push([m[1], m.index, j]); break; }
      }
    }
  }
  const layerOf = (pos) => {
    for (const [name, a, b] of spans) if (a < pos && pos < b) return name;
    return 'UNLAYERED';
  };
  console.log('  layers:', spans.map(([n, a, b]) => `${n}[${a}-${b}]`).join(' '));

  // 要素セレクタの font-size ルールを全走査
  const ruleRe = /(?:^|[};])\s*([a-z][a-z0-9,\s.:#\[\]"=-]*)\{([^}]*font-size:[^}]*)\}/g;
  while ((m = ruleRe.exec(s))) {
    const selector = m[1].trim();
    // 要素セレクタ（h1-h6, p, body, html, label, button, strong など、クラス/ID無し）
    if (!/^(?:h[1-6]|p|body|html|label|button|strong|b|li|td|th|blockquote|code|pre|a|input|textarea|legend|figcaption)\b/.test(selector)) continue;
    const layer = layerOf(m.index);
    const snippet = m[0].slice(0, 100);
    if (layer === 'UNLAYERED') {
      fail(`レイヤー外の要素 font-size: ${snippet} @${m.index}`);
    } else {
      console.log(`  layer=${layer}: ${snippet}`);
    }
  }
}

// ページの stylesheet 読込確認
for (const page of ['about/index.html', 'contact/index.html', 'index.html']) {
  const html = fs.readFileSync(path.join(dist, page), 'utf8');
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((x) => x[1]);
  const hasTailwind = links.some((l) => l.endsWith('.css'));
  if (hasTailwind) ok(`${page} -> ${links.join(', ')}`);
  else fail(`${page} に Tailwind CSS の link が無い: [${links.join(', ')}]`);
}

process.exit(failed ? 1 : 0);
