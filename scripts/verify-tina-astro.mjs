#!/usr/bin/env node
// Pre-build verification: Tina <-> Astro consistency + asset reachability.
// Read-only checks. Exits non-zero on failure.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
let failures = 0;
const fail = (msg) => { failures++; console.error(`[verify] FAIL: ${msg}`); };
const ok = (msg) => console.log(`[verify] OK: ${msg}`);

// 1. Tina collections vs Astro collections name mapping
const tinaSrc = fs.readFileSync(path.join(root, 'tina/config.tsx'), 'utf8');
const astroSrc = fs.readFileSync(path.join(root, 'src/content.config.ts'), 'utf8');
const tinaNames = [...tinaSrc.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
const needs = [
  ['contentPage', /src\/content\/pages/],
  ['blog', /src\/content\/blog/],
  ['portal', /src\/content\/portal/],
  ['global', /src\/content\/global/],
];
for (const [name] of needs) {
  if (tinaNames.includes(name)) ok(`tina collection "${name}" present`);
  else fail(`tina collection "${name}" missing`);
}
// Astro must define page/blog/global/portal (A-plan names)
for (const name of ['const page', 'const blog', 'const global', 'const portal']) {
  if (astroSrc.includes(name)) ok(`astro collection "${name}" present`);
  else fail(`astro collection "${name}" missing`);
}

// 2. JSON image references must exist in public/
const jsonFiles = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.json')) jsonFiles.push(p);
  }
};
walk(path.join(root, 'src/content'));
const imgRefs = new Set();
for (const f of jsonFiles) {
  try {
    const raw = fs.readFileSync(f, 'utf8');
    for (const m of raw.matchAll(/"\/images\/([^"]+)"/g)) imgRefs.add(m[1]);
  } catch {}
}
let missing = 0;
for (const ref of [...imgRefs].sort()) {
  const p = path.join(root, 'public/images', ref);
  if (!fs.existsSync(p)) { fail(`missing image: /images/${ref}`); missing++; }
}
if (!missing) ok(`all ${imgRefs.size} referenced images exist`);

// 3. Internal links in portal featuredItems must resolve
try {
  const home = JSON.parse(fs.readFileSync(path.join(root, 'src/content/portal/home.json'), 'utf8'));
  const items = home.featuredItems || [];
  for (const w of items) {
    const item = w?.item;
    if (typeof item === 'string' && item.includes('src/content/')) {
      const full = path.join(root, item);
      if (fs.existsSync(full)) ok(`featured target exists: ${item}`);
      else fail(`featured target missing: ${item}`);
    }
  }
  if (!items.length) console.log('[verify] WARN: no featuredItems');
} catch (e) {
  fail(`portal/home.json unreadable: ${e.message}`);
}

if (failures) { console.error(`[verify] ${failures} failure(s)`); process.exit(1); }
console.log('[verify] all checks passed');
