#!/usr/bin/env python3
"""
blog MDX の「自由な MDX 本文」を、Keystatic が表单として編集できる
構造化ブロック (contentSections) へ移行する。

    なぜ必要か
    ----------
    本文が自由な MDX テキストだと、Keystatic のエディタは
    「文書」を編集するだけの文書エディタになり、Tina の
    画面上で各ブロックを直接編集する体験にならない。
    また MDX 内に未知の JSX コンポーネント ( <ImageGrid /> ) が
    1 つでもあれば解析に失敗し、記事全体が編集画面に出なくなる:

        Field validation failed: content:
        Missing component definition for ImageGrid

    本文を構造化 (Tina の contentSections と同じ形) にすることで、
    各ブロックが schema フィールドになり表单編集が可能になる。

    変換後のブロック種別 ( _template )
      - textBlock  : bodyText に Markdown を保持
      - imageGrid  : images に { src, label, caption }

    画像の連続は 1 つの imageGrid ブロックにまとめる。
    1 枚だけの imageGrid も imageGrid ブロックのまま残す
    (表示はレンダリング側で切り替える)。

使い方:
    python3 scripts/mdx-body-to-blocks.py          # dry-run
    python3 scripts/mdx-body-to-blocks.py --apply  # .bak を作成して適用
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, 'src', 'content', 'blog')

IMAGEGRID_RE = re.compile(r'<ImageGrid\s+images=\{(\[.*?\])\}\s*/>', re.S)


def yaml_single(value):
    """1 行の YAML 値。常にダブルクォートで囲み、" と \ をエスケープ。"""
    v = str(value).replace('\\', '\\\\').replace('"', '\\"')
    v = v.replace('\n', '\\n')
    return '"' + v + '"'


def parse_imagegrid(raw):
    """<ImageGrid images={[...]} /> の JSON を images リストに変換。"""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f'ImageGrid の JSON を解釈できません: {exc}')
    return [
        {'src': i.get('src', ''), 'label': i.get('label', ''), 'caption': i.get('caption', '')}
        for i in data if i and i.get('src')
    ]


def split_body(body):
    """本文を ('text', str) / ('images', [ {...} ]) の列に分割。"""
    parts = []
    pos = 0
    for m in IMAGEGRID_RE.finditer(body):
        text = body[pos:m.start()].strip()
        if text:
            parts.append(('text', text))
        images = parse_imagegrid(m.group(1))
        if images:
            parts.append(('images', images))
        pos = m.end()
    tail = body[pos:].strip()
    if tail:
        parts.append(('text', tail))
    return parts


def render_frontmatter(fm_lines, sections):
    lines = ['---']
    lines.extend(fm_lines)
    lines.append('contentSections:')
    for kind, payload in sections:
        if kind == 'text':
            lines.append('  - _template: textBlock')
            if '\n' in payload:
                lines.append('    bodyText: |-')
                for ln in payload.split('\n'):
                    lines.append(('      ' + ln) if ln.strip() else '')
            else:
                lines.append('    bodyText: ' + yaml_single(payload))
        else:
            lines.append('  - _template: imageGrid')
            lines.append('    images:')
            for img in payload:
                lines.append('      - src: ' + yaml_single(img['src']))
                if img['label']:
                    lines.append('        label: ' + yaml_single(img['label']))
                if img['caption']:
                    lines.append('        caption: ' + yaml_single(img['caption']))
    lines.append('---')
    return '\n'.join(lines)


def main():
    apply = '--apply' in sys.argv
    for name in sorted(os.listdir(BLOG)):
        if not name.endswith('.mdx'):
            continue
        path = os.path.join(BLOG, name)
        with open(path, encoding='utf-8') as f:
            text = f.read()

        m = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.S)
        if not m:
            print(f'  ! {name}: フロントマターを解析できません')
            continue
        fm_lines = m.group(1).split('\n')
        body = m.group(2)

        if any(line.startswith('contentSections:') for line in fm_lines):
            print(f'  = {name}: 移行済み')
            continue

        sections = split_body(body) if body.strip() else []

        counts = {}
        for kind, _ in sections:
            counts[kind] = counts.get(kind, 0) + 1
        print(f'  {"移行" if apply else "would migrate"} {name}: '
              f'textBlock={counts.get("text", 0)} imageGrid={counts.get("images", 0)}')

        if apply:
            with open(path + '.bak', 'w', encoding='utf-8') as f:
                f.write(text)
            new_text = render_frontmatter(fm_lines, sections) + '\n'
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_text)

    if not apply:
        print('\ndry-run です。--apply を付けると .bak を作成して書き換えます。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
