#!/usr/bin/env python3
"""
コンテンツ JSON に実在する全キーが keystatic.config.ts のスキーマに
定義されているかを機械的に突き合わせる。

    为什么要它
    ------------
    Keystatic のスキーマに無いフィールドは
      1) 編集画面に現れない
      2) Save した時にデータから消える（保存時のデータ損失）
    したがって「実データのキー集合 ⊆ スキーマのキー集合」であることを
    機械的に保証する必要がある。

使い方:
    python3 scripts/check-schema-coverage.py
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, 'keystatic.config.ts')

TARGETS = [
    ('blog MDX', 'src/content/blog'),
    ('page', 'src/content/pages'),
    ('global', 'src/content/global'),
    ('portal', 'src/content/portal'),
    ('config', 'src/content/config'),
    ('settings', 'src/content/settings'),
]


def parse_mdx_frontmatter(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    m = re.match(r'^---\n(.*?)\n---', text, re.S)
    if not m:
        return {}
    data = {}
    for line in m.group(1).split('\n'):
        km = re.match(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$', line)
        if km:
            data[km.group(1)] = km.group(2)
    return data


def load(path):
    if path.endswith('.mdx'):
        return parse_mdx_frontmatter(path)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def top_keys(obj):
    """ネスト構造を末端まで再帰的に列挙（配列は要素1件の型を見る）。"""
    keys = set()

    def walk(node, prefix):
        if isinstance(node, dict):
            for k, v in node.items():
                keys.add(f'{prefix}{k}')
                walk(v, f'{prefix}{k}.')
        elif isinstance(node, list) and node and isinstance(node[0], dict):
            for item in node[:1]:
                walk(item, f'{prefix}[].')

    walk(obj, '')
    return keys


def schema_declared_keys():
    """keystatic.config.ts からスキーマ宣言キーを正引きで読む。"""
    src = open(CONFIG, encoding='utf-8').read()
    declared = set()
    for m in re.finditer(r'^\s*([A-Za-z_][A-Za-z0-9_]*):\s*fields\.', src, re.M):
        declared.add(m.group(1))
    for m in re.finditer(r'^\s*([A-Za-z_][A-Za-z0-9_]*):\s*imageField\(', src, re.M):
        declared.add(m.group(1))
    return declared


def main():
    declared = schema_declared_keys()
    problems = []
    seen_files = 0

    for label, rel in TARGETS:
        base = os.path.join(ROOT, rel)
        if not os.path.isdir(base):
            continue
        for name in sorted(os.listdir(base)):
            if not name.endswith(('.json', '.mdx')):
                continue
            path = os.path.join(base, name)
            try:
                data = load(path)
            except Exception as exc:  # noqa: BLE001
                problems.append(f'{label}/{name}: 読み込み失敗 {exc}')
                continue
            seen_files += 1
            for key in sorted(top_keys(data)):
                root_key = key.split('.')[0].split('[')[0]
                if root_key not in declared:
                    problems.append(f'{label}/{name}: スキーマ未宣言 → {key}')

    print('=' * 70)
    print(f'検査ファイル数: {seen_files}')
    print(f'schema 宣言キー: {len(declared)}')
    if problems:
        print(f'\n未宣言キー {len(problems)} 件:')
        for p in problems:
            print('  -', p)
    else:
        print('\n全キーがスキーマに宣言済み（未宣言なし）')
    print('=' * 70)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
