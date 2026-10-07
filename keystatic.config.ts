import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Keystatic 設定
 *
 * Tina CMS から移行した全コンテンツ（ブログ記事・フロントページ・
 * About・サイト共通設定）を管理するための定義。
 *
 * ストレージ:
 *   - ブログ記事   : src/content/blog/*.mdx   (フラットな単一ファイル形式)
 *   - 各種設定     : src/content/**\/*.json      (singleton 1ファイル = 1設定)
 *
 * 注意: 旧 `page` コレクション (src/content/pages/*.json) は削除済み。
 *   同じ記事が blog と二重に存在し /{slug} と /blog/{slug} の2URLで
 *   公開されていたため。記事は blog だけで管理する。
 *
 * プレビュー:
 *   各 collection / singleton に `previewUrl` を指定しているため、
 *   Keystatic 管理画面の各編集画面に「Preview」ボタンが自動で表示されます。
 *   - collection : `{slug}` がエントリのスラグに置換される
 *   - singleton  : `{branch}` のみ置換される(固定URL)
 *
 * フロントマター/JSON構造は `src/content.config.ts` のZodスキーマと一致させている。
 * 特にブロックの識別子は Keystatic 標準の `_type` ではなく、既存JSONに合わせて
 * `_template` を使用・保存する（`fields.blocks` は `_type` を書いてしまうため未使用）。
 */

// --- 画像グリッドの1アイテム (Tina の imageGrid テンプレートの images) ---
const imageItem = fields.object({
	src: fields.text({
		label: '画像 (src)',
		description: '例: /images/IMG_0581_DxO.webp',
		validation: { isRequired: true },
	}),
	label: fields.text({ label: 'ラベル (label)' }),
	caption: fields.text({ label: 'キャプション (caption)', multiline: true }),
});

export default config({
  storage: {
    kind: 'local',
  },

  collections: {
    blog: collection({
      label: 'ブログ記事 (Blog Posts)',
      // slugField is required in Keystatic 0.6.9; it means filename == slugify(this field).
      // It was pointed at 'title', so every Save renamed the file to
      //   slugify(title) = episode-1-shinto-as-japanese-cultural-os-part-1
      // and Astro's glob loader then read it under a new id, so the URL being
      // edited no longer contained the updated file (looked like 'not reflected').
      // Fix: point slugField at a dedicated 'slug' field that equals the filename.
      // The filename is never edited by hand, so editing title never renames.
      slugField: 'slug',
      path: 'src/content/blog/*',
      // {slug} はそのままファイル名（拡張子なし）になる。
      // getStaticPaths の params.slug = post.id と同じなので常に一致する。
      previewUrl: '/blog/{slug}',
      format: {
        // 重要: contentField は「.mdx 拡張子のファイルを探させる」ために必須。
        //   getDataFileExtension() は contentField があればその contentExtension
        //   (fields.mdx なので .mdx)、無ければ '.' + data (つまり .yaml) を使う。
        //   contentField を外すと .yaml を探してエントリが 1 件も見つからなくなる。
        // 編集の実体は contentSections(フロントマター内)で、本文 MDX は空のまま。
        contentField: 'content',
        data: 'yaml',
      },
      schema: {
        // --- フロントマター（JSON → MDX 変換で生成した項目と完全一致） ---
        // タイトルは Markdown が使えます（**太字** / *斜体*）。描画側で解釈されます。
        // Backing field for slugField. Value must equal the filename (no extension).
        // 命名規約: 公開日（YYYY-MM-DD）を先頭に付ける（Keystatic の一覧が slug 昇順＝
        // 日付順で並ぶため／上流 Issue #1579 参照）。URL にはこの接頭辞を出さない。
        // 新規記事を作る時は slug に `2026-06-01-new-post` のように日付を付けてください。
        slug: fields.slug({
          name: {
            label: 'スラッグ (Slug)',
            description:
              'ファイル名と一致させる必要があります。公開日（YYYY-MM-DD）を先頭に付けると Keystatic の一覧が日付順に並びます（例: 2025-12-08-from-kyoto-to-the-world）。URL には日付部分を使いません。',
          },
        }),

        // Display title, independent of the slug, freely editable.
        title: fields.text({
          label: 'タイトル (Title)',
          multiline: true,
        }),

        // 表示順 No.（通常は空）。
        //   ・空のまま = 公開日の昇順で 1,2,3… と自動採番（src/utils/postOrder.ts）
        //   ・数字を入れる = その数字で表示順を固定（他記事は自動で繰り上がる）
        order: fields.number({
          label: '表示順 No.（通常は空）',
          description:
            '通常は空のままで問題ありません（公開日の順で 1,2,3… と自動採番されます）。順序を日付から切り離したい場合だけ数字を入れます。',
        }),

        description: fields.text({
          label: '概要 (Description)',
          multiline: true,
        }),

        pubDate: fields.date({
          label: '公開日 (Date Posted)',
          description:
            '並び順と Index の NO. はこの「公開日」で決まります。15/16 の間に補足記事を差し込むときは、ここを 15 と 16 の間の日付に設定してください（ファイル名の日付も揃えると管理画面の一覧も同じ順になります）。',
          validation: { isRequired: true },
        }),

        updatedDate: fields.date({
          label: '更新日 (Last Updated)',
        }),

        heroImage: fields.text({
          label: 'ヒーロー画像 (Hero Image)',
          description: '例: /images/IMG_0581_DxO.webp',
        }),

        // タイトルは Markdown が使えるため、レンダリング側で解釈される。
        // 例: **太字** / *斜体*
        heroTitle: fields.text({
          label: 'ヒーロー見出し (Hero Title)',
          description: 'Markdown が使えます。例: **強調**',
          multiline: true,
        }),

        heroSubtitle: fields.text({
          label: 'ヒーローサブタイトル (Hero Subtitle)',
          description: 'Markdown が使えます。',
          multiline: true,
        }),

        // 日本語と英語の本文は GUI（WYSIWYG）エディタで編集する。
        // fields.mdx.inline は ProseMirror ベースのリッチテキスト UI を持つが、
        // 保存値はプレーンな Markdown 文字列なので、既存の richTextToHtml()
        // による **太字** / *斜体* の変換とそのまま両立する。
        //
        // fields.text(multiline) を使うと素のテキストエリアになり、** や * を
        // 手で入力しない限り整形されない = ボールド/イタリックが実質
        // 編集できない状態になっていた。
        japaneseText: fields.mdx.inline({
          label: '日本語バージョン全文 (Japanese Version)',
          description:
            'GUIエディタです。ツールバーの B（太字）/ I（斜体）/ 見出し / リスト / リンクが使えます。',
          options: {
            bold: true,
            italic: true,
            strikethrough: true,
            heading: [3, 4],
            blockquote: true,
            unorderedList: true,
            orderedList: true,
            link: true,
            code: true,
          },
        }),

        // MDX の拡張子（.mdx）を Keystatic に探索させるために必要な(contentField)。
        // fields.mdx() を使うと編集画面に「本文 (Body)」という
        // 意味を持たない入力欄が出てしまう（実際は 6 記事すべて空で、
        // astro 側でも一度もレンダリングされないデッドフィールドだった）。
        //
       // fields.emptyContent({ extension: 'mdx' }) は schema 上の存在だけを
        // 満たして UI には一切描画しない専用フィールド。
        // これを外すと `Field "content" specified in contentField does not exist`
        // で記事全体が編集不能になるため、必ず残す。
        content: fields.emptyContent({ extension: 'mdx' }),

        // --- 本文 ---
        // 自由な MDX ではなく、Tina の contentSections と同じ構造で持つ。
        // これにより Keystatic が各ブロックを「表单フィールド」として扱い、
        // 画面上でテキストや画像を直感的に編集できる。
        //
        // MDX 内に <ImageGrid /> のような未定義コンポーネントを混ぜると
        // Keystatic の解析が失敗し、記事全体が編集画面に出なくなるため、
        // 画像の並びは必ず imageGrid ブロックで表現する。
        contentSections: fields.array(
          fields.object({
            _template: fields.select({
              label: 'ブロック種別 (_template)',
              options: [
                { label: 'テキスト (textBlock)', value: 'textBlock' },
                { label: '画像グリッド (imageGrid)', value: 'imageGrid' },
                { label: 'カルタ3列 (karutaGrid)', value: 'karutaGrid' },
              ],
              defaultValue: 'textBlock',
            }),

            // 英語本文も GUI エディタにする（japaneseText と同じ理由）。
            // 保存値は Markdown 文字列なので richTextToHtml() と互換。
            bodyText: fields.mdx.inline({
              label: '本文 (bodyText)',
              description:
                'GUIエディタです。ツールバーの B（太字）/ I（斜体）/ 見出し / リスト / リンクが使えます。',
              options: {
                bold: true,
                italic: true,
                strikethrough: true,
                heading: [2, 3, 4],
                blockquote: true,
                unorderedList: true,
                orderedList: true,
                link: true,
                code: true,
              },
            }),

            images: fields.array(imageItem, {
              label: '画像 (images)',
              description: '_template が imageGrid の場合に使用します。',
            }),

            // --- カルタ3列 (Step3-3: 任意のみ・既存 imageGrid 互換) ---
            karutaTitle: fields.text({ label: 'カルタ見出し (karutaTitle)' }),

            karutaCards: fields.array(
              fields.object({
                number: fields.text({ label: '番号 (number)', description: '例: 01' }),
                tag: fields.text({ label: 'タグ (tag)', description: '例: BOUNDARY' }),
                romaji: fields.text({ label: 'ローマ字 (romaji)', description: '例: SHINBOKU & KEKKAI' }),
                titleJp: fields.text({ label: '日本語タイトル (titleJp)', description: '例: 神木と結界' }),
                titleEn: fields.text({ label: '英語タイトル (titleEn)' }),
                image: fields.text({
                  label: '画像',
                  description: '例: /images/IMG_0581_DxO.webp',
                }),
                alt: fields.text({ label: '代替テキスト (alt)' }),
                folioId: fields.text({ label: 'Folios ID', description: '例: FOLIO 01' }),
                bodyJp: fields.text({ label: '本文日本語 (bodyJp)', multiline: true }),
                bodyEn: fields.text({ label: '本文英語 (bodyEn)', multiline: true }),
              }),
              { label: 'カルタカード (karutaCards)' },
            ),
          }),
          {
            label: '本文セクション (contentSections)',
            itemLabel: (props) => {
              const template = props.fields._template?.value;
              return template === 'imageGrid' ? '画像グリッド' : 'テキスト';
            },
          },
        ),
      },
    }),


    // ============================================================
    // 用語集 (glossary): src/content/glossary/*.json
    //
    // 英語本文（.article-body）内の用語を自動で注釈ボタン化し、
    // タップすると reading / description を POPUP 表示する。
    // 登録内容はこの画面で編集するだけで全記事に自動反映される。
    // スキーマは `src/content.config.ts` の glossary と一致させること。
    // ============================================================
    glossary: collection({
      label: '用語集 (Glossary)',
      slugField: 'slug',
      path: 'src/content/glossary/*',
      format: 'json',
      schema: {
        slug: fields.slug({
          name: {
            label: 'スラッグ (slug)',
            description:
              'ファイル名と同じにしてください（変更するとファイル名が変わります）。ここに入力すると下の「Slug」が自動生成されます。',
          },
          slug: {
            label: 'Slug（自動生成・通常は編集不要）',
            description:
              '上の「スラッグ (slug)」から自動生成されます。空のままだと Create 時に「Slug must not be empty」で失敗するので、空なら右の再生成ボタンを押してください。',
          },
        }),
        term: fields.text({
          label: '用語 (term)',
          description:
            '本文で注釈化する語句（例: Kekkai）。記事の英語本文に実在する語を指定してください。本文に出てこない語はハイライトされません（`npm run check:glossary` で確認できます）。',
          validation: { isRequired: true },
        }),
        reading: fields.text({
          label: '読み (reading)',
          description: 'POPUP 1行目に表示（例: けっかい）。空欄なら非表示。',
        }),
        description: fields.text({
          label: '説明 (description)',
          description: 'POPUP 2行目に表示。2行程度の簡潔な説明推奨。',
          multiline: true,
        }),
        caseSensitive: fields.checkbox({
          label: '大文字・小文字を区別 (caseSensitive)',
          description: 'ON にすると "ma" と "MA" を別語として扱います。',
        }),
        excludeSpellings: fields.array(fields.text({ label: '表記' }), {
          label: '除外表記 (excludeSpellings)',
          description:
            'この語を含む表記は注釈化しません（例: term が Ma のとき ["Mausoleum"] を登録すると Ma-part だけが除外されます）。',
        }),
      },
    }),

    // ============================================================
    // `page` コレクション (src/content/pages/*.json) は削除済み。
    //
    // 同じ記事が blog コレクション (src/content/blog/*.mdx) に重複して存在し、
    // /{slug} と /blog/{slug} の2つのURLで同じ内容が公開されていた。
    // MDX 側は description / japaneseText / contentSections をすべて含む上位集合なので、
    // MDX (= /blog/{slug}) を正本とし JSON 側は廃止した。
    //
    // 既存URLは src/pages/[...slug].astro が 308 で /blog/{slug} へ送る。
    // 静的なページが再度必要になったら.blog と同じ編集経路に揃えること。
    // ============================================================
  },

  // ============================================================
  // シングルファイル設定（singleton）
  // ============================================================
  singletons: {
    /** フロントページ（ポータル）: src/content/portal/home.json */
    home: singleton({
      label: 'フロントページ (Home / Portal)',
      path: 'src/content/portal/home',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        // ヒーロー（FUSUMA）
        // 画像とテキストを分けて管理する。どちらも最大5件。
        // 1 → 5 → 1 のサイクルで自動表示され、順序は登録順です。
        hero: fields.object(
          {
            fusumaImages: fields.array(
              fields.object({
                image: fields.text({
                  label: '画像',
                  description: '例: /images/IMG_0581_DxO.webp',
                }),
              }),
              {
                label: 'FUSUMA 画像（最大5件）',
                description: '襖が開いた後に表示される背景画像。登録順に 1 → 5 → 1 と巡回します。',
              },
            ),
            fusumaTexts: fields.array(
              fields.object({
                title: fields.text({ label: 'タイトル' }),
                subtitle: fields.text({ label: 'サブタイトル', multiline: true }),
              }),
              {
                label: 'FUSUMA テキスト（最大5件）',
                description:
                  '暗転中に表示されるタイトルとサブタイトル。画像と同じ順序で 1 → 5 → 1 と巡回します。',
              },
            ),
          },
          { label: 'ヒーロー（FUSUMA）' },
        ),

        introTitle: fields.text({ label: '導入見出し', multiline: true }),
        introText: fields.text({ label: '導入本文', multiline: true }),

        // --- 6. Dispatches from Kyoto（ニュースレター）---
        // フロントページ最下部に固定表示。編集はここだけ行う。
        newsletter: fields.object(
          {
            enabled: fields.checkbox({
              label: '表示する',
              description: 'オフにするとフロントページ最下部のニュースレターを非表示にします。',
              defaultValue: true,
            }),
            eyebrow: fields.text({
              label: '上見出し (eyebrow)',
              description: '例: DISPATCHES FROM KYOTO',
              defaultValue: 'DISPATCHES FROM KYOTO',
            }),
            heading: fields.text({
              label: '見出し (heading)',
              description: '例: Receive Quiet Reflections',
              defaultValue: 'Receive Quiet Reflections',
            }),
            body: fields.text({
              label: '本文 (body)',
              multiline: true,
              description: '例: Quiet essays and photography from Kyoto, delivered only on nights of the new moon. Free subscription, unsubscribe anytime.',
            }),
            note: fields.text({
              label: '注記 (note)',
              description: '例: Strictly privacy conscious. No noise, only stillness.',
              defaultValue: 'Strictly privacy conscious. No noise, only stillness.',
            }),
            successTitle: fields.text({
              label: '送信完了メッセージ (successTitle)',
              defaultValue: 'Thank you for subscribing to MA (Vide Signifiant).',
            }),
            successBody: fields.text({
              label: '送信完了補足 (successBody)',
              defaultValue: 'Dispatches will arrive on nights of the new moon.',
            }),
            buttonLabel: fields.text({
              label: '送信ボタン (buttonLabel)',
              defaultValue: 'Subscribe',
            }),
            placeholder: fields.text({
              label: '入力欄プレースホルダ (placeholder)',
              defaultValue: 'Your email address...',
            }),
          },
          { label: 'ニュースレター (DISPATCHES FROM KYOTO)' },
        ),

        // --- 注目記事（1件のみ）---
        // ここに指定した記事が「Featured Page Card」になる。
        featuredItems: fields.array(
          fields.object({
            item: fields.text({
              label: '記事パス',
              description:
                '例: src/content/blog/from-kyoto-to-the-world.mdx （空欄なら最新の1件が自動採用されます）',
            }),
          }),
          {
            label: '注目記事 (1件)',
            description:
              '指定した記事が Featured Page Card になります。空欄または1件未満の場合は最新記事が自動で入ります。',
          },
        ),

        // --- Vol. I Bundle（2記事固定）---
        // 注目記事と重複する記事は自動的に除外されます。
        // 2件に満たない場合は、注目記事以外の新しい記事から自動的に補完します。
        bundleItems: fields.array(
          fields.object({
            item: fields.text({
              label: '記事パス',
              description:
                '例: src/content/blog/shinto-as-japanese-cultural-os-pt1.mdx （空欄のスロットは新しい記事で自動補完されます）',
            }),
          }),
          {
            label: 'Vol. I Bundle（2記事）',
            description:
              'Vol. I Bundle に並べる2本の記事。注目記事と重複する記事は自動的に除外されます。',
          },
        ),

      },
    }),

    /** About & Contact ページ: src/content/global/about.json */
    about: singleton({
      label: 'About & Contact ページ',
      path: 'src/content/global/about',
      format: { data: 'json' },
      previewUrl: '/about',
      schema: {
        mainTitle: fields.text({ label: 'メインタイトル', multiline: true }),
        subTitle: fields.text({ label: 'サブタイトル', multiline: true }),
        aboutAuthorTitle: fields.text({ label: '著者見出し', multiline: true }),
        aboutAuthorText: fields.text({ label: '著者紹介', multiline: true }),
        aboutBlogTitle: fields.text({ label: 'ブログ説明の見出し', multiline: true }),
        aboutBlogText: fields.text({ label: 'ブログ説明', multiline: true }),
        contactTitle: fields.text({ label: 'お問い合わせ見出し', multiline: true }),
      },
    }),

    /** ヘッダー / フッター: src/content/global/config.json */
    site: singleton({
      label: 'ヘッダー / フッター (共通設定)',
      path: 'src/content/global/config',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        siteTitle: fields.text({ label: 'サイトタイトル', multiline: true }),

        lpLogo: fields.text({ label: 'LPロゴ画像', description: '例: /images/IMG_0581_DxO.webp' }),
        lpUrl: fields.text({ label: 'LPリンク先URL' }),

        footerText: fields.text({ label: 'フッター文言', multiline: true }),
      },
    }),

    /**
     * Folio（Collected Volumes & Archives）: src/content/folio/folio.json
     * フロントページ下部のデッキを独立編集する。
     * ※「編集したカード＝そのまま表示」にするため、記事からの自動補完は行わない。
     *   デッキの段数（CSS の nth-child 1〜4）＝最大4枚。
     */
    folio: singleton({
      label: 'Folio（Collected Volumes & Archives）',
      path: 'src/content/folio/folio',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        volumes: fields.array(
          fields.object({
            title: fields.text({
              label: 'デッキ名',
              description: '例: Vol. I • Shinto as Cultural OS',
            }),
            badge: fields.text({ label: 'バッジ', description: '任意。例: New' }),
            chapters: fields.array(
              fields.object({
                title: fields.text({ label: 'カード名' }),
                description: fields.text({ label: 'カード説明', multiline: true }),
                article: fields.text({
                  label: '記事パス',
                  description: '例: src/content/blog/shinto-as-japanese-cultural-os-pt1.mdx',
                }),
              }),
              {
                label: 'カード（最大4枚）',
                description:
                  'デッキの段数に合わせて最大4枚。指定したカードだけがそのまま表示されます（記事からの自動補完は行いません）。',
              },
            ),
          }),
          {
            label: 'デッキ',
            description:
              '1行に2つのデッキが並びます。デッキを追加すると行が増えていき、4デッキ（2行）が標準です。',
          },
        ),
      },
    }),

    /**
     * Karuta（空間語彙のカルタ）: src/content/karuta/karuta.json
     * 全ブログ記事共通で表示されるカード。ブログ記事とは別に独立編集する。
     * 1ページ3枚で表示し、上限は100枚（KARUTA_MAX）。
     * カード表面の大文字は日本語タイトルの最初の1文字を自動表示する
     * （本物のカルタ様式。kanjiNum 欄は廃止）。
     */
    karuta: singleton({
      label: 'Karuta（空間語彙のカルタ）',
      path: 'src/content/karuta/karuta',
      format: { data: 'json' },
      previewUrl: '/blog/shinto-as-japanese-cultural-os-pt1',
      schema: {
        perPage: fields.number({
          label: '1ページの枚数',
          description: '1ページに表示する枚数（既定: 3）',
          defaultValue: 3,
        }),

        max: fields.number({
          label: '最大枚数',
          description: '上限枚数（既定: 100）',
          defaultValue: 100,
        }),

        cards: fields.array(
          fields.object({
            number: fields.text({ label: '番号 (number)', description: '例: 01' }),
            tag: fields.text({ label: 'タグ (tag)', description: '例: BOUNDARY' }),
            romaji: fields.text({ label: 'ローマ字 (romaji)', description: '例: SHINBOKU & KEKKAI' }),
            titleJp: fields.text({ label: '日本語タイトル (titleJp)', description: '例: 神木と結界' }),
            titleEn: fields.text({ label: '英語タイトル (titleEn)' }),
            image: fields.text({
              label: '画像',
              description: '例: /images/IMG_0581_DxO.webp',
            }),
            alt: fields.text({ label: '代替テキスト (alt)' }),
            folioId: fields.text({ label: 'Folio ID', description: '例: FOLIO 01' }),
            bodyJp: fields.text({ label: '本文日本語 (bodyJp)', multiline: true }),
            bodyEn: fields.text({ label: '本文英語 (bodyEn)', multiline: true }),
          }),
          {
            label: 'カード（最大100枚）',
            description:
              '全ブログ記事共通で表示されます。1ページ3枚でカルーセル表示し、最大100枚まで。',
          },
        ),
      },
    }),

    /** SEO / ナビゲーション: src/content/config/config.json */
    siteConfig: singleton({
      label: 'SEO / ナビゲーション設定',
      path: 'src/content/config/config',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        seo: fields.object(
          {
            title: fields.text({
              label: 'サイト既定タイトル',
              description:
                'OGP・meta の既定値。記事ごとにタイトルがない場合に使われます。',
              multiline: true,
            }),
            description: fields.text({
              label: 'サイト既定説明',
              description: 'OGP・meta description の既定値。',
              multiline: true,
            }),
            ogImage: fields.text({
              label: 'OG画像',
              description: 'SNSカード画像。例: /images/IMG_0581_DxO.webp',
            }),
          },
          { label: 'SEO（サイト全体）' },
        ),

        archive: fields.object(
          {
            title: fields.text({
              label: 'ブログ一覧 タイトル',
              multiline: true,
            }),
            description: fields.text({
              label: 'ブログ一覧 説明文',
              multiline: true,
            }),
          },
          { label: 'ブログ一覧（Archive）' },
        ),

        navLinks: fields.array(
          fields.object({
            label: fields.text({ label: 'ラベル' }),
            href: fields.text({ label: 'URL', description: '例: /about' }),
          }),
          { label: 'ヘッダーナビゲーション' },
        ),

        socialLinks: fields.array(
          fields.object({
            label: fields.text({ label: 'ラベル' }),
            url: fields.text({ label: 'URL', description: '例: https://instagram.com/...' }),
          }),
          { label: 'フッター SNSリンク' },
        ),
      },
    }),

    /** UI ラベル: src/content/labels/ui.json */
    labels: singleton({
      label: 'UI ラベル（見出し・ボタン文言）',
      path: 'src/content/labels/ui',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        article: fields.object(
          {
            categoryBadge: fields.text({ label: '記事カテゴリバッジ', description: '例: Essay' }),
            indexLabel: fields.text({ label: '目次ボタン', description: '例: = INDEX' }),
            japaneseToggle: fields.text({ label: '日本語トグル', description: '例: 日本語バージョン (Japanese Script)' }),
            japaneseDrawerTitle: fields.text({ label: '日本語原文の見出し' }),
            japaneseDrawerByline: fields.text({ label: '日本語原文の署名' }),
            japaneseEmpty: fields.text({ label: '日本語未入力時の案内', multiline: true }),
            tocTitle: fields.text({ label: '目次タイトル', description: '例: CONTENTS / 目次' }),
            tocAllArticles: fields.text({ label: '全記事の見出し', description: '例: All Articles · 全記事' }),
            tocInThisArticle: fields.text({ label: '本文内の見出し', description: '例: In This Article · 本文内' }),
            tocSectionPrefix: fields.text({ label: '本文内セクション接頭辞', description: '例: SECTION' }),
            tocNoPrefix: fields.text({ label: '目次の番号接頭辞', description: '例: NO.' }),
            tocKarutaLabel: fields.text({ label: 'カルタ目次ラベル' }),
            tocFooter: fields.text({ label: '目次フッター', description: '例: ISSN 2814-9902 • Kyoto Dispatch' }),
            prevLabel: fields.text({ label: '前の記事ラベル' }),
            nextLabel: fields.text({ label: '次の記事ラベル' }),
            figLabel: fields.text({ label: '図版ラベル', description: '例: FIG. 00 / ARCHIVE' }),
            editorialName: fields.text({ label: '編集部名', description: '例: 間 MA Editorial' }),
            editorialByline: fields.text({ label: '編集部の所属', description: '例: BiScène Kyoto' }),
            readSuffix: fields.text({ label: '読了時間の単位', description: '例: min read' }),
          },
          { label: '記事ページ' },
        ),
        archive: fields.object(
          {
            journalLabel: fields.text({ label: '一覧の小見出し', description: '例: Journal' }),
            latestEssayLabel: fields.text({ label: '最新記事ラベル', description: '例: Latest Essay' }),
            archiveHeading: fields.text({ label: 'アーカイブ見出し', description: '例: Archive' }),
            entriesSuffix: fields.text({ label: '件数の単位', description: '例: Entries' }),
          },
          { label: 'ブログ一覧' },
        ),
        portal: fields.object(
          {
            prologueLabel: fields.text({ label: 'プロローグの小見出し' }),
            featuredLabel: fields.text({ label: '注目記事ラベル' }),
            featuredVolumeLabel: fields.text({ label: '注目記事の巻表記', description: '例: Vol. I • 2025' }),
            readMoreLabel: fields.text({ label: '続きを読むボタン' }),
            openLabel: fields.text({ label: 'カードの開くラベル' }),
            anthologyLabel: fields.text({ label: 'Anthology の小見出し' }),
            anthologyHeading: fields.text({ label: 'Anthology の見出し' }),
            anthologyHint: fields.text({ label: 'Anthology の説明', multiline: true }),
            locationLabel: fields.text({ label: '所在地' }),
            estLabel: fields.text({ label: '設立表記' }),
            videSignifiant: fields.text({ label: 'ロゴ副題' }),
            skipCarousel: fields.text({ label: 'カルーセルスキップ' }),
            foliosSuffix: fields.text({ label: 'Folio 件数の単位' }),
            chapterPrefix: fields.text({ label: 'チャプター接頭辞' }),
            pageCategory: fields.text({ label: 'カードのカテゴリ' }),
            bundleEpisodeLabel: fields.text({ label: 'Bundle カードの表記', description: '例: Page • Vol. I Episode 1 Part' }),
            pageRange: fields.text({ label: 'ページ範囲' }),
          },
          { label: 'ポータル（ホーム）' },
        ),
        karuta: fields.object(
          {
            cardFolioLabel: fields.text({ label: 'カルタの小見出し', description: '例: Card Folio • 空間語彙のカルタ' }),
            heading: fields.text({ label: 'カルタ見出し' }),
            hint: fields.text({ label: 'カルタの説明（英語）', multiline: true }),
            hintJp: fields.text({ label: 'カルタの説明（日本語）', multiline: true }),
          },
          { label: 'カルタ' },
        ),
        footer: fields.object(
          {
            journalSectionsLabel: fields.text({ label: 'フッター見出し' }),
            backToMainLabel: fields.text({ label: 'メインページへ' }),
            aboutContactLabel: fields.text({ label: 'About & Contact' }),
            privacyLabel: fields.text({ label: 'プライバシー' }),
            locationLabel: fields.text({ label: '所在地' }),
          },
          { label: 'フッター' },
        ),
        contact: fields.object(
          {
            heading: fields.text({ label: 'お問い合わせ見出し' }),
            nameLabel: fields.text({ label: '名前ラベル' }),
            emailLabel: fields.text({ label: 'メールラベル' }),
            messageLabel: fields.text({ label: 'メッセージラベル' }),
            quizLabel: fields.text({ label: 'クイズラベル' }),
            quizQuestion: fields.text({ label: 'クイズの質問文', description: '例: Which city is selected?' }),
            quizHint: fields.text({ label: 'クイズの説明', multiline: true }),
            sendLabel: fields.text({ label: '送信ボタン' }),
          },
          { label: 'お問い合わせフォーム' },
        ),
      },
    }),

  },

  // 管理画面のサイドバー整理
  ui: {
    brand: { name: '間 MA — BiScène Kyoto' },
    navigation: {
      '記事': ['blog'],
      'ページ': ['home', 'about'],
      'Folio': ['folio'],
      'Karuta': ['karuta'],
      '用語集': ['glossary'],
      'サイト共通': ['site', 'siteConfig'],
      'UI ラベル': ['labels'],
    },
  },
});
