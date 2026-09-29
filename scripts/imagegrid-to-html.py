#!/usr/bin/env python3
"""
MDX 本文中の <ImageGrid images={[...]} /> を、同等な小文字 HTML に展開する。

    理由
    ----
    Keystatic の MDX エディタは MDX を解析して ProseMirror に変換するが、
    大文字始まりの JSX コンポーネント( <ImageGrid /> )はコンポーネント定義が
    無いと解析に失敗する:

        Field validation failed: content:
        Missing component definition for ImageGrid

    その結果、ImageGrid を含む記事は Keystatic の編集ページが
    一切ロードできず、編集が反映されなくなる。

    一方、小文字の HTML 要素はコンポーネント定義不要で解析を通る。
    よって Tailwind クラスを使った通常の HTML に展開すれば、
    Keystatic で編集でき、かつレイアウトも保てる。

    ImageGrid.astro と同じクラス・マークアップ構造を出力する。

使い方:
    python3 scripts/imagegrid-to-html.py          # dry-run（変更しない）
    python3 scripts/imagegrid-to-html.py --apply  # 適用（.bak を作成）
"""
import html
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, 'src', 'content', 'blog')

PATTERN = re.compile(r'<ImageGrid\s+images=\{(\[.*?\])\}\s*/>', re.S)

# ImageGrid.astro と同じクラス
SINGLE_WRAPPER = '<div class="flex justify-center w-full">'
SINGLE_BOX = '  <div class="flex flex-col gap-2 w-full md:w-3/4">'
GRID_WRAPPER = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">'
ITEM_BOX = '  <div class="flex flex-col gap-2">'


def attr(value):
    """HTML 属性値。必ず引用符で囲むこと。"""
    return '"' + html.escape(str(value or ''), quote=True) + '"'


def caption_block(image, indent, center=False):
    """label / caption の表示ブロック。label・caption が無ければ出力しない。"""
    label = image.get('label')
    caption = image.get('caption')
    if not label and not caption:
        return []
    align = ' text-center' if center else ''
    lines = [f'{indent}<div class="text-sm text-gray-500{align}">']
    if label:
        lines.append(f'{indent}  <span class="font-bold block">{html.escape(label)}</span>')
    if caption:
        lines.append(f'{indent}  <span>{html.escape(caption)}</span>')
    lines.append(f'{indent}</div>')
    return lines


def render_single(image):
    """画像1枚: 横長(3:2) 中央寄せ。ImageGrid.astro と同じ。"""
    label = image.get('label') or 'Content Image'
    lines = [SINGLE_WRAPPER, SINGLE_BOX]
    lines.append(
        f'    <img alt={attr(label)} '
        'class="w-full aspect-[3/2] object-cover rounded-lg shadow-sm" '
        f'src={attr(image.get("src"))} loading="lazy" />'
    )
    lines.extend(caption_block(image, '    ', center=True))
    lines.append('  </div>')
    lines.append('</div>')
    return lines


def render_grid(images):
    """複数枚: 2列グリッド。ImageGrid.astro と同じ。"""
    lines = [GRID_WRAPPER]
    for image in images:
        label = image.get('label') or 'Content Image'
        lines.append(ITEM_BOX)
        lines.append(
            f'    <img alt={attr(label)} '
            'class="w-full aspect-square object-cover rounded-lg" '
            f'src={attr(image.get("src"))} loading="lazy" />'
        )
        lines.extend(caption_block(image, '    '))
        lines.append('  </div>')
    lines.append('</div>')
    return lines


def convert(match):
    images = json.loads(match.group(1))
    images = [i for i in images if i and i.get('src')]
    if not images:
        return ''
    if len(images) == 1:
        return '\n'.join(render_single(images[0]))
    return '\n'.join(render_grid(images))


def main():
    apply = '--apply' in sys.argv
    total = 0
    for name in sorted(os.listdir(BLOG)):
        if not name.endswith('.mdx'):
            continue
        path = os.path.join(BLOG, name)
        with open(path, encoding='utf-8') as f:
            source = f.read()

        if '<ImageGrid' not in source:
            continue

        count = len(PATTERN.findall(source))
        if not count:
            print(f'  ! {name}: <ImageGrid だがパターン不一致（要確認）')
            continue

        converted = PATTERN.sub(convert, source)
        total += count
        print(f'  {"置換" if apply else "would replace"} {count} 個: {name}')

        if apply:
            shutil.copy2(path, path + '.bak')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(converted)

    print(f'\n合計 {total} 個の <ImageGrid> を処理')
    if not apply:
        print('dry-run です。--apply を付けると .bak を作成して書き換えます。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
