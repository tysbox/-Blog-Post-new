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
 * フロントマター/JSON構造は `src/content.config.ts` のZodスキーマと
 * `scripts/convert-tina-json-to-mdx.mjs` の `buildFrontmatter()` と一致させている。
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

// --- ヒーロー画像群 (ページ / フロントページ共通) ---
// 画像パス(テキスト)として保持する。
// fields.image をネストした状態で使うと Save 時に値が黙って消えるため、
// 安全策として text を使う。値は public/images 内の /images/... 形式。
const imageField = (label: string) =>
	fields.text({
		label,
		description: '例: /images/IMG_0581_DxO.webp',
		multiline: false,
	});

const heroFields = {
	image1: imageField('画像1'),
	image2: imageField('画像2'),
	image3: imageField('画像3'),
	image4: imageField('画像4'),
	image5: imageField('画像5'),
	title: fields.text({ label: 'メイン見出し', multiline: true }),
	subtitle: fields.text({ label: 'サブタイトル', multiline: true }),
};

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
        slug: fields.slug({ name: { label: 'スラッグ (Slug)' } }),

        // Display title, independent of the slug, freely editable.
        title: fields.text({
          label: 'タイトル (Title)',
          multiline: true,
        }),

        description: fields.text({
          label: '概要 (Description)',
          multiline: true,
        }),

        pubDate: fields.date({
          label: '公開日 (Date Posted)',
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
        title: fields.text({ label: 'ページタイトル' }),

        hero: fields.object(
          {
            ...heroFields,
            slides: fields.array(
              fields.object({
                image: fields.text({ label: '画像', description: '例: /images/IMG_0581_DxO.webp' }),
                title: fields.text({ label: 'タイトル' }),
                subtitle: fields.text({ label: 'サブタイトル', multiline: true }),
                leftTitle: fields.text({ label: '左タイトル' }),
                rightTitle: fields.text({ label: '右タイトル' }),
              }),
              { label: 'カルーセル (slides)' },
            ),
          },
          { label: 'ヒーロー / カルーセル' },
        ),

        introTitle: fields.text({ label: '導入見出し', multiline: true }),
        introText: fields.text({ label: '導入本文', multiline: true }),

        featuredItems: fields.array(
          fields.object({
            item: fields.text({
              label: '記事パス',
              description:
                '例: src/content/blog/from-kyoto-to-the-world.mdx （記事のファイルパスを指定）',
            }),
          }),
          { label: '注目記事 (手動指定)' },
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

        // Tina 由来の識別子。JSON 構造を保つため保持する（通常は変更不要）。
        _template: fields.text({ label: 'テンプレート (_template)' }),
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

        navLinks: fields.array(
          fields.object({
            label: fields.text({ label: 'ラベル', validation: { isRequired: true } }),
            href: fields.text({ label: 'URL', validation: { isRequired: true } }),
          }),
          { label: 'ナビゲーションリンク' },
        ),

        lpLogo: fields.text({ label: 'LPロゴ画像', description: '例: /images/IMG_0581_DxO.webp' }),
        lpUrl: fields.text({ label: 'LPリンク先URL' }),

        socialLinks: fields.array(
          fields.object({
            platform: fields.text({ label: 'プラットフォーム名' }),
            href: fields.text({ label: 'URL' }),
          }),
          { label: 'ソーシャルリンク' },
        ),

        footerText: fields.text({ label: 'フッター文言', multiline: true }),

        // Tina 由来の識別子。JSON 構造を保つため保持する（通常は変更不要）。
        _template: fields.text({ label: 'テンプレート (_template)' }),
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
            title: fields.text({ label: 'SEOタイトル', multiline: true }),
            description: fields.text({ label: 'SEO説明', multiline: true }),
            siteOwner: fields.text({ label: 'サイト運営者' }),
          },
          { label: 'SEO' },
        ),

        nav: fields.array(
          fields.object({
            title: fields.text({ label: 'タイトル' }),
            link: fields.text({ label: 'URL' }),
          }),
          { label: 'ナビゲーション' },
        ),

        contactLinks: fields.array(
          fields.object({
            title: fields.text({ label: 'タイトル' }),
            link: fields.text({ label: 'URL' }),
            icon: fields.text({ label: 'アイコン名' }),
          }),
          { label: '連絡先リンク' },
        ),
      },
    }),

    /** ヘッダー/フッターの補助設定: src/content/settings/site.json */
    settings: singleton({
      label: 'ヘッダー / フッター補助設定',
      path: 'src/content/settings/site',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        header: fields.object(
          {
            logo: fields.text({ label: 'ロゴ文言' }),
            logoImage: fields.text({ label: 'ロゴ画像', description: '例: /images/IMG_0581_DxO.webp' }),
            links: fields.array(
              fields.object({
                label: fields.text({ label: 'ラベル' }),
                url: fields.text({ label: 'URL' }),
              }),
              { label: 'リンク' },
            ),
          },
          { label: 'ヘッダー' },
        ),

        footer: fields.object(
          {
            logo: fields.text({ label: 'ロゴ文言' }),
            logoImage: fields.text({ label: 'ロゴ画像', description: '例: /images/IMG_0581_DxO.webp' }),
            links: fields.array(
              fields.object({
                label: fields.text({ label: 'ラベル' }),
                url: fields.text({ label: 'URL' }),
              }),
              { label: 'リンク' },
            ),
            copyright: fields.text({ label: '著作権表記', multiline: true }),
          },
          { label: 'フッター' },
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
      'サイト共通': ['site', 'siteConfig', 'settings'],
    },
  },
});
