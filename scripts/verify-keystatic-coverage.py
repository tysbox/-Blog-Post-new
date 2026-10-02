#!/usr/bin/env python3
"""
Keystatic の全入力フィールドが、ビルド済み HTML に反映されているかを検証する。

    Keystatic 編集画面の入力欄
      → src/content/** の実データ
        → Astro の描画
          → dist/*.html

    報告する観点:
      A. 未反映 … データはあるが HTML に出ていない（編集しても表示が変わらない）
      B. 無効   … src/ のどこからも参照されていない（編集しても表示が変わらない）
      C. 未入力 … データが空（参考情報。既定値で表示される場合あり）

使い方:
    npm run build
    python3 scripts/verify-keystatic-coverage.py
"""
import html
import json
import os
import re
import sys
import urllib.parse

try:
    import yaml
except ImportError:
    yaml = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SRC = os.path.join(ROOT, 'src')
BLOG_DIR = os.path.join(SRC, 'content', 'blog')

# フィールドの検証モード
TEXT = 'text'   # 正規化したテキストとして HTML 内を検索
ATTR = 'attr'   # src/href/url 等の属性値として生の HTML を検索
SKIP = 'skip'   # HTML に出ないのが正常（URL 生成・並び順・参照解決など）
DEAD = 'dead'   # src/ のどこからも参照されない（編集しても表示が変わらない）

UNREFLECTED = []
EMPTY = []
INEFFECTIVE = []
CHECKED = 0


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def norm(text):
    """HTML タグ・実体参照・空白・Markdown 記号を落として比較用に正規化。"""
    t = html.unescape(str(text))
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'[*_`~>#]', '', t)
    t = re.sub(r'\\', '', t)
    return re.sub(r'\s+', '', t)


def parse_frontmatter(path):
    """PyYAML でフロントマターを正確に解析する。"""
    text = read(path)
    m = re.match(r'^---\n(.*?)\n---', text, re.S)
    if not m:
        return {}
    if yaml is None:
        raise RuntimeError('PyYAML が必要です: pip3 install pyyaml')
    return yaml.safe_load(m.group(1)) or {}


def load_json(path):
    return json.loads(read(path))


def check(label, value, page_html, mode=TEXT):
    global CHECKED
    if value is None or str(value).strip() == '':
        EMPTY.append(label)
        return
    if mode == DEAD:
        INEFFECTIVE.append((label, str(value)[:70]))
        return
    if mode == SKIP:
        return
    CHECKED += 1
    raw = html.unescape(page_html)
    if mode == ATTR:
        candidates = {str(value), urllib.parse.quote(str(value), safe='/:@?=&%#')}
        ok = any(c in page_html for c in candidates)
    else:
        needle = norm(value)[:40]
        # 通常の本文に加え、属性値（data-slides-json / meta content 等）も対象にする
        ok = (bool(needle) and needle in norm(page_html)) or str(value) in raw
    if not ok:
        UNREFLECTED.append((label, str(value)[:70]))


# ---------------------------------------------------------------------------
# フィールド抽出: (ラベル, 値, モード) を列挙
# ---------------------------------------------------------------------------
def fields_blog(fm):
    out = [
        ('slug', fm.get('slug'), SKIP),
        ('title', fm.get('title'), TEXT),
        ('order', fm.get('order'), SKIP),
        ('description', fm.get('description'), TEXT),
        ('pubDate', fm.get('pubDate'), SKIP),      # 年のみ描画のため別途検証
        ('updatedDate', fm.get('updatedDate'), SKIP),
        ('heroImage', fm.get('heroImage'), ATTR),
        ('heroTitle', fm.get('heroTitle'), TEXT),
        ('heroSubtitle', fm.get('heroSubtitle'), TEXT),
        ('japaneseText', fm.get('japaneseText'), TEXT),
    ]
    for i, sec in enumerate(fm.get('contentSections') or []):
        if not isinstance(sec, dict):
            continue
        tpl = sec.get('_template')
        if tpl == 'textBlock':
            out.append((f'contentSections[{i}].bodyText', sec.get('bodyText'), TEXT))
        elif tpl == 'imageGrid':
            for j, img in enumerate(sec.get('images') or []):
                out.append((f'contentSections[{i}].images[{j}].src', (img or {}).get('src'), ATTR))
                out.append((f'contentSections[{i}].images[{j}].label', (img or {}).get('label'), TEXT))
                out.append((f'contentSections[{i}].images[{j}].caption', (img or {}).get('caption'), TEXT))
        elif tpl == 'karutaGrid':
            # 記事内カルタは [...slug].astro が KarutaGrid へ title/cards を渡して描画する。
            out.append((f'contentSections[{i}].karutaTitle', sec.get('karutaTitle'), TEXT))
            for j, c in enumerate(sec.get('karutaCards') or []):
                for k in ('number', 'kanjiNum', 'tag', 'romaji', 'titleJp', 'titleEn',
                          'folioId', 'category', 'icon', 'bodyJp', 'bodyEn'):
                    out.append((f'contentSections[{i}].karutaCards[{j}].{k}', (c or {}).get(k), TEXT))
                out.append((f'contentSections[{i}].karutaCards[{j}].image', (c or {}).get('image'), ATTR))
                out.append((f'contentSections[{i}].karutaCards[{j}].alt', (c or {}).get('alt'), ATTR))
    return out


def fields_home(d):
    out = []
    hero = d.get('hero') or {}
    for i, im in enumerate(hero.get('fusumaImages') or []):
        out.append((f'hero.fusumaImages[{i}].image', (im or {}).get('image'), ATTR))
    for i, t in enumerate(hero.get('fusumaTexts') or []):
        out.append((f'hero.fusumaTexts[{i}].title', (t or {}).get('title'), TEXT))
        out.append((f'hero.fusumaTexts[{i}].subtitle', (t or {}).get('subtitle'), TEXT))
    out += [('introTitle', d.get('introTitle'), TEXT),
            ('introText', d.get('introText'), TEXT)]
    nl = d.get('newsletter') or {}
    for k in ('eyebrow', 'heading', 'body', 'note', 'successTitle', 'successBody',
              'buttonLabel', 'placeholder'):
        out.append((f'newsletter.{k}', nl.get(k), TEXT))
    for i, it in enumerate(d.get('featuredItems') or []):
        out.append((f'featuredItems[{i}].item', (it or {}).get('item'), SKIP))
    for i, it in enumerate(d.get('bundleItems') or []):
        out.append((f'bundleItems[{i}].item', (it or {}).get('item'), SKIP))
    return out


def fields_about(d):
    return [(k, d.get(k), TEXT) for k in (
        'mainTitle', 'subTitle', 'aboutAuthorTitle', 'aboutAuthorText',
        'aboutBlogTitle', 'aboutBlogText', 'contactTitle')]


def fields_site(d):
    # siteTitle / footerText は Header・Footer・BlogPost・BaseLayout が使用。
    # lpLogo / lpUrl は Header が使用。
    return [('siteTitle', d.get('siteTitle'), TEXT),
            ('lpLogo', d.get('lpLogo'), ATTR),
            ('lpUrl', d.get('lpUrl'), ATTR),
            ('footerText', d.get('footerText'), TEXT)]


def fields_folio(d):
    out = []
    for vi, v in enumerate(d.get('volumes') or []):
        out.append((f'volumes[{vi}].title', (v or {}).get('title'), TEXT))
        out.append((f'volumes[{vi}].badge', (v or {}).get('badge'), TEXT))
        for ci, c in enumerate((v or {}).get('chapters') or []):
            out.append((f'volumes[{vi}].chapters[{ci}].title', (c or {}).get('title'), TEXT))
            out.append((f'volumes[{vi}].chapters[{ci}].description', (c or {}).get('description'), TEXT))
            out.append((f'volumes[{vi}].chapters[{ci}].article', (c or {}).get('article'), SKIP))
    return out


def fields_karuta(d):
    out = [('perPage', d.get('perPage'), SKIP),
           ('max', d.get('max'), SKIP)]
    for i, c in enumerate(d.get('cards') or []):
        for k in ('number', 'kanjiNum', 'tag', 'romaji', 'titleJp', 'titleEn',
                  'folioId', 'category', 'icon', 'bodyJp', 'bodyEn'):
            out.append((f'cards[{i}].{k}', (c or {}).get(k), TEXT))
        out.append((f'cards[{i}].image', (c or {}).get('image'), ATTR))
        out.append((f'cards[{i}].alt', (c or {}).get('alt'), ATTR))
    return out


def fields_siteconfig(d):
    out = []
    seo = d.get('seo') or {}
    for k in ('title', 'description'):
        out.append((f'seo.{k}', seo.get(k), TEXT))
    out.append(('seo.ogImage', seo.get('ogImage'), ATTR))
    arc = d.get('archive') or {}
    for k in ('title', 'description'):
        out.append((f'archive.{k}', arc.get(k), TEXT))
    # navLinks / socialLinks は Header/Footer/BlogPost が config.json を読んで描画する。
    # ただし `/latest` は「最新記事の実URL」へ解決されるため、生の値は HTML に出ない。
    for i, l in enumerate(d.get('navLinks') or []):
        href = (l or {}).get('href')
        out.append((f'navLinks[{i}].label', (l or {}).get('label'), TEXT))
        out.append((f'navLinks[{i}].href', href, SKIP if href == '/latest' else ATTR))
    for i, l in enumerate(d.get('socialLinks') or []):
        out.append((f'socialLinks[{i}].label', (l or {}).get('label'), TEXT))
        out.append((f'socialLinks[{i}].url', (l or {}).get('url'), ATTR))
    return out


# ---------------------------------------------------------------------------
# 検証本体
# ---------------------------------------------------------------------------
def verify_blog():
    for name in sorted(os.listdir(BLOG_DIR)):
        if not name.endswith('.mdx'):
            continue
        fm = parse_frontmatter(os.path.join(BLOG_DIR, name))
        url_slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', name[:-4])
        out = os.path.join(DIST, 'blog', url_slug, 'index.html')
        if not os.path.exists(out):
            UNREFLECTED.append((f'blog/{url_slug}', '出力 HTML が存在しない'))
            continue
        page = read(out)
        tag = f'blog/{url_slug}'
        for key, val, mode in fields_blog(fm):
            check(f'{tag}.{key}', val, page, mode)
        # pubDate は年のみ描画される
        pub = fm.get('pubDate')
        if pub:
            check(f'{tag}.pubDate(年)', str(pub)[:4], page, ATTR)


def verify_singleton(label, path, out_rel, extractor):
    if not os.path.exists(path):
        return
    data = load_json(path)
    out = os.path.join(DIST, out_rel)
    if not os.path.exists(out):
        UNREFLECTED.append((label, f'出力 HTML が存在しない ({out_rel})'))
        return
    page = read(out)
    for key, val, mode in extractor(data):
        check(f'{label}.{key}', val, page, mode)


def main():
    verify_blog()

    verify_singleton('home', os.path.join(SRC, 'content', 'portal', 'home.json'),
                     'index.html', fields_home)
    verify_singleton('about', os.path.join(SRC, 'content', 'global', 'about.json'),
                     'about/index.html', fields_about)
    verify_singleton('site', os.path.join(SRC, 'content', 'global', 'config.json'),
                     'index.html', fields_site)
    verify_singleton('folio', os.path.join(SRC, 'content', 'folio', 'folio.json'),
                     'index.html', fields_folio)
    verify_singleton('karuta', os.path.join(SRC, 'content', 'karuta', 'karuta.json'),
                     'blog/shinto-as-japanese-cultural-os-pt1/index.html', fields_karuta)
    # siteConfig: seo/archive は /blog 一覧、nav/social/ogImage は全ページ共通
    verify_singleton('siteConfig', os.path.join(SRC, 'content', 'config', 'config.json'),
                     'blog/index.html', fields_siteconfig)

    print('=' * 72)
    print(f'検証した入力値: {CHECKED} 件 / 未入力: {len(EMPTY)} 件')
    print('=' * 72)
    if UNREFLECTED:
        print(f'\n[A] 未反映（データはあるが HTML に出ていない）: {len(UNREFLECTED)} 件')
        for label, val in UNREFLECTED:
            print(f'  - {label}: {val!r}')
    else:
        print('\n[A] 未反映: なし（全入力値が HTML に反映）')
    if INEFFECTIVE:
        print(f'\n[B] 無効（src/ から参照されず、編集しても表示が変わらない）: {len(INEFFECTIVE)} 件')
        for label, val in INEFFECTIVE:
            print(f'  - {label}: {val!r}')
    if EMPTY:
        print(f'\n[C] 未入力（参考）: {len(EMPTY)} 件')
        for e in EMPTY:
            print('  -', e)
    print('=' * 72)
    return 1 if (UNREFLECTED or INEFFECTIVE) else 0


if __name__ == '__main__':
    sys.exit(main())
