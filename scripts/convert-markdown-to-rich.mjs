#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function parseInlineNodes(text) {
  // Convert text with **bold**, *italic*, _italic_ and single-line breaks into Tina inline nodes
  if (text == null) return [];
  const nodes = [];
  const source = String(text);
  const inlineRe = /(\*\*([^*\n][\s\S]*?[^*\n]|[^*\n])\*\*)|(\*([^*\n][\s\S]*?[^*\n]|[^*\n])\*)|(_([^_\n][\s\S]*?[^_\n]|[^_\n])_)/g;
  let match;
  let cursor = 0;

  while ((match = inlineRe.exec(source)) !== null) {
    const idx = match.index;
    if (idx > cursor) {
      nodes.push({ type: 'text', text: source.slice(cursor, idx) });
    }

    if (match[1]) {
      nodes.push({ type: 'text', text: match[2], bold: true });
    } else {
      nodes.push({ type: 'text', text: match[4] || match[6], italic: true });
    }

    cursor = idx + match[0].length;
  }

  if (cursor < source.length) {
    nodes.push({ type: 'text', text: source.slice(cursor) });
  }

  // Post-process nodes to split on line breaks into sequences with break nodes
  const final = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      const parts = n.text.split(/\n/);
      for (let i = 0; i < parts.length; i++) {
        const t = parts[i];
        if (t.length > 0) {
          final.push({
            type: 'text',
            text: t,
            ...(n.bold ? { bold: true } : {}),
            ...(n.italic ? { italic: true } : {}),
          });
        }
        if (i < parts.length - 1) final.push({ type: 'break', children: [] });
      }
    } else {
      final.push(n);
    }
  }
  return final;
}

function convertParagraphs(src) {
  if (src == null) return { type: 'root', children: [] };
  if (typeof src === 'object' && src.type == 'root' && Array.isArray(src.children)) return src; // already rich
  // Split into paragraphs by two or more newlines
  const paragraphs = String(src).split(/\n{2,}/);
  const children = paragraphs.map(p => ({ type: 'p', children: parseInlineNodes(p) }));
  return { type: 'root', children };
}

function convertFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  const changed = { japaneseText: false, bodyText: [] };
  const out = JSON.parse(JSON.stringify(json));
  
  // japaneseText
  if (typeof out.japaneseText === 'string') {
    out.japaneseText = convertParagraphs(out.japaneseText);
    changed.japaneseText = true;
  }

  // contentSections[*].bodyText
  if (Array.isArray(out.contentSections)) {
    for (let i = 0; i < out.contentSections.length; i++) {
      const s = out.contentSections[i];
      if (s && typeof s.bodyText === 'string') {
        out.contentSections[i].bodyText = convertParagraphs(s.bodyText);
        changed.bodyText.push(i);
      }
    }
  }

  return { before: json, after: out, changed };
}

function writeConverted(filePath, after) {
  const dest = filePath + '.converted.json';
  fs.writeFileSync(dest, JSON.stringify(after, null, 2) + '\n', 'utf8');
  return dest;
}

function ensureBak(filePath) {
  const bak = filePath + '.bak';
  if (!fs.existsSync(bak)) fs.copyFileSync(filePath, bak);
}

// Main
const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node convert-markdown-to-rich.mjs <file1.json> [file2.json] ...');
  process.exit(1);
}

for (const t of targets) {
  const p = path.resolve(t);
  if (!fs.existsSync(p)) {
    console.error('Not found:', p);
    continue;
  }
  ensureBak(p);
  const { before, after, changed } = convertFile(p);
  const dest = writeConverted(p, after);
  console.log('Converted', p, '->', dest, 'changed:', changed);
}