#!/usr/bin/env python3
"""
逆方向の監査: ビルド済み HTML に表示されているテキスト/画像のうち、
Keystatic で編集できないもの（＝テンプレートにハードコードされているもの）を洗い出す。

    dist/*.html の表示テキスト
      → Keystatic の全入力値（src/content/** の JSON + MDX フロントマター）
        → 一致しなければ「ハードコード（編集不可）」候補

使い方:
    npm run build
    python3 scripts/verify-keystatic-reverse.py
"""
import html
import json
import os
import re
import sys
import datetime

try:
    import yaml
except ImportError:
    yaml = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
SRC = os.path.join(ROOT, 'src')
CONTENT = os.path.join(SRC, 'content')

# テンプレート由来の装飾・アイコン名・記号は除外する
IGNORE_EXACT = {
    'arrow_forward', 'arrow_back', 'menu', 'close', 'expand_more', 'bookmark_border',
    'bookmark', 'share', 'style', 'check_circle', 'verified', 'open_in_new',
    'unfold_more',
    '間', '•', '—', '–', '-', '/', '=', '|', '·', '&', '&amp;', '©',
    # 意図的にハードコードのまま残す項目（ユーザー判断）
    'By Shun Yamamoto',
}
# 記号・数字・空白のみの断片は除外
IGNORE_RE = re.compile(r'^[\s\W\d_]+$', re.U)

# 自動計算される値（Keystatic の入力ではなく、記事順・件数から算出されるもの）
IGNORE_TEXT_RE = re.compile(r'^(NO\.\d+|\d+)$', re.U)

# 自動生成ページ（リダイレクト案内・管理画面の案内）は対象外
IGNORE_PAGE_RE = re.compile(r'^admin/', re.U)

# 文字（英字・かな・漢字など）が含まれるかどうか
HAS_LETTER_RE = re.compile(r'[^\W\d_]', re.U)

# 部分一致とみなす最小長
MIN_PARTIAL_LEN = 4
# 既知値が断片の一部である場合に許容する被覆率
MIN_COVERAGE = 0.5


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def norm(text):
    t = html.unescape(str(text))
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'!?\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = re.sub(r'[*_`~>#]', '', t)
    t = re.sub(r'\\', '', t)
    return re.sub(r'\s+', '', t)


# ---------------------------------------------------------------------------
# 1. Keystatic が編集できる値（＝データ由来の文字列）を全部集める
# ---------------------------------------------------------------------------
def collect_strings(obj, out):
    if isinstance(obj, str):
        out.add(obj)
    elif isinstance(obj, (datetime.date, datetime.datetime)):
        # YAML は日付を date/datetime として解釈するため ISO 形式で拾う
        out.add(obj.strftime('%Y-%m-%d'))
    elif isinstance(obj, dict):
        for v in obj.values():
            collect_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_strings(v, out)


def keystatic_values():
    values = set()
    for dirpath, _dirs, files in os.walk(CONTENT):
        for name in files:
            path = os.path.join(dirpath, name)
            if name.endswith('.json'):
                try:
                    collect_strings(json.loads(read(path)), values)
                except Exception:
                    pass
            elif name.endswith(('.mdx', '.md')):
                m = re.match(r'^---\n(.*?)\n---', read(path), re.S)
                if m and yaml is not None:
                    try:
                        collect_strings(yaml.safe_load(m.group(1)) or {}, values)
                    except Exception:
                        pass
    return values


# ---------------------------------------------------------------------------
# 1b. 日付は Keystatic の pubDate / updatedDate から自動整形されるため、
#     テンプレートが生成しうる表示形を既知値として追加する。
# ---------------------------------------------------------------------------
MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def date_variants(values):
    out = set()
    for v in values:
        s = str(v).strip()
        if not DATE_RE.match(s):
            continue
        y, mo, d = (int(x) for x in s.split('-'))
        mon = MONTH_NAMES[mo - 1]
        for base in (
            f'{mon} {d:02d}, {y}',        # December 08, 2025
            f'{mon[:3]} {d:02d}, {y}',    # Dec 08, 2025
            f'{mon} {y}',                 # December 2025
            f'{mon[:3]} {y}',             # Dec 2025
            str(y),                       # 2025
        ):
            for variant in (base, base.upper()):
                out.add(norm(variant))
                out.add(norm(f'— {variant}'))    # — DEC 08, 2025
    return out


# ---------------------------------------------------------------------------
# 2. HTML から表示テキストを抽出
# ---------------------------------------------------------------------------
def visible_texts(page_html):
    body = re.sub(r'<script\b.*?</script>', ' ', page_html, flags=re.S | re.I)
    body = re.sub(r'<style\b.*?</style>', ' ', body, flags=re.S | re.I)
    body = re.sub(r'<!--.*?-->', ' ', body, flags=re.S)
    # タグを除去してテキストノードだけ残す
    text = re.sub(r'<[^>]+>', '\n', body)
    text = html.unescape(text)
    for line in text.split('\n'):
        line = line.strip()
        if line:
            yield line


# ---------------------------------------------------------------------------
# 2b. HTML から表示画像を抽出（img src / background-image）
# ---------------------------------------------------------------------------
IMG_SRC_RE = re.compile(r'<img\b[^>]*\bsrc="([^"]+)"', re.I)
BG_IMG_RE = re.compile(r'background-image:\s*url\(["\']?([^"\')]+)', re.I)
# ビルド生成物・スクリプト・アイコンは対象外
IMG_IGNORE_RE = re.compile(r'^/_astro/|^/scripts/|^data:|\.svg$', re.I)


def visible_images(page_html):
    for m in IMG_SRC_RE.finditer(page_html):
        yield m.group(1)
    for m in BG_IMG_RE.finditer(page_html):
        yield m.group(1)


def main():
    if yaml is None:
        print('PyYAML が必要です: pip3 install pyyaml', file=sys.stderr)
        return 2

    known = keystatic_values()
    known_norm = {norm(v) for v in known if v and str(v).strip()}
    known_norm = {k for k in known_norm if k}
    # 日付フィールドから自動整形される表示形も既知値に含める
    known_norm |= date_variants(known)
    known_raw = {str(v).strip() for v in known if v and str(v).strip()}

    findings = {}  # page -> set of hardcoded strings
    img_findings = {}  # page -> set of hardcoded image paths

    for dirpath, _dirs, files in os.walk(DIST):
        for name in files:
            if not name.endswith('.html'):
                continue
            path = os.path.join(dirpath, name)
            rel = os.path.relpath(path, DIST)
            if IGNORE_PAGE_RE.match(rel.replace(os.sep, '/')):
                continue
            page = read(path)
            # 旧URL → /blog/... の自動リダイレクト案内ページは対象外
            if 'Redirecting from' in page:
                continue
            for src in visible_images(page):
                s = src.strip()
                if not s or IMG_IGNORE_RE.match(s):
                    continue
                if s in known_raw:
                    continue
                # データ由来の値の一部（例: ファイル名のみ）でも一致すれば OK
                if any(s in k or k in s for k in known_raw if len(k) >= 4):
                    continue
                img_findings.setdefault(rel, set()).add(s)
            for raw in visible_texts(page):
                n = norm(raw)
                if not n or len(n) < 2:
                    continue
                if raw in IGNORE_EXACT or n in IGNORE_EXACT:
                    continue
                if IGNORE_RE.match(raw):
                    continue
                if IGNORE_TEXT_RE.match(n):
                    continue
                # データ由来の値と完全一致すれば OK
                if n in known_norm:
                    continue
                # 断片が既知値の一部（例: 長い Keystatic 文の一部）なら OK
                if any(len(k) >= MIN_PARTIAL_LEN and n in k for k in known_norm):
                    continue
                # 既知値が断片の一部である場合は、断片の大部分を占めるときだけ OK。
                # （例: タイトル "X - Wabi-Sabi Blog" は既知値 "X" だけでは説明できない）
                if any(
                    len(k) >= MIN_PARTIAL_LEN
                    and k in n
                    and len(k) / len(n) >= MIN_COVERAGE
                    for k in known_norm
                ):
                    continue
                findings.setdefault(rel, set()).add(raw)

    print('=' * 72)
    print('逆方向監査: HTML に表示されているが Keystatic で編集できないテキスト/画像')
    print('=' * 72)

    if img_findings:
        itotal = sum(len(v) for v in img_findings.values())
        print(f'\n[画像] 候補: {itotal} 件（{len(img_findings)} ページ）\n')
        for rel in sorted(img_findings):
            print(f'--- {rel} ---')
            for s in sorted(img_findings[rel]):
                print(f'  · {s}')
            print()

    if not findings:
        print('\n[テキスト] ハードコードされたテキストは見つかりませんでした。')
    else:
        total = sum(len(v) for v in findings.values())
        print(f'\n[テキスト] 候補: {total} 件（{len(findings)} ページ）\n')
        for rel in sorted(findings):
            print(f'--- {rel} ---')
            for s in sorted(findings[rel]):
                print(f'  · {s}')
            print()

    return 1 if (findings or img_findings) else 0


if __name__ == '__main__':
    sys.exit(main())
