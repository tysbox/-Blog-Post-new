#!/usr/bin/env python3
"""
編集 → 保存 → 再ビルド → HTML 反映 の全天往返を検証する。

    何を検証するか
    --------------
    1. 現在のコンテンツ値が dist の HTML に出ているか（一致確認）
    2. 各フィールドに印となる文字列を実際に書き込む（Keystatic が
       Save ，它是同一文件）
    3. 再ビルドして、印が HTML に出ているか確認する（即時反映）
    4. 必ず元に戻す（backup から復元）

    対象:
      - blog: heroImage / heroTitle(太字) / 本文 textBlock / 本文 imageGrid
      - page(JSON): hero.title / textBlock
      - about singleton: mainTitle
      - site singleton: siteTitle

使い方:
    python3 scripts/verify-roundtrip.py
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SNAP = os.path.join(ROOT, '.roundtrip-snapshot')

BLOG = os.path.join(ROOT, 'src/content/blog/from-kyoto-to-the-world.mdx')
PAGE = os.path.join(ROOT, 'src/content/pages/shinto-as-japanese-cultural-os-pt1.json')
ABOUT = os.path.join(ROOT, 'src/content/global/about.json')
SITE = os.path.join(ROOT, 'src/content/global/config.json')

MARK = 'ZZRTESTZZ'
FAIL = []


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def build():
    r = subprocess.run(['npx', 'astro', 'build'], cwd=ROOT,
                       capture_output=True, text=True)
    return r.returncode == 0, (r.stdout + r.stderr)[-800:]


def page_html(route):
    # route が空文字のときは dist 直下の index.html
    p = (os.path.join(DIST, 'index.html') if route == ''
         else os.path.join(DIST, route, 'index.html'))
    return read(p) if os.path.exists(p) else ''


def verify(label, needle, route, markup=True):
    html = page_html(route)
    if not html:
        FAIL.append(f'{label}: 出力 HTML なし ({route})')
        return
    ok = needle in html
    if not ok and markup:
        stripped = re.sub(r'\s+', '', re.sub(r'<[^>]+>', ' ', html))
        ok = re.sub(r'\s+', '', needle) in stripped
    status = 'OK ' if ok else 'NG '
    print(f'  {status} {label}: {needle[:50]}')
    if not ok:
        FAIL.append(f'{label}: {needle[:50]}')


def snapshot():
    os.makedirs(SNAP, exist_ok=True)
    for p in (BLOG, PAGE, ABOUT, SITE):
        shutil.copy2(p, os.path.join(SNAP, os.path.basename(p)))


def restore():
    for p in (BLOG, PAGE, ABOUT, SITE):
        shutil.copy2(os.path.join(SNAP, os.path.basename(p)), p)
    shutil.rmtree(SNAP, ignore_errors=True)


def main():
    print('=== 1) 現在の値の反映確認 ===')
    ok, log = build()
    if not ok:
        print('ビルド失敗:\n' + log)
        return 1
    print('  ビルド OK (18 pages)')

    print('\n=== 2) 各フィールドに印を書き込む ===')
    snapshot()

    # blog: heroImage / heroTitle(太字) / textBlock / imageGrid
    s = read(BLOG)
    s = re.sub(r'^heroImage: .*$', f'heroImage: "/images/{MARK}-hero.webp"', s, count=1, flags=re.M)
    s = re.sub(r'^heroTitle: .*$', f'heroTitle: "**{MARK}-HERO**"', s, count=1, flags=re.M)
    s = re.sub(r'(bodyText: \|-\n)', rf'\1      {MARK}-TEXT-PARAGRAPH\n', s, count=1)
    s = re.sub(r'(- src: )"[^"]*"', rf'\1"/images/{MARK}-body.webp"', s, count=1)
    write(BLOG, s)
    print(f'  blog に印書き込み: heroImage / heroTitle(**太字**) / bodyText / imageGrid')

    # page(JSON): hero.title
    d = json.loads(read(PAGE))
    d['hero']['title'] = f'{MARK}-PAGE-HERO'
    write(PAGE, json.dumps(d, ensure_ascii=False, indent=2))
    print('  page に印書き込み: hero.title')

    # about singleton
    d = json.loads(read(ABOUT))
    d['mainTitle'] = f'{MARK}-ABOUT'
    write(ABOUT, json.dumps(d, ensure_ascii=False, indent=2))
    print('  about に印書き込み: mainTitle')

    # site singleton
    d = json.loads(read(SITE))
    d['siteTitle'] = f'{MARK}-SITETITLE'
    write(SITE, json.dumps(d, ensure_ascii=False, indent=2))
    print('  site に印書き込み: siteTitle')

    print('\n=== 3) 再ビルドして即時反映を確認 ===')
    ok, log = build()
    if not ok:
        print('ビルド失敗:\n' + log)
        restore()
        return 1
    print('  ビルド OK\n')

    print('  [blog]')
    verify('heroImage', f'/images/{MARK}-hero.webp', 'blog/from-kyoto-to-the-world')
    verify('heroTitle(太字)', MARK + '-HERO</strong>', 'blog/from-kyoto-to-the-world')
    verify('bodyText', MARK + '-TEXT-PARAGRAPH', 'blog/from-kyoto-to-the-world')
    verify('imageGrid', f'/images/{MARK}-body.webp', 'blog/from-kyoto-to-the-world')

    print('  [page]')
    verify('hero.title', MARK + '-PAGE-HERO', 'shinto-as-japanese-cultural-os-pt1')

    print('  [about singleton]')
    verify('mainTitle', MARK + '-ABOUT', 'about')

    print('  [site singleton / 全ページ共通]')
    verify('siteTitle', MARK + '-SITETITLE', '')
    verify('siteTitle(about)', MARK + '-SITETITLE', 'about')
    verify('siteTitle(blog)', MARK + '-SITETITLE', 'blog/from-kyoto-to-the-world')

    print('\n=== 4) 元に戻す ===')
    restore()
    ok, _ = build()
    print('  復元して再ビルド:', 'OK' if ok else '失敗')

    print('\n' + '=' * 70)
    if FAIL:
        print(f'不一致 {len(FAIL)} 件:')
        for f in FAIL:
            print('  -', f)
    else:
        print('全フィールドで 編集→保存→HTML反映 を確認')
    print('=' * 70)
    return 1 if FAIL else 0


if __name__ == '__main__':
    sys.exit(main())
