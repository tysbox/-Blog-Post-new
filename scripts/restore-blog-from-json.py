#!/usr/bin/env python3
"""
Tina の元 JSON (backup/tina-json-original/) から、Keystatic が編集できる
構造化 blog MDX を再生成する（復元用）。

    なぜ必要か
    ----------
    Keystatic は fields.image / fields.mdx をネストした状態で保存すると
    その値を黙って落とす（データ損失）。被害を受けた記事は元 JSON から
    復元するしか方法がない。

    生成物:
      src/content/blog/<stem>.mdx
        フロントマターに以下を持つ（本文は空）
          title / description / pubDate / updatedDate
          heroImage / heroTitle / heroSubtitle / japaneseText
          contentSections
            - _template: textBlock  → bodyText（Markdown）
            - _template: imageGrid  → images[{src,label,caption}]

    注意: 既存ファイルを上書きするので、必要なら先に退避すること。

使い方:
    python3 scripts/restore-blog-from-json.py                  # dry-run
    python3 scripts/restore-blog-from-json.py --apply
    python3 scripts/restore-blog-from-json.py --only pt1 --apply
"""
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'backup', 'tina-json-original')
DST = os.path.join(ROOT, 'src', 'content', 'blog')
BAK = os.path.join(ROOT, 'backup', 'restore-from-json')


def stem(name):
    """元のファイル名をそのまま小文字化する（ダッシュは保持する）。"""
    return name.lower()


def q(value):
    """1 行の YAML 値。常にダブルクォートで囲む。"""
    v = str(value).replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    return '"' + v + '"'


def block(key, value, indent):
    """ブロックスカラー(|-)で書き出す。"""
    pad = ' ' * indent
    out = [f'{pad}{key}: |-']
    for line in str(value).split('\n'):
        out.append(f'{pad}  {line}' if line.strip() else '')
    return out


def build(name, data):
    hero = data.get('hero') or {}
    lines = ['---']
    lines.append('title: ' + q(data.get('title', '')))
    lines.append('description: ' + q(hero.get('subtitle', '') or data.get('title', '')))

    # 空文字は書かない（z.coerce.date() が空文字で Invalid date になる）
    pub = data.get('pubDate')
    if pub:
        lines.append('pubDate: ' + q(pub))
    upd = data.get('updatedDate')
    if upd:
        lines.append('updatedDate: ' + q(upd))

    img = hero.get('image1') or ''
    lines.append('heroImage: ' + q(img))
    lines.append('heroTitle: ' + q(hero.get('title', '')))
    lines += block('heroSubtitle', hero.get('subtitle', ''), 0)
    lines += block('japaneseText', data.get('japaneseText', ''), 0)

    lines.append('contentSections:')
    for sec in data.get('contentSections') or []:
        tpl = sec.get('_template')
        if tpl == 'textBlock':
            body = sec.get('bodyText') or ''
            if not str(body).strip():
                continue
            lines.append('  - _template: textBlock')
            if '\n' in str(body):
                # block() はキーにインデントを付けないこと（呼ぶ側で指定する）
                lines += block('bodyText', body, 4)
            else:
                lines.append('    bodyText: ' + q(body))
        elif tpl == 'imageGrid':
            images = [i for i in (sec.get('images') or []) if i and i.get('src')]
            if not images:
                continue
            lines.append('  - _template: imageGrid')
            lines.append('    images:')
            for im in images:
                lines.append('      - src: ' + q(im['src']))
                if im.get('label'):
                    lines.append('        label: ' + q(im['label']))
                if im.get('caption'):
                    lines.append('        caption: ' + q(im['caption']))
    lines.append('---')
    return '\n'.join(lines) + '\n'


def validate_yaml(text):
    """js-yaml で実際にパースし(contentSections を取り出せまで確認し、
    不正な YAML を書き込まないことを保証する。"""
    import subprocess
    import tempfile

    js = (
        "const fs=require('fs'),yaml=require('js-yaml');"
        "const s=fs.readFileSync(process.argv[1],'utf8');"
        "const m=s.match(/^---\\n([\\s\\S]*?)\\n---\\n/);"
        "if(!m){console.error('frontmatter not found');process.exit(1)}"
        "const d=yaml.load(m[1]);"
        "if(!d||!Array.isArray(d.contentSections)||!d.contentSections.length){"
        "console.error('contentSections empty');process.exit(1)}"
        "const miss=d.contentSections.filter(s=>s._template==='textBlock'&&!s.bodyText)"
        ".length;"
        "const nosrc=d.contentSections.filter(s=>s._template==='imageGrid')"
        ".flatMap(s=>s.images||[]).filter(i=>!i.src).length;"
        "if(miss||nosrc){console.error('missing values: text='+miss+' src='+nosrc);process.exit(1)}"
        "console.log('ok sections='+d.contentSections.length);"
    )
    # 内容は一時ファイルで渡す（コマンドライン引数だと `---` をオプションと誤読される）
    with tempfile.NamedTemporaryFile('w', suffix='.mdx', delete=False,
                                     encoding='utf-8') as fh:
        fh.write(text)
        tmp = fh.name
    try:
        r = subprocess.run(['node', '-e', js, tmp],
                           capture_output=True, text=True, cwd=ROOT)
        return r.returncode == 0, (r.stdout + r.stderr).strip()
    finally:
        os.unlink(tmp)


def main():
    apply = '--apply' in sys.argv
    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]

    os.makedirs(BAK, exist_ok=True)
    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.json'):
            continue
        target = stem(name[:-5])
        if only and only not in target:
            continue
        data = json.loads(open(os.path.join(SRC, name), encoding='utf-8').read())
        out_path = os.path.join(DST, target + '.mdx')
        content = build(target, data)

        # 書き込む前に、生成物が実際にパースでき値が入っているか検証する
        ok, msg = validate_yaml(content)
        if not ok:
            print(f'  SKIP {target}: 生成物が不正 ({msg})')
            continue

        n_src = content.count('      - src:') + len(
            re.findall(r'^heroImage: "(.+)"$', content, re.M))
        n_bt = content.count('bodyText:')
        print(f'  {"復元" if apply else "would restore"} {target}: '
              f'heroImage+src={n_src} bodyText={n_bt}  [YAML検証 OK]')

        if apply:
            if os.path.exists(out_path):
                shutil.copy2(out_path, os.path.join(BAK, os.path.basename(out_path)))
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(content)

    if not apply:
        print('\ndry-run。--apply を付けると上書きします（現ファイルは backup/restore-from-json/ に退避）。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
