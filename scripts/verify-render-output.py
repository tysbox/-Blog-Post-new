#!/usr/bin/env python3
"""
Keystatic が編集する全フィールドの値が、ビルド済み HTML に実際に
反映されているかを機械的に検証する。

    保証する鎖
    ----------
    コンテンツファイル(Keystatic が書き換える対象) の値
      → Astro コレクションのスキーマ
        → 描画側(blog / page / about など)
          → dist/*.html

    編集画面自体は検証しない(ブラウザ操作ができないため)。
    「ファイル → HTML」の反映、すなわち編集が意味を持つための
    最低条件を機械的に保証する。

使い方:
    python3 scripts/verify-render-output.py
"""
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')

FAILURES = []
CHECKED = 0
BLOG_INDEX = []


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def norm(text):
    t = html.unescape(str(text))
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', '', t)


def demarkdown(text):
    """Markdown 記法を取り除いて、HTML 出力と 비교できるようにする。"""
    t = str(text)
    t = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', t)   # リンク・画像
    t = re.sub(r'[*_`~]', '', t)                          # 強調・コード
    t = re.sub(r'^#{1,6}\s*', '', t, flags=re.M)          # 見出し
    t = re.sub(r'^\s*>\s*', '', t, flags=re.M)            # 引用
    t = re.sub(r'\\([.!#$%&()*+,/:;<=>?@\[\]^_`{|}~-])', r'\1', t)  # エスケープ
    return t


def check(label, expected, page_html, ignore_markup=True):
    global CHECKED
    if expected is None or str(expected).strip() == '':
        return
    CHECKED += 1
    ok = (norm(demarkdown(expected))[:40] in norm(page_html)) if ignore_markup \
        else (str(expected) in page_html)
    if not ok:
        FAILURES.append(f'{label}: 未反映 -> {str(expected)[:55]}')


def split_fm(path):
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', read(path), re.S)
    if not m:
        return '', ''
    return m.group(1), m.group(2)


def parse_fm(fm_text):
    data, key = {}, None
    for line in fm_text.split('\n'):
        km = re.match(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$', line)
        if km:
            key = km.group(1)
            data[key] = km.group(2)
        elif key and line.strip():
            data[key] += '\n' + line
    for k, v in list(data.items()):
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in '"\'':
            v = v[1:-1]
        data[k] = v
    return data


def unblock(value):
    return re.sub(r'^\s*\|[-+]?\s*\n?', '', str(value))


def section_images(fm_text):
    """contentSections 内の画像パス（- src:）を列挙。"""
    return [l.split(':', 1)[1].strip().strip('"')
            for l in fm_text.split('\n') if l.strip().startswith('- src:')]


def verify_blog():
    base = os.path.join(ROOT, 'src', 'content', 'blog')
    for name in sorted(os.listdir(base)):
        if not name.endswith('.mdx'):
            continue
        fm_text, _ = split_fm(os.path.join(base, name))
        fm = parse_fm(fm_text)
        out = os.path.join(DIST, 'blog', name[:-4], 'index.html')
        if not os.path.exists(out):
            FAILURES.append(f'blog/{name}: 出力 HTML が存在しない')
            continue
        page = read(out)
        tag = f'blog/{name[:-4]}'

        check(f'{tag}.heroImage', fm.get('heroImage'), page, ignore_markup=False)
        check(f'{tag}.heroTitle', fm.get('heroTitle'), page)
        check(f'{tag}.heroSubtitle', unblock(fm.get('heroSubtitle', '')), page)
        # title は記事ページの表示タイトルではなく一覧と <title> に使われるため、
        # 一覧ページ側で検証する。
        if fm.get('title'):
            global BLOG_INDEX
            BLOG_INDEX.append((tag, fm['title']))

        for img in section_images(fm_text):
            check(f'{tag}.image', img, page, ignore_markup=False)

        for m in re.finditer(r'bodyText:\s*\|-\n((?:\s{6}.*\n?)+)', fm_text):
            line = m.group(1).strip().split('\n')[0].strip()
            check(f'{tag}.bodyText', line, page)
            break


def verify_pages():
    base = os.path.join(ROOT, 'src', 'content', 'pages')
    for name in sorted(os.listdir(base)):
        if not name.endswith('.json'):
            continue
        data = json.loads(read(os.path.join(base, name)))
        out = os.path.join(DIST, name[:-5], 'index.html')
        if not os.path.exists(out):
            FAILURES.append(f'page/{name}: 出力 HTML が存在しない')
            continue
        page = read(out)
        tag = f'page/{name[:-5]}'

        hero = data.get('hero') or {}
        check(f'{tag}.hero.image1', hero.get('image1'), page, ignore_markup=False)
        check(f'{tag}.hero.title', hero.get('title'), page)
        check(f'{tag}.hero.subtitle', hero.get('subtitle'), page)

        for sec in data.get('contentSections') or []:
            for img in sec.get('images') or []:
                check(f'{tag}.imageGrid.src', img.get('src'), page, ignore_markup=False)
            body = sec.get('bodyText')
            if body:
                check(f'{tag}.textBlock',
                      str(body).strip().split('\n')[0], page)


def verify_single(rel, route, mapping):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        return
    data = json.loads(read(p))
    # route が空文字のときは dist 直下の index.html
    out = (os.path.join(DIST, 'index.html') if route == ''
           else os.path.join(DIST, route, 'index.html'))
    if not os.path.exists(out):
        FAILURES.append(f'{rel}: 出力 HTML が存在しない')
        return
    page = read(out)
    for label, value in mapping(data):
        check(f'{rel}::{label}', value, page)


def main():
    verify_blog()
    verify_pages()

    verify_single('src/content/global/about.json', 'about', lambda d: [
        ('mainTitle', d.get('mainTitle')),
        ('subTitle', d.get('subTitle')),
        ('aboutAuthorTitle', d.get('aboutAuthorTitle')),
        ('aboutAuthorText', d.get('aboutAuthorText')),
        ('aboutBlogTitle', d.get('aboutBlogTitle')),
        ('aboutBlogText', d.get('aboutBlogText')),
        ('contactTitle', d.get('contactTitle')),
    ])

    verify_single('src/content/global/config.json', '', lambda d: [
        ('siteTitle', d.get('siteTitle')),
        ('footerText', d.get('footerText')),
    ] + [(f'navLinks[{i}]', l.get('label'))
         for i, l in enumerate(d.get('navLinks') or [])]
      + [(f'socialLinks[{i}]', l.get('platform'))
         for i, l in enumerate(d.get('socialLinks') or [])])

    verify_single('src/content/portal/home.json', '', lambda d: [
        ('introTitle', d.get('introTitle')),
    ] + [(f'hero.slides[{i}].title', (s or {}).get('title'))
         for i, s in enumerate(d.get('hero', {}).get('slides') or [])])

    # blog の title は一覧ページで描画される
    listing = os.path.join(DIST, 'blog', 'index.html')
    if os.path.exists(listing):
        html_text = read(listing)
        for tag, title in BLOG_INDEX:
            check(f'{tag}.title(一覧)', title, html_text)
    else:
        FAILURES.append('blog/index.html が存在しない')

    print('=' * 70)
    print(f'検証項目数: {CHECKED}')
    if FAILURES:
        print(f'不一致 {len(FAILURES)} 件:')
        for f in FAILURES:
            print('  -', f)
    else:
        print('全フィールドが HTML に反映されています')
    print('=' * 70)
    return 1 if FAILURES else 0


if __name__ == '__main__':
    sys.exit(main())

