#!/usr/bin/env python3
"""
元 Tina JSON (backup/tina-json-original/) と現在の MDX/JSON を
フィールド単位で突き合わせ、移行・編集の過程で失われた内容を洗い出す。

使い方: python3 scripts/audit-content.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP = os.path.join(ROOT, 'backup', 'tina-json-original')
BLOG = os.path.join(ROOT, 'src', 'content', 'blog')
PAGES = os.path.join(ROOT, 'src', 'content', 'pages')

# Tina の JSON 名(大文字混在) -> 現在のファイル名(小文字)
def key(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def parse_mdx(path):
    """MDX のフロントマターを素朴に解析(値のみ、YAMLライブラリ不要)。"""
    with open(path, encoding='utf-8') as f:
        text = f.read()
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.S)
    if not m:
        return {}, text
    fm_text, body = m.group(1), m.group(2)
    fm = {}
    cur = None
    for line in fm_text.split('\n'):
        km = re.match(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$', line)
        if km:
            cur = km.group(1)
            fm[cur] = km.group(2)
        elif line.strip() and cur:
            fm[cur] += '\n' + line
    for k, v in list(fm.items()):
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in '"\'':
            v = v[1:-1]
        fm[k] = v
    return fm, body


def norm(v):
    """空白差と Markdown 記号を無視して比較する。"""
    if v is None:
        return ''
    s = str(v)
    s = re.sub(r'[\s\*_`~>#-]', '', s)
    return s.lower()


def main():
    problems = []
    for json_name in sorted(os.listdir(BACKUP)):
        if not json_name.endswith('.json'):
            continue
        base = json_name[:-5]
        with open(os.path.join(BACKUP, json_name), encoding='utf-8') as f:
            old = json.load(f)

        stem = key(base)
        mdx_path = os.path.join(BLOG, stem + '.mdx')
        json_path = os.path.join(PAGES, stem + '.json')

        if os.path.exists(mdx_path):
            fm, body = parse_mdx(mdx_path)
            where = 'mdx'
        elif os.path.exists(json_path):
            with open(json_path, encoding='utf-8') as f:
                fm = json.load(f)
            body = ''
            where = 'json'
        else:
            problems.append(f'{base}: 移行先ファイルが見つかりません')
            continue

        hero = old.get('hero') or {}
        checks = [
            ('title', old.get('title'), fm.get('title')),
            ('hero.image1', hero.get('image1'), fm.get('heroImage')),
            ('hero.title', hero.get('title'), fm.get('heroTitle')),
            ('hero.subtitle', hero.get('subtitle'), fm.get('heroSubtitle')),
            ('japaneseText', old.get('japaneseText'), fm.get('japaneseText')),
        ]
        for field, ov, nv in checks:
            if ov and not nv:
                problems.append(f'{stem} [{where}] {field}: 欠落 ({len(str(ov))} 文字が消失)')
            elif ov and nv and norm(ov) != norm(nv):
                problems.append(f'{stem} [{where}] {field}: 差分あり (元{len(str(ov))}字 / 現{len(str(nv))}字)')

        # 本文ブロック数
        old_secs = old.get('contentSections') or []
        if where == 'mdx' and old_secs:
            grids = body.count('<ImageGrid')
            old_grids = sum(1 for s in old_secs if s.get('_template') == 'imageGrid')
            if grids < old_grids:
                problems.append(f'{stem} [mdx] imageGrid 数: 元{old_grids} → 現{grids}')

    print('=' * 68)
    if problems:
        print(f'要確認 {len(problems)} 件:')
        for p in problems:
            print('  -', p)
    else:
        print('差分なし: 移行済み内容は元JSONと一致しています。')
    print('=' * 68)
    return 0


if __name__ == '__main__':
    sys.exit(main())
